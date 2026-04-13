import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, isErrorResponse } from "@/lib/auth/guard";
import { trackActivity } from "@/lib/tracking/activity";
import { logAudit } from "@/lib/db/audit";
import fs from "fs/promises";

// GET — bulk export all licences (JSON or CSV)
// EVERY bulk export is logged — this is the primary audit point for external access
export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (isErrorResponse(user)) return user;

  const format = req.nextUrl.searchParams.get("format") || "json";
  const status = req.nextUrl.searchParams.get("status") || "";
  const purpose = req.nextUrl.searchParams.get("purpose") || "api_access";
  const agent = req.nextUrl.searchParams.get("agent") || "";

  const ids = req.nextUrl.searchParams.get("ids") || "";

  const where: Record<string, unknown> = {};
  if (status && status !== "all") where.productStatus = status;
  if (ids) where.id = { in: ids.split(",").filter(Boolean) };

  const licences = await prisma.productLicence.findMany({
    where,
    orderBy: { productName: "asc" },
  });

  // LOG THE BULK EXPORT
  await logAudit(user.id, "exported", "licence", "bulk",
    `${user.name} bulk exported ${licences.length} licences as ${format} (purpose: ${purpose}, agent: ${agent || "manual"})`);

  trackActivity(user.id, "export", {
    entityType: "licence_bulk", entityId: "all",
    entityName: `${licences.length} licences`,
    details: `Format: ${format}, Purpose: ${purpose}, Agent: ${agent || "none"}, Count: ${licences.length}`,
    ipAddress: req.headers.get("x-forwarded-for") || "",
    userAgent: req.headers.get("user-agent") || "",
  });

  // JSON export — return parsed data
  if (format !== "csv") {
    const exportData = licences.map(lic => ({
      npn: lic.licenceNumber, productName: lic.productName, productNameFr: lic.productNameFr,
      dosageForm: lic.dosageForm, routeOfAdmin: lic.routeOfAdmin, applicationClass: lic.applicationClass,
      submissionType: lic.submissionType, companyName: lic.companyName, companyCode: lic.companyCode,
      status: lic.productStatus, licenceDate: lic.licenceDate, revisedDate: lic.revisedDate,
      medicinalIngredients: jp(lic.medicinalIngredientsJson), nonMedicinalIngredients: jp(lic.nonMedIngredientsJson),
      claims: jp(lic.claimsJson), risks: jp(lic.risksJson), doses: jp(lic.dosesJson),
    }));
    return NextResponse.json({ licences: exportData, total: exportData.length, exportedAt: new Date().toISOString(), exportedBy: user.name });
  }

  // ========== COMPREHENSIVE CSV EXPORT ==========

  // Build header — separate columns for each ingredient, claim, risk, etc.
  const MAX_INGS = 10;
  const MAX_CLAIMS = 5;
  const MAX_RISKS = 3;
  const MAX_FILES = 4;

  const headers: string[] = [
    // Core
    "NPN", "Product Name", "Product Name (FR)", "Dosage Form", "Route of Admin",
    "Application Class", "Submission Type", "Product Status",
    "Company Name", "Company Code",
    "Licence Date", "Revised Date", "Monograph Attested", "LNHPD ID",
  ];

  // Ingredient columns
  for (let i = 1; i <= MAX_INGS; i++) {
    headers.push(`Ingredient ${i} Name`, `Ingredient ${i} Qty`);
  }

  // Non-medicinal
  headers.push("Non-Medicinal Ingredients");

  // Claims columns
  for (let i = 1; i <= MAX_CLAIMS; i++) {
    headers.push(`Claim ${i}`);
  }

  // Dosage
  headers.push("Dosage Population", "Dosage Amount", "Dosage Frequency", "Dosage Directions");

  // Risks
  for (let i = 1; i <= MAX_RISKS; i++) {
    headers.push(`Risk ${i}`);
  }

  // Source files
  for (let i = 1; i <= MAX_FILES; i++) {
    headers.push(`Source File ${i}`);
  }

  // Attachments + meta
  headers.push("Attached Documents", "PDF Folder Path", "Import Source", "Notes");

  // Build rows
  const rows: string[][] = [];

  for (const lic of licences) {
    const ings = jp(lic.medicinalIngredientsJson);
    const nonMed = jp(lic.nonMedIngredientsJson);
    const claims = jp(lic.claimsJson);
    const risks = jp(lic.risksJson);
    const doses = jp(lic.dosesJson);

    // Get source files from filesystem
    let sourceFileNames: string[] = [];
    if (lic.licencePdfPath) {
      try {
        const entries = await fs.readdir(lic.licencePdfPath);
        sourceFileNames = entries.filter(e => !e.startsWith("."));
      } catch { /* folder may not exist */ }
    }

    // Get attachments from DB
    const attachments = await prisma.attachment.findMany({
      where: { entityType: "licence", entityId: lic.id },
      select: { fileName: true },
    });
    const attachmentNames = attachments.map(a => a.fileName).join("; ");

    const row: string[] = [
      // Core
      lic.licenceNumber, lic.productName, lic.productNameFr, lic.dosageForm, lic.routeOfAdmin,
      lic.applicationClass, lic.submissionType, lic.productStatus,
      lic.companyName, lic.companyCode,
      lic.licenceDate, lic.revisedDate, lic.attestedMonograph ? "Yes" : "No", lic.lnhpdId || "",
    ];

    // Ingredients — separate columns
    for (let i = 0; i < MAX_INGS; i++) {
      if (i < ings.length) {
        const ing = ings[i] as Record<string, unknown>;
        const name = String(ing.ingredient_name || ing.name || ing.properName || "");
        const qty = ing.quantity
          ? `${ing.quantity} ${ing.potency_unit || ing.uom_type_desc || ""}`
          : ing.potency_amount
            ? `${ing.potency_amount} ${ing.potency_unit || ""}`
            : "";
        row.push(name.trim(), String(qty).trim());
      } else {
        row.push("", "");
      }
    }

    // Non-medicinal — joined
    const nonMedNames = nonMed.map((n: unknown) => {
      const nm = n as Record<string, unknown>;
      return String(nm.ingredient_name || nm.name || "").trim();
    }).filter(Boolean).join("; ");
    row.push(nonMedNames);

    // Claims — separate columns
    for (let i = 0; i < MAX_CLAIMS; i++) {
      if (i < claims.length) {
        const c = claims[i] as Record<string, unknown>;
        row.push(String(c.purpose || c.text || c.claimTextEn || c).trim());
      } else {
        row.push("");
      }
    }

    // Dosage — first group
    if (doses.length > 0) {
      const d = doses[0] as Record<string, unknown>;
      row.push(
        String(d.population_type_desc || d.population || ""),
        `${d.quantity_dose || d.dose || ""} ${d.uom_type_desc_quantity_dose || ""}`.trim(),
        `${d.frequency || ""} ${d.uom_type_desc_frequency || ""}`.trim(),
        String(d.directions || d.directions_of_use || ""),
      );
    } else {
      row.push("", "", "", "");
    }

    // Risks — separate columns
    for (let i = 0; i < MAX_RISKS; i++) {
      if (i < risks.length) {
        const r = risks[i] as Record<string, unknown>;
        row.push(String(r.risk_text || r.text || r.textEn || r).trim());
      } else {
        row.push("");
      }
    }

    // Source files — separate columns
    for (let i = 0; i < MAX_FILES; i++) {
      row.push(i < sourceFileNames.length ? sourceFileNames[i] : "");
    }

    // Attachments + meta
    row.push(attachmentNames, lic.licencePdfPath, lic.importedFrom, lic.notes);

    rows.push(row);
  }

  // Generate CSV with proper escaping
  const csvLines = [
    headers.map(h => esc(h)).join(","),
    ...rows.map(row => row.map(cell => esc(cell)).join(",")),
  ];

  return new NextResponse(csvLines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="NPN_Licences_Full_Export_${new Date().toISOString().slice(0, 10)}.csv"`,
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
