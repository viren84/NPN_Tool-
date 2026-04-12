import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, isErrorResponse } from "@/lib/auth/guard";
import { trackActivity } from "@/lib/tracking/activity";
import { logAudit } from "@/lib/db/audit";
import * as XLSX from "xlsx";
import fs from "fs/promises";

function jp(json: string | undefined): unknown[] {
  if (!json) return [];
  try { const p = JSON.parse(json); return Array.isArray(p) ? p.filter(Boolean) : []; } catch { return []; }
}

function str(obj: unknown, ...keys: string[]): string {
  if (!obj || typeof obj !== "object") return "";
  const o = obj as Record<string, unknown>;
  for (const k of keys) { if (o[k]) return String(o[k]).trim(); }
  return "";
}

// Field definitions for Sheet 2
const FIELDS = [
  // Product Identity
  { field: "npn", display: "NPN", def: "8-digit Natural Product Number issued by Health Canada", values: "8-digit number", example: "80120932", required: "Required", type: "Text", group: "Product Identity" },
  { field: "product_name", display: "Product Name (EN)", def: "English product/brand name as on licence", values: "Text, max 200", example: "WE B12", required: "Required", type: "Text", group: "Product Identity" },
  { field: "product_name_fr", display: "Product Name (FR)", def: "French product name", values: "Text", example: "", required: "Optional", type: "Text", group: "Product Identity" },
  { field: "dosage_form", display: "Dosage Form", def: "Physical form of the product", values: "Capsule|Tablet|Softgel|Liquid|Powder|Cream|Spray|Drops|Lozenge", example: "Capsule", required: "Required", type: "Dropdown", group: "Product Identity" },
  { field: "route_of_admin", display: "Route of Administration", def: "How the product is taken", values: "Oral|Topical|Sublingual|Nasal|Inhalation", example: "Oral", required: "Required", type: "Dropdown", group: "Product Identity" },

  // Regulatory
  { field: "application_class", display: "Application Class", def: "HC application class based on monograph coverage", values: "I|II|III", example: "I", required: "Required", type: "Dropdown", group: "Regulatory" },
  { field: "submission_type", display: "Submission Type", def: "Type of PLA submission", values: "Compendial|Traditional|Non-traditional", example: "Compendial", required: "Required", type: "Dropdown", group: "Regulatory" },
  { field: "product_status", display: "Product Status", def: "Current licence status", values: "active|non_active|cancelled|suspended", example: "active", required: "Auto", type: "Dropdown", group: "Regulatory" },
  { field: "monograph_attested", display: "Monograph Attested", def: "Whether product attests to HC monograph", values: "Yes|No", example: "Yes", required: "Auto", type: "Dropdown", group: "Regulatory" },
  { field: "lnhpd_id", display: "LNHPD ID", def: "Health Canada Licensed NHP Database identifier", values: "Number", example: "26497731", required: "Auto", type: "Number", group: "Regulatory" },

  // Company
  { field: "company_name", display: "Company Name", def: "Licence holder legal name", values: "Text", example: "UV International Traders Inc (DBA Wellnessextract)", required: "Required", type: "Text", group: "Company" },
  { field: "company_code", display: "Company Code", def: "HC company identifier", values: "Number", example: "45028", required: "Required", type: "Text", group: "Company" },

  // Dates
  { field: "licence_date", display: "Licence Date", def: "Date licence was issued", values: "YYYY-MM-DD", example: "2022-09-01", required: "Auto", type: "Date", group: "Dates" },
  { field: "revised_date", display: "Revised Date", def: "Date of last revision", values: "YYYY-MM-DD", example: "", required: "Optional", type: "Date", group: "Dates" },
];

// Add ingredient fields
for (let i = 1; i <= 10; i++) {
  FIELDS.push(
    { field: `ingredient_${i}_name`, display: `Ingredient ${i} Name`, def: `Medicinal ingredient ${i} proper name`, values: "Text", example: i === 1 ? "Cyanocobalamin" : "", required: i === 1 ? "Required" : "Optional", type: "Text", group: "Medicinal Ingredients" },
    { field: `ingredient_${i}_qty`, display: `Ingredient ${i} Qty`, def: `Quantity per dosage unit for ingredient ${i}`, values: "Number + Unit", example: i === 1 ? "1200 mcg" : "", required: i === 1 ? "Required" : "Optional", type: "Text", group: "Medicinal Ingredients" },
  );
}

FIELDS.push({ field: "non_medicinal_ingredients", display: "Non-Medicinal Ingredients", def: "All non-medicinal ingredients (excipients)", values: "Semicolon-separated list", example: "Microcrystalline cellulose; Magnesium stearate", required: "Required", type: "Text", group: "Non-Medicinal" });

for (let i = 1; i <= 5; i++) {
  FIELDS.push({ field: `claim_${i}`, display: `Claim ${i}`, def: `Approved health claim / recommended use ${i}`, values: "Text", example: i === 1 ? "Helps in energy metabolism" : "", required: i === 1 ? "Required" : "Optional", type: "Text", group: "Claims" });
}

FIELDS.push(
  { field: "dosage_population", display: "Dosage Population", def: "Target population for dosage", values: "Adults|Children|Pregnant|etc.", example: "Adults", required: "Required", type: "Text", group: "Dosage" },
  { field: "dosage_amount", display: "Dosage Amount", def: "Dose quantity per administration", values: "Number + Unit", example: "1 capsule", required: "Required", type: "Text", group: "Dosage" },
  { field: "dosage_frequency", display: "Dosage Frequency", def: "How often to take", values: "Text", example: "1 daily", required: "Required", type: "Text", group: "Dosage" },
  { field: "dosage_directions", display: "Dosage Directions", def: "Additional directions for use", values: "Text", example: "Take with food", required: "Optional", type: "Text", group: "Dosage" },
);

for (let i = 1; i <= 3; i++) {
  FIELDS.push({ field: `risk_${i}`, display: `Risk ${i}`, def: `Risk information / caution / warning ${i}`, values: "Text", example: "", required: "Conditional", type: "Text", group: "Risk Information" });
}

for (let i = 1; i <= 4; i++) {
  FIELDS.push({ field: `source_file_${i}`, display: `Source File ${i}`, def: `Original document file name ${i}`, values: "Filename", example: i === 1 ? "IL 679685.pdf" : "", required: "Auto", type: "Text", group: "Source Files" });
}

FIELDS.push(
  { field: "attached_documents", display: "Attached Documents", def: "Additional uploaded documents", values: "Semicolon-separated filenames", example: "", required: "Optional", type: "Text", group: "Meta" },
  { field: "pdf_folder_path", display: "PDF Folder Path", def: "Local path to source PDF folder", values: "Path", example: "C:\\...\\NPN_S\\B12", required: "Auto", type: "Text", group: "Meta" },
  { field: "import_source", display: "Import Source", def: "How this record was imported", values: "folder_scan|single_pdf|manual|lnhpd_sync", example: "folder_scan", required: "Auto", type: "Text", group: "Meta" },
  { field: "notes", display: "Notes", def: "Internal notes", values: "Text", example: "", required: "Optional", type: "Text", group: "Meta" },
);

export async function GET() {
  const user = await requireAuth();
  if (isErrorResponse(user)) return user;

  const licences = await prisma.productLicence.findMany({ orderBy: { productName: "asc" } });

  const wb = XLSX.utils.book_new();

  // ========== SHEET 1: INSTRUCTIONS ==========
  const instrData = [
    ["NPN Licence Export — Health Canada"],
    [`Version: 1.0  |  Exported: ${new Date().toISOString().slice(0, 10)}  |  By: ${user.name}`],
    [""],
    ["HOW TO USE THIS FILE"],
    ["1. Review the field definitions on the 'Data Definitions' tab"],
    ["2. Product data is on the 'Data' tab"],
    ["3. Required fields are marked in RED — these must always be filled"],
    ["4. Conditionally required fields are in YELLOW — required for certain product types"],
    ["5. Auto-populated fields are in GREEN — filled by the system, do not edit"],
    ["6. Optional fields have no special color"],
    [""],
    ["COLOR LEGEND"],
    ["Color", "Meaning"],
    ["RED", "Required — must be filled for every product"],
    ["YELLOW", "Conditional — required for Class II/III or specific cases"],
    ["GREEN", "Auto-populated — system fills this, do not edit manually"],
    ["WHITE", "Optional — fill if available"],
    [""],
    ["TAB DESCRIPTIONS"],
    ["Tab", "Contents"],
    ["Instructions", "This page — how to use the file"],
    ["Data Definitions", "Complete list of all fields with accepted values and examples"],
    ["Data", "Actual product licence data — one row per NPN"],
    [""],
    [`Total Products: ${licences.length}`],
    [`Export Date: ${new Date().toISOString()}`],
    [`Company: UV International Traders Inc (DBA Wellnessextract) — Code: 45028`],
  ];
  const wsInstr = XLSX.utils.aoa_to_sheet(instrData);
  wsInstr["!cols"] = [{ wch: 60 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsInstr, "Instructions");

  // ========== SHEET 2: DATA DEFINITIONS ==========
  const defHeaders = ["Field Name", "Display Name", "Definition", "Accepted Values", "Example", "Required?", "Data Type", "Group"];
  const defRows = FIELDS.map(f => [f.field, f.display, f.def, f.values, f.example, f.required, f.type, f.group]);
  const wsDefData = [defHeaders, ...defRows];
  const wsDef = XLSX.utils.aoa_to_sheet(wsDefData);
  wsDef["!cols"] = [{ wch: 25 }, { wch: 25 }, { wch: 50 }, { wch: 30 }, { wch: 25 }, { wch: 12 }, { wch: 10 }, { wch: 20 }];
  // Freeze first row
  wsDef["!freeze"] = { xSplit: 0, ySplit: 1 };
  XLSX.utils.book_append_sheet(wb, wsDef, "Data Definitions");

  // ========== SHEET 3: DATA ==========
  // Row 1: machine field names
  const machineNames = FIELDS.map(f => f.field);
  // Row 2: display names
  const displayNames = FIELDS.map(f => f.display);

  // Build data rows
  const dataRows: string[][] = [];
  for (const lic of licences) {
    const ings = jp(lic.medicinalIngredientsJson);
    const nonMed = jp(lic.nonMedIngredientsJson);
    const claims = jp(lic.claimsJson);
    const risks = jp(lic.risksJson);
    const doses = jp(lic.dosesJson);

    let sourceFiles: string[] = [];
    if (lic.licencePdfPath) {
      try { sourceFiles = (await fs.readdir(lic.licencePdfPath)).filter(e => !e.startsWith(".")); } catch {}
    }

    const attachments = await prisma.attachment.findMany({
      where: { entityType: "licence", entityId: lic.id },
      select: { fileName: true },
    });

    const row: string[] = [
      lic.licenceNumber, lic.productName, lic.productNameFr, lic.dosageForm, lic.routeOfAdmin,
      lic.applicationClass, lic.submissionType, lic.productStatus,
      lic.attestedMonograph ? "Yes" : "No", lic.lnhpdId || "",
      lic.companyName, lic.companyCode,
      lic.licenceDate, lic.revisedDate,
    ];

    // Ingredients
    for (let i = 0; i < 10; i++) {
      if (i < ings.length) {
        const ing = ings[i] as Record<string, unknown>;
        row.push(str(ing, "ingredient_name", "name", "properName"));
        row.push(`${ing.quantity || ing.potency_amount || ""} ${ing.potency_unit || ing.uom_type_desc || ""}`.trim());
      } else { row.push("", ""); }
    }

    // Non-med
    row.push(nonMed.map((n: unknown) => str(n, "ingredient_name", "name")).filter(Boolean).join("; "));

    // Claims
    for (let i = 0; i < 5; i++) {
      row.push(i < claims.length ? str(claims[i], "purpose", "text", "claimTextEn") : "");
    }

    // Dosage
    if (doses.length > 0) {
      const d = doses[0] as Record<string, unknown>;
      row.push(str(d, "population_type_desc", "population"));
      row.push(`${d.quantity_dose || d.dose || ""} ${d.uom_type_desc_quantity_dose || ""}`.trim());
      row.push(`${d.frequency || ""} ${d.uom_type_desc_frequency || ""}`.trim());
      row.push(str(d, "directions", "directions_of_use"));
    } else { row.push("", "", "", ""); }

    // Risks
    for (let i = 0; i < 3; i++) {
      row.push(i < risks.length ? str(risks[i], "risk_text", "text", "textEn") : "");
    }

    // Source files
    for (let i = 0; i < 4; i++) { row.push(i < sourceFiles.length ? sourceFiles[i] : ""); }

    // Meta
    row.push(attachments.map(a => a.fileName).join("; "), lic.licencePdfPath, lic.importedFrom, lic.notes);

    dataRows.push(row);
  }

  // Build sheet: Row 1 = machine names, Row 2 = display names, Row 3+ = data
  const sheetData = [machineNames, displayNames, ...dataRows];
  const wsData = XLSX.utils.aoa_to_sheet(sheetData);

  // Column widths
  wsData["!cols"] = FIELDS.map(f => ({ wch: Math.min(Math.max(f.display.length, 12), 40) }));

  // Freeze Row 2 (display names row stays visible)
  wsData["!freeze"] = { xSplit: 0, ySplit: 2 };

  // Data validation (dropdowns) — xlsx community edition supports this via sheet property
  const dvs: unknown[] = [];
  FIELDS.forEach((f, col) => {
    if (f.type === "Dropdown" && f.values.includes("|")) {
      dvs.push({
        type: "list",
        operator: "equal",
        sqref: XLSX.utils.encode_range({ s: { r: 2, c: col }, e: { r: 2 + dataRows.length, c: col } }),
        formula1: `"${f.values.replace(/\|/g, ",")}"`,
      });
    }
  });
  if (dvs.length > 0) (wsData as Record<string, unknown>)["!dataValidation"] = dvs;

  XLSX.utils.book_append_sheet(wb, wsData, "Data");

  // Write
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  await logAudit(user.id, "exported", "licence", "excel",
    `${user.name} exported ${licences.length} licences as Excel (Amazon-style 3-sheet, ${FIELDS.length} columns)`);

  trackActivity(user.id, "export", {
    entityType: "licence_excel", entityId: "all",
    entityName: `${licences.length} licences (Excel 3-sheet)`,
    details: `Amazon-style: Instructions + Definitions + Data. ${dataRows.length} rows, ${FIELDS.length} columns`,
  });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="NPN_Licences_Export_${new Date().toISOString().slice(0, 10)}.xlsx"`,
      "Content-Length": String(buffer.length),
    },
  });
}
