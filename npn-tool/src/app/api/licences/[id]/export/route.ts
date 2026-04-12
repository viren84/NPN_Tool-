import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, isErrorResponse } from "@/lib/auth/guard";
import { trackActivity } from "@/lib/tracking/activity";
import { logAudit } from "@/lib/db/audit";
import fs from "fs/promises";

// GET — export a single licence's full data (JSON or CSV)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  if (isErrorResponse(user)) return user;

  const { id } = await params;
  const format = req.nextUrl.searchParams.get("format") || "json";
  const purpose = req.nextUrl.searchParams.get("purpose") || "manual_export";

  const licence = await prisma.productLicence.findUnique({
    where: { id },
    include: { amendments: true },
  });

  if (!licence) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ings = jp(licence.medicinalIngredientsJson);
  const nonMed = jp(licence.nonMedIngredientsJson);
  const claims = jp(licence.claimsJson);
  const risks = jp(licence.risksJson);
  const doses = jp(licence.dosesJson);

  // LOG
  await logAudit(user.id, "exported", "licence", id,
    `${user.name} exported NPN ${licence.licenceNumber} (${licence.productName}) as ${format} for ${purpose}`);

  trackActivity(user.id, "export", {
    entityType: "licence", entityId: id,
    entityName: `NPN ${licence.licenceNumber} — ${licence.productName}`,
    details: `Format: ${format}, Purpose: ${purpose}`,
    ipAddress: req.headers.get("x-forwarded-for") || "",
    userAgent: req.headers.get("user-agent") || "",
  });

  // JSON export
  if (format !== "csv") {
    return NextResponse.json({
      npn: licence.licenceNumber, productName: licence.productName, productNameFr: licence.productNameFr,
      dosageForm: licence.dosageForm, routeOfAdmin: licence.routeOfAdmin,
      applicationClass: licence.applicationClass, submissionType: licence.submissionType,
      companyName: licence.companyName, companyCode: licence.companyCode,
      status: licence.productStatus, licenceDate: licence.licenceDate, revisedDate: licence.revisedDate,
      attestedMonograph: licence.attestedMonograph,
      medicinalIngredients: ings, nonMedicinalIngredients: nonMed,
      claims, risks, doses, routes: jp(licence.routesJson),
      amendments: licence.amendments.map(a => ({
        type: a.amendmentType, change: a.changeType, description: a.description,
        status: a.status, submissionDate: a.submissionDate, approvalDate: a.approvalDate,
      })),
    });
  }

  // ========== CSV EXPORT — full 55 columns same as bulk ==========

  const MAX_INGS = 10, MAX_CLAIMS = 5, MAX_RISKS = 3, MAX_FILES = 4;

  // Get source files
  let sourceFiles: string[] = [];
  if (licence.licencePdfPath) {
    try { sourceFiles = (await fs.readdir(licence.licencePdfPath)).filter(e => !e.startsWith(".")); } catch {}
  }

  // Get attachments
  const attachments = await prisma.attachment.findMany({
    where: { entityType: "licence", entityId: licence.id },
    select: { fileName: true },
  });

  // Build headers
  const headers: string[] = [
    "NPN", "Product Name", "Product Name (FR)", "Dosage Form", "Route of Admin",
    "Application Class", "Submission Type", "Product Status",
    "Company Name", "Company Code", "Licence Date", "Revised Date", "Monograph Attested", "LNHPD ID",
  ];
  for (let i = 1; i <= MAX_INGS; i++) headers.push(`Ingredient ${i} Name`, `Ingredient ${i} Qty`);
  headers.push("Non-Medicinal Ingredients");
  for (let i = 1; i <= MAX_CLAIMS; i++) headers.push(`Claim ${i}`);
  headers.push("Dosage Population", "Dosage Amount", "Dosage Frequency", "Dosage Directions");
  for (let i = 1; i <= MAX_RISKS; i++) headers.push(`Risk ${i}`);
  for (let i = 1; i <= MAX_FILES; i++) headers.push(`Source File ${i}`);
  headers.push("Attached Documents", "PDF Folder Path", "Import Source", "Notes");

  // Build row
  const row: string[] = [
    licence.licenceNumber, licence.productName, licence.productNameFr, licence.dosageForm, licence.routeOfAdmin,
    licence.applicationClass, licence.submissionType, licence.productStatus,
    licence.companyName, licence.companyCode, licence.licenceDate, licence.revisedDate,
    licence.attestedMonograph ? "Yes" : "No", licence.lnhpdId || "",
  ];

  // Ingredients
  for (let i = 0; i < MAX_INGS; i++) {
    if (i < ings.length) {
      const ing = ings[i] as Record<string, unknown>;
      row.push(
        String(ing.ingredient_name || ing.name || ing.properName || "").trim(),
        `${ing.quantity || ing.potency_amount || ""} ${ing.potency_unit || ing.uom_type_desc || ""}`.trim()
      );
    } else { row.push("", ""); }
  }

  // Non-med
  row.push(nonMed.map((n: unknown) => String((n as Record<string, unknown>).ingredient_name || (n as Record<string, unknown>).name || "").trim()).filter(Boolean).join("; "));

  // Claims
  for (let i = 0; i < MAX_CLAIMS; i++) {
    if (i < claims.length) {
      const c = claims[i] as Record<string, unknown>;
      row.push(String(c.purpose || c.text || c.claimTextEn || c).trim());
    } else { row.push(""); }
  }

  // Dosage
  if (doses.length > 0) {
    const d = doses[0] as Record<string, unknown>;
    row.push(
      String(d.population_type_desc || d.population || ""),
      `${d.quantity_dose || d.dose || ""} ${d.uom_type_desc_quantity_dose || ""}`.trim(),
      `${d.frequency || ""} ${d.uom_type_desc_frequency || ""}`.trim(),
      String(d.directions || ""),
    );
  } else { row.push("", "", "", ""); }

  // Risks
  for (let i = 0; i < MAX_RISKS; i++) {
    if (i < risks.length) {
      const r = risks[i] as Record<string, unknown>;
      row.push(String(r.risk_text || r.text || r.textEn || r).trim());
    } else { row.push(""); }
  }

  // Source files
  for (let i = 0; i < MAX_FILES; i++) { row.push(i < sourceFiles.length ? sourceFiles[i] : ""); }

  // Meta
  row.push(
    attachments.map(a => a.fileName).join("; "),
    licence.licencePdfPath,
    licence.importedFrom,
    licence.notes,
  );

  const csv = [
    headers.map(h => esc(h)).join(","),
    row.map(c => esc(c)).join(","),
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="NPN_${licence.licenceNumber}_${licence.productName.replace(/[^a-zA-Z0-9]/g, "_")}.csv"`,
    },
  });
}

function jp(json: string | undefined): unknown[] {
  if (!json) return [];
  try { const p = JSON.parse(json); return Array.isArray(p) ? p.filter(Boolean) : []; } catch { return []; }
}

function esc(val: string): string {
  if (!val) return '""';
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return `"${val}"`;
}
