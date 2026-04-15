import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireEditor, isErrorResponse } from "@/lib/auth/guard";
import { logAudit } from "@/lib/db/audit";
import { handlePrismaError } from "@/lib/errors/handle-prisma";
import { extractTextFromPDF } from "@/lib/documents/pdf-reader";
import { extractApplicationData } from "@/lib/ai/application-extractor";
import * as fs from "fs";
import * as path from "path";

/**
 * POST /api/applications/import-research
 * Upload a research PDF → AI extracts all application data → creates application.
 * Returns the extracted data + created application ID.
 * All extracted fields are tagged dataSource="imported".
 * AI-suggested fields (class reasoning, monograph matching) tagged "ai_researched".
 */
export async function POST(req: NextRequest) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "PDF file is required" }, { status: 400 });
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Max 50MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Extract text from PDF
    const text = await extractTextFromPDF(buffer);
    if (!text || text.trim().length < 50) {
      return NextResponse.json(
        { error: "Could not extract text from PDF. The file may be image-based or empty." },
        { status: 400 },
      );
    }

    // AI extraction
    const extracted = await extractApplicationData(text, file.name);

    if (!extracted.productName) {
      return NextResponse.json(
        { error: "Could not determine a product name from the document. Please check the file content." },
        { status: 400 },
      );
    }

    // Build data sources map
    const dataSources: Record<string, string> = {};
    const tagImported = (p: string) => { dataSources[p] = "imported"; };
    const tagAI = (p: string) => { dataSources[p] = "ai_researched"; };

    if (extracted.productName) tagImported("productName");
    if (extracted.brandName) tagImported("brandName");
    if (extracted.dosageForm) tagImported("dosageForm");
    if (extracted.routeOfAdmin) tagImported("routeOfAdmin");
    if (extracted.productConcept) tagImported("productConcept");
    // Class and reasoning are AI-derived even from imported docs
    if (extracted.applicationClass) tagAI("applicationClass");
    if (extracted.classReasoning) tagAI("classReasoning");

    // Save the uploaded file
    const uploadDir = path.join(process.cwd(), "data", "attachments", "research-imports");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = path.join(uploadDir, `${Date.now()}_${safeName}`);
    fs.writeFileSync(filePath, buffer);

    // Create application with extracted data
    const app = await prisma.application.create({
      data: {
        productName: extracted.productName,
        brandName: extracted.brandName || "",
        applicationClass: extracted.applicationClass || "I",
        dosageForm: extracted.dosageForm || "",
        routeOfAdmin: extracted.routeOfAdmin || "Oral",
        productConcept: extracted.productConcept || "",
        classReasoning: extracted.classReasoning || "",
        dataSourcesJson: JSON.stringify(dataSources),
        sourceDocumentName: file.name,
        sourceDocumentPath: filePath,
        createdById: user.id,
      },
    });

    // Create medicinal ingredients
    for (let i = 0; i < (extracted.medicinalIngredients || []).length; i++) {
      const mi = extracted.medicinalIngredients[i];
      tagImported(`ingredients[${i}].name`);
      await prisma.medicinalIngredient.create({
        data: {
          applicationId: app.id,
          sortOrder: i,
          nhpidName: mi.nhpidName || "",
          properName: mi.properName || "",
          commonName: mi.commonName || "",
          scientificName: mi.scientificName || "",
          quantity: mi.quantity || 0,
          quantityUnit: mi.quantityUnit || "mg",
          sourceMaterial: mi.sourceMaterial || "",
          standardization: mi.standardization || "",
          monographName: mi.monographName || "",
        },
      });
    }

    // Create non-medicinal ingredients
    for (let i = 0; i < (extracted.nonMedicinalIngredients || []).length; i++) {
      const nmi = extracted.nonMedicinalIngredients[i];
      tagImported(`nonMedIngredients[${i}].name`);
      await prisma.nonMedicinalIngredient.create({
        data: {
          applicationId: app.id,
          sortOrder: i,
          ingredientName: nmi.ingredientName || "",
          purpose: nmi.purpose || "",
        },
      });
    }

    // Create claims
    for (let i = 0; i < (extracted.claims || []).length; i++) {
      const c = extracted.claims[i];
      tagImported(`claims[${i}].claimTextEn`);
      await prisma.claim.create({
        data: {
          applicationId: app.id,
          sortOrder: i,
          claimTextEn: c.claimTextEn || "",
          claimTextFr: c.claimTextFr || "",
          fromMonograph: c.fromMonograph || false,
          monographName: c.monographName || "",
        },
      });
    }

    // Create dosage groups
    for (let i = 0; i < (extracted.dosageGroups || []).length; i++) {
      const d = extracted.dosageGroups[i];
      tagImported(`dosage[${i}].population`);
      await prisma.dosageGroup.create({
        data: {
          applicationId: app.id,
          sortOrder: i,
          population: d.population || "Adults",
          minDose: d.minDose || null,
          maxDose: d.maxDose || null,
          doseUnit: d.doseUnit || "",
          frequency: d.frequency || "",
          directions: d.directions || "",
        },
      });
    }

    // Create risk infos
    for (let i = 0; i < (extracted.riskInfos || []).length; i++) {
      const r = extracted.riskInfos[i];
      tagImported(`risks[${i}].textEn`);
      await prisma.riskInfo.create({
        data: {
          applicationId: app.id,
          sortOrder: i,
          riskType: r.riskType || "caution",
          textEn: r.textEn || "",
          textFr: r.textFr || "",
          fromMonograph: r.fromMonograph || false,
        },
      });
    }

    // Final update with all data sources
    await prisma.application.update({
      where: { id: app.id },
      data: { dataSourcesJson: JSON.stringify(dataSources) },
    });

    await logAudit(
      user.id,
      "imported",
      "application",
      app.id,
      `${user.name} created application "${extracted.productName}" from research PDF "${file.name}" (${(extracted.medicinalIngredients || []).length} ingredients, ${(extracted.claims || []).length} claims extracted)`,
    );

    return NextResponse.json({
      id: app.id,
      productName: extracted.productName,
      importedFrom: file.name,
      extracted: {
        ingredientCount: (extracted.medicinalIngredients || []).length,
        claimCount: (extracted.claims || []).length,
        dosageGroupCount: (extracted.dosageGroups || []).length,
        riskCount: (extracted.riskInfos || []).length,
        confidence: extracted.confidence,
        warnings: extracted.warnings,
      },
      dataSources,
    }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && (err.message.includes("extract") || err.message.includes("AI") || err.message.includes("Claude"))) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return handlePrismaError(err, "import research PDF");
  }
}
