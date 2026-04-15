import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireEditor, isErrorResponse } from "@/lib/auth/guard";
import { logAudit } from "@/lib/db/audit";
import { handlePrismaError } from "@/lib/errors/handle-prisma";
import * as XLSX from "xlsx";

function cellStr(sheet: XLSX.WorkSheet, row: number, col: number): string {
  const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
  return cell ? String(cell.v ?? "").trim() : "";
}

/**
 * POST /api/applications/import-preset
 * Import a preset Excel file to create a full application with all sections.
 * Accepts multipart/form-data with a single .xlsx file.
 */
export async function POST(req: NextRequest) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Excel file is required" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: "buffer" });

    // Parse Product Info sheet
    const prodSheet = wb.Sheets["Product Info"];
    if (!prodSheet) {
      return NextResponse.json({ error: "Missing 'Product Info' sheet in Excel file" }, { status: 400 });
    }

    // Product Info is key-value: col 0 = field name, col 1 = value
    const getField = (fieldPrefix: string): string => {
      const range = XLSX.utils.decode_range(prodSheet["!ref"] || "A1:C1");
      for (let r = range.s.r; r <= range.e.r; r++) {
        const label = cellStr(prodSheet, r, 0).toLowerCase().replace(/[*\s]/g, "");
        if (label.startsWith(fieldPrefix.toLowerCase().replace(/[_\s]/g, ""))) {
          return cellStr(prodSheet, r, 1);
        }
      }
      return "";
    };

    const productName = getField("product_name") || getField("productname");
    if (!productName) {
      return NextResponse.json({ error: "Product name is required in the 'Product Info' sheet" }, { status: 400 });
    }

    // Create application
    const dataSources: Record<string, string> = {};
    const tag = (path: string) => { dataSources[path] = "imported"; };

    tag("productName");
    const appClass = getField("application_class") || getField("applicationclass") || "I";
    if (appClass) tag("applicationClass");
    const dosageForm = getField("dosage_form") || getField("dosageform");
    if (dosageForm) tag("dosageForm");
    const routeOfAdmin = getField("route_of_admin") || getField("routeofadmin") || "Oral";
    if (routeOfAdmin) tag("routeOfAdmin");
    const productConcept = getField("product_concept") || getField("productconcept");
    if (productConcept) tag("productConcept");

    const app = await prisma.application.create({
      data: {
        productName,
        brandName: getField("brand_name") || getField("brandname") || "",
        applicationClass: appClass,
        applicationType: getField("application_type") || getField("applicationtype") || "Compendial",
        dosageForm,
        routeOfAdmin,
        productConcept,
        durationOfUse: getField("duration_of_use") || "",
        animalTissue: getField("animal_tissue")?.toLowerCase() === "yes",
        sterile: getField("sterile")?.toLowerCase() === "yes",
        dataSourcesJson: JSON.stringify(dataSources),
        sourceDocumentName: file.name,
        createdById: user.id,
      },
    });

    // Parse Medicinal Ingredients sheet
    const miSheet = wb.Sheets["Medicinal Ingredients"];
    if (miSheet) {
      const miData = XLSX.utils.sheet_to_json<Record<string, unknown>>(miSheet, { defval: "" });
      for (let i = 0; i < miData.length; i++) {
        const row = miData[i];
        const name = String(row["nhpid_name"] || row["proper_name"] || row["common_name"] || "").trim();
        if (!name) continue;
        tag(`ingredients[${i}].name`);
        await prisma.medicinalIngredient.create({
          data: {
            applicationId: app.id,
            sortOrder: i,
            nhpidName: String(row["nhpid_name"] || "").trim(),
            properName: String(row["proper_name"] || "").trim(),
            commonName: String(row["common_name"] || "").trim(),
            scientificName: String(row["scientific_name"] || "").trim(),
            quantity: parseFloat(String(row["quantity"] || "0")) || 0,
            quantityUnit: String(row["unit"] || "mg").trim(),
            potency: parseFloat(String(row["potency"] || "")) || null,
            potencyUnit: String(row["potency_unit"] || "").trim(),
            sourceMaterial: String(row["source_material"] || "").trim(),
            standardization: String(row["standardization"] || "").trim(),
            extractType: String(row["extract_type"] || "").trim(),
            extractSolvent: String(row["extract_solvent"] || "").trim(),
            extractRatio: String(row["extract_ratio"] || "").trim(),
            monographName: String(row["monograph_name"] || "").trim(),
            supplierName: String(row["supplier_name"] || "").trim(),
          },
        });
      }
    }

    // Parse Non-Medicinal Ingredients sheet
    const nmiSheet = wb.Sheets["Non-Medicinal"];
    if (nmiSheet) {
      const nmiData = XLSX.utils.sheet_to_json<Record<string, unknown>>(nmiSheet, { defval: "" });
      for (let i = 0; i < nmiData.length; i++) {
        const row = nmiData[i];
        const name = String(row["ingredient_name"] || row["ingredient_name *"] || "").trim();
        if (!name) continue;
        tag(`nonMedIngredients[${i}].name`);
        await prisma.nonMedicinalIngredient.create({
          data: {
            applicationId: app.id,
            sortOrder: i,
            ingredientName: name,
            purpose: String(row["purpose"] || "").trim(),
            quantity: parseFloat(String(row["quantity"] || "")) || null,
            unit: String(row["unit"] || "").trim(),
          },
        });
      }
    }

    // Parse Claims sheet
    const claimSheet = wb.Sheets["Claims"];
    if (claimSheet) {
      const claimData = XLSX.utils.sheet_to_json<Record<string, unknown>>(claimSheet, { defval: "" });
      for (let i = 0; i < claimData.length; i++) {
        const row = claimData[i];
        const text = String(row["claim_text_en"] || row["claim_text_en *"] || "").trim();
        if (!text) continue;
        tag(`claims[${i}].claimTextEn`);
        await prisma.claim.create({
          data: {
            applicationId: app.id,
            sortOrder: i,
            claimTextEn: text,
            claimTextFr: String(row["claim_text_fr"] || "").trim(),
            fromMonograph: String(row["from_monograph"] || "").toLowerCase() === "yes",
            monographName: String(row["monograph_name"] || "").trim(),
            claimType: String(row["claim_type"] || "health").trim(),
          },
        });
      }
    }

    // Parse Dosage sheet
    const doseSheet = wb.Sheets["Dosage"];
    if (doseSheet) {
      const doseData = XLSX.utils.sheet_to_json<Record<string, unknown>>(doseSheet, { defval: "" });
      for (let i = 0; i < doseData.length; i++) {
        const row = doseData[i];
        const pop = String(row["population"] || row["population *"] || "").trim();
        if (!pop) continue;
        tag(`dosage[${i}].population`);
        await prisma.dosageGroup.create({
          data: {
            applicationId: app.id,
            sortOrder: i,
            population: pop,
            ageRangeMin: parseInt(String(row["age_min"] || "")) || null,
            ageRangeMax: parseInt(String(row["age_max"] || "")) || null,
            minDose: parseFloat(String(row["min_dose"] || "")) || null,
            maxDose: parseFloat(String(row["max_dose"] || "")) || null,
            doseUnit: String(row["dose_unit"] || "").trim(),
            frequency: String(row["frequency"] || "").trim(),
            directions: String(row["directions"] || "").trim(),
            withFood: String(row["with_food"] || "").toLowerCase() === "yes",
          },
        });
      }
    }

    // Parse Risk Info sheet
    const riskSheet = wb.Sheets["Risk Info"];
    if (riskSheet) {
      const riskData = XLSX.utils.sheet_to_json<Record<string, unknown>>(riskSheet, { defval: "" });
      for (let i = 0; i < riskData.length; i++) {
        const row = riskData[i];
        const riskType = String(row["risk_type"] || row["risk_type *"] || "").trim();
        const textEn = String(row["text_en"] || row["text_en *"] || "").trim();
        if (!riskType || !textEn) continue;
        tag(`risks[${i}].textEn`);
        await prisma.riskInfo.create({
          data: {
            applicationId: app.id,
            sortOrder: i,
            riskType,
            textEn,
            textFr: String(row["text_fr"] || "").trim(),
            fromMonograph: String(row["from_monograph"] || "").toLowerCase() === "yes",
            monographName: String(row["monograph_name"] || "").trim(),
          },
        });
      }
    }

    // Update data sources after all imports
    await prisma.application.update({
      where: { id: app.id },
      data: { dataSourcesJson: JSON.stringify(dataSources) },
    });

    await logAudit(
      user.id,
      "imported",
      "application",
      app.id,
      `${user.name} imported application "${productName}" from preset Excel "${file.name}"`,
    );

    return NextResponse.json({ id: app.id, productName, importedFrom: file.name }, { status: 201 });
  } catch (err) {
    return handlePrismaError(err, "import preset");
  }
}
