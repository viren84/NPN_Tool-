import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/db/audit";
import { generateCoverLetter } from "@/lib/documents/cover-letter";
import { generateEnglishLabel, translateLabelToFrench } from "@/lib/documents/label-generator";
import { generateSafetyReport, generateEfficacyReport } from "@/lib/documents/safety-efficacy";
import { askClaude } from "@/lib/ai/claude";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { documentType } = await req.json();

  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      medicinalIngredients: true,
      nonMedicinalIngredients: true,
    },
  });

  if (!application) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const company = await prisma.companyProfile.findFirst();
  if (!company) return NextResponse.json({ error: "Company profile not set up" }, { status: 400 });

  // Create or update document record
  let docRecord = await prisma.generatedDocument.findFirst({
    where: { applicationId: id, documentType },
  });
  if (!docRecord) {
    docRecord = await prisma.generatedDocument.create({
      data: { applicationId: id, documentType, status: "generating" },
    });
  } else {
    await prisma.generatedDocument.update({
      where: { id: docRecord.id },
      data: { status: "generating" },
    });
  }

  try {
    let content = "";
    // Get claims from claims table first, fall back to product concept
    const dbClaims = await prisma.claim.findMany({
      where: { applicationId: id, selected: true },
      orderBy: { sortOrder: "asc" },
    });
    const claims = dbClaims.length > 0
      ? dbClaims.map(c => c.claimTextEn)
      : extractClaims(application.productConcept);

    switch (documentType) {
      case "cover_letter":
        content = await generateCoverLetter({
          companyName: company.legalName,
          dbaName: company.dbaName,
          companyCode: company.companyCode,
          seniorOfficial: company.seniorOfficial,
          seniorTitle: company.seniorTitle,
          address: company.address,
          city: company.city,
          province: company.province,
          postalCode: company.postalCode,
          email: company.email,
          phone: company.phone,
          productName: application.productName,
          applicationClass: application.applicationClass,
          ingredientSummary: application.medicinalIngredients.map((i) => `${i.properName} ${i.quantity}${i.quantityUnit}`).join(", "),
          claimsSummary: claims.join("; "),
        });
        break;

      case "label_en":
        content = await generateEnglishLabel({
          productName: application.productName,
          brandName: application.brandName,
          dosageForm: application.dosageForm,
          routeOfAdmin: application.routeOfAdmin,
          medicinalIngredients: application.medicinalIngredients.map((i) => ({
            properName: i.properName,
            commonName: i.commonName,
            quantity: i.quantity,
            quantityUnit: i.quantityUnit,
          })),
          nonMedicinalIngredients: application.nonMedicinalIngredients.map((i) => ({
            ingredientName: i.ingredientName,
            purpose: i.purpose,
          })),
          claims,
          dosageInstructions: "",
          warnings: [],
          companyName: `${company.legalName} (${company.dbaName})`,
          companyAddress: `${company.address}, ${company.city}, ${company.province} ${company.postalCode}`,
        });
        break;

      case "label_fr": {
        const enDoc = await prisma.generatedDocument.findFirst({
          where: { applicationId: id, documentType: "label_en" },
        });
        if (!enDoc?.content) {
          return NextResponse.json({ error: "Generate English label first" }, { status: 400 });
        }
        content = await translateLabelToFrench(enDoc.content);
        break;
      }

      case "safety_report":
        content = await generateSafetyReport({
          productName: application.productName,
          applicationClass: application.applicationClass,
          ingredients: application.medicinalIngredients.map((i) => ({
            properName: i.properName,
            commonName: i.commonName,
            scientificName: i.scientificName,
            quantity: i.quantity,
            quantityUnit: i.quantityUnit,
            monographName: i.monographName,
            monographCompliant: i.monographCompliant,
          })),
          claims,
        });
        break;

      case "efficacy_report":
        content = await generateEfficacyReport({
          productName: application.productName,
          applicationClass: application.applicationClass,
          ingredients: application.medicinalIngredients.map((i) => ({
            properName: i.properName,
            commonName: i.commonName,
            scientificName: i.scientificName,
            quantity: i.quantity,
            quantityUnit: i.quantityUnit,
            monographName: i.monographName,
            monographCompliant: i.monographCompliant,
          })),
          claims,
        });
        break;

      case "senior_attestation":
        content = generateSeniorAttestation(company, application);
        break;

      case "monograph_attestation":
        content = generateMonographAttestation(company, application);
        break;

      case "ingredient_specs":
        content = await generateIngredientSpecs(application);
        break;

      default:
        content = await askClaude(
          "You are a Health Canada NHP regulatory document expert.",
          `Generate a ${documentType.replace(/_/g, " ")} document for product "${application.productName}" (Class ${application.applicationClass}). Return in clean HTML format.`,
          { maxTokens: 3000 }
        );
    }

    await prisma.generatedDocument.update({
      where: { id: docRecord.id },
      data: { content, status: "draft" },
    });

    await logAudit(user.id, "created", "document", id, `AI generated ${documentType} for "${application.productName}"`);

    return NextResponse.json({ success: true, documentType });
  } catch (error) {
    if (docRecord) {
      await prisma.generatedDocument.update({
        where: { id: docRecord.id },
        data: { status: "pending" },
      }).catch(() => {});
    }
    const message = error instanceof Error ? error.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function extractClaims(productConcept: string): string[] {
  const claimsMatch = productConcept.match(/Confirmed claims:\n([\s\S]*?)$/);
  if (claimsMatch) return claimsMatch[1].split("\n").filter(Boolean);
  return [];
}

function generateSeniorAttestation(
  company: { legalName: string; companyCode: string; seniorOfficial: string; seniorTitle: string; address: string; city: string; province: string; postalCode: string },
  application: { productName: string; applicationClass: string }
): string {
  return `<div style="font-family: Arial, sans-serif; max-width: 700px; padding: 40px;">
<h2 style="text-align: center;">Senior Official Attestation</h2>
<p>I, <strong>${company.seniorOfficial}</strong>, ${company.seniorTitle} of <strong>${company.legalName}</strong> (Company Code: ${company.companyCode}), hereby attest that:</p>
<ol>
<li>All information contained in this Product Licence Application for <strong>${application.productName}</strong> (Class ${application.applicationClass}) is accurate and complete to the best of my knowledge.</li>
<li>The product complies with the Natural Health Products Regulations (NHPR) and all applicable provisions of the Food and Drugs Act.</li>
<li>The manufacturing, packaging, labelling, and importing of this product will comply with Good Manufacturing Practices (GMP) as outlined in the NHPR.</li>
<li>I accept responsibility for the accuracy of this submission and the safety of the product described herein.</li>
</ol>
<br/>
<table style="width: 100%; margin-top: 40px;">
<tr><td style="border-top: 1px solid #000; width: 300px; padding-top: 5px;">Signature</td><td></td><td style="border-top: 1px solid #000; width: 200px; padding-top: 5px;">Date</td></tr>
<tr><td style="padding-top: 20px;"><strong>${company.seniorOfficial}</strong><br/>${company.seniorTitle}<br/>${company.legalName}<br/>${company.address}, ${company.city}, ${company.province} ${company.postalCode}</td><td></td><td></td></tr>
</table>
</div>`;
}

function generateMonographAttestation(
  company: { legalName: string; companyCode: string; seniorOfficial: string; seniorTitle: string },
  application: { productName: string; medicinalIngredients: Array<{ properName: string; monographName: string; quantity: number; quantityUnit: string; monographCompliant: boolean }> }
): string {
  const monographs = [...new Set(application.medicinalIngredients.map((i) => i.monographName).filter(Boolean))];

  return `<div style="font-family: Arial, sans-serif; max-width: 700px; padding: 40px;">
<h2 style="text-align: center;">Monograph Attestation Form</h2>
<p><strong>Company:</strong> ${company.legalName} (Code: ${company.companyCode})</p>
<p><strong>Product:</strong> ${application.productName}</p>
<p>I, <strong>${company.seniorOfficial}</strong>, ${company.seniorTitle}, hereby attest that the above-named product meets ALL parameters of the following NNHPD monograph(s):</p>
<ul>${monographs.map((m) => `<li><strong>${m}</strong></li>`).join("")}</ul>
<p>Specifically, I attest that:</p>
<ol>
<li>All medicinal ingredients are within the dose ranges specified in the referenced monograph(s)</li>
<li>The recommended use/claim wording matches the monograph exactly</li>
<li>All risk information (cautions, warnings, contraindications) from the monograph is included on the product label</li>
<li>The product meets all quality specifications referenced in the monograph</li>
</ol>
<h4>Ingredient Compliance Summary:</h4>
<table style="width: 100%; border-collapse: collapse; font-size: 14px;">
<tr style="background: #f0f0f0;"><th style="border: 1px solid #ccc; padding: 6px; text-align: left;">Ingredient</th><th style="border: 1px solid #ccc; padding: 6px;">Dose</th><th style="border: 1px solid #ccc; padding: 6px;">Monograph</th><th style="border: 1px solid #ccc; padding: 6px;">Compliant</th></tr>
${application.medicinalIngredients.map((i) => `<tr><td style="border: 1px solid #ccc; padding: 6px;">${i.properName}</td><td style="border: 1px solid #ccc; padding: 6px; text-align: center;">${i.quantity} ${i.quantityUnit}</td><td style="border: 1px solid #ccc; padding: 6px;">${i.monographName || "—"}</td><td style="border: 1px solid #ccc; padding: 6px; text-align: center;">${i.monographCompliant ? "Yes" : "No"}</td></tr>`).join("")}
</table>
<br/>
<table style="width: 100%; margin-top: 40px;">
<tr><td style="border-top: 1px solid #000; width: 300px; padding-top: 5px;">Signature</td><td></td><td style="border-top: 1px solid #000; width: 200px; padding-top: 5px;">Date</td></tr>
</table>
</div>`;
}

async function generateIngredientSpecs(
  application: { productName: string; medicinalIngredients: Array<{ properName: string; commonName: string; scientificName: string; quantity: number; quantityUnit: string; monographName: string }> }
): Promise<string> {
  const ingList = application.medicinalIngredients
    .map((i) => `${i.properName} (${i.scientificName}): ${i.quantity} ${i.quantityUnit}, Monograph: ${i.monographName || "None"}`)
    .join("\n");

  return askClaude(
    "You are an NHP quality specifications expert.",
    `Generate Medicinal Ingredient Specifications for product "${application.productName}".

Ingredients:
${ingList}

For each ingredient, provide an HTML table with:
- Proper Name, Common Name, Scientific Name
- Source Material
- Potency / Strength per dosage unit
- Identity Test Method
- Purity specifications
- Heavy Metals limits (As <0.5ppm, Cd <0.3ppm, Hg <0.2ppm, Pb <1.0ppm)
- Microbial limits (TPC <10,000 CFU/g, Yeast/Mold <1,000 CFU/g, E.coli absent, Salmonella absent)
- Any monograph-specific specifications

Return clean HTML format.`,
    { maxTokens: 4000 }
  );
}
