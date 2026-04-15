import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, isErrorResponse } from "@/lib/auth/guard";
import { logAudit } from "@/lib/db/audit";
import * as XLSX from "xlsx";

/**
 * GET /api/applications/[id]/export-preset
 * Export application as a 7-sheet Excel preset file.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth();
  if (isErrorResponse(user)) return user;

  const { id } = await params;

  const app = await prisma.application.findUnique({
    where: { id },
    include: {
      medicinalIngredients: { orderBy: { sortOrder: "asc" } },
      nonMedicinalIngredients: { orderBy: { sortOrder: "asc" } },
      claims: { orderBy: { sortOrder: "asc" } },
      dosageGroups: { orderBy: { sortOrder: "asc" } },
      riskInfos: { orderBy: { sortOrder: "asc" } },
      createdBy: { select: { name: true } },
    },
  });

  if (!app) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const dataSources: Record<string, string> = (() => {
    try { return JSON.parse(app.dataSourcesJson || "{}"); } catch { return {}; }
  })();

  const getSource = (path: string) => dataSources[path] || "manual";

  const wb = XLSX.utils.book_new();
  const date = new Date().toISOString().slice(0, 10);

  // Sheet 1: Product Info
  const productData = [
    ["Field", "Value", "Data Source"],
    ["Product Name", app.productName, getSource("productName")],
    ["Brand Name", app.brandName, getSource("brandName")],
    ["Application Class", app.applicationClass, getSource("applicationClass")],
    ["Application Type", app.applicationType, getSource("applicationType")],
    ["Dosage Form", app.dosageForm, getSource("dosageForm")],
    ["Route of Admin", app.routeOfAdmin, getSource("routeOfAdmin")],
    ["Product Concept", app.productConcept, getSource("productConcept")],
    ["Class Reasoning", app.classReasoning, getSource("classReasoning")],
    ["Status", app.status, ""],
    ["Animal Tissue", app.animalTissue ? "Yes" : "No", ""],
    ["Sterile", app.sterile ? "Yes" : "No", ""],
    ["Duration of Use", app.durationOfUse, ""],
    ["Created By", app.createdBy.name, ""],
    ["Created", app.createdAt.toISOString().slice(0, 10), ""],
    ["Source Document", app.sourceDocumentName, ""],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(productData);
  ws1["!cols"] = [{ wch: 20 }, { wch: 60 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, ws1, "Product Info");

  // Sheet 2: Medicinal Ingredients
  const miHeaders = ["#", "NHPID Name", "Proper Name", "Common Name", "Scientific Name", "Quantity", "Unit", "Potency", "Potency Unit", "Source Material", "Standardization", "Extract Type", "Monograph", "Monograph Compliant", "Supplier", "Data Source"];
  const miRows = app.medicinalIngredients.map((mi, i) => [
    i + 1, mi.nhpidName, mi.properName, mi.commonName, mi.scientificName,
    mi.quantity, mi.quantityUnit, mi.potency ?? "", mi.potencyUnit,
    mi.sourceMaterial, mi.standardization, mi.extractType,
    mi.monographName, mi.monographCompliant ? "Yes" : "No",
    mi.supplierName, getSource(`ingredients[${i}].name`),
  ]);
  const ws2 = XLSX.utils.aoa_to_sheet([miHeaders, ...miRows]);
  ws2["!cols"] = miHeaders.map(() => ({ wch: 18 }));
  XLSX.utils.book_append_sheet(wb, ws2, "Medicinal Ingredients");

  // Sheet 3: Non-Medicinal Ingredients
  const nmiHeaders = ["#", "Ingredient Name", "Purpose", "Quantity", "Unit", "Data Source"];
  const nmiRows = app.nonMedicinalIngredients.map((nmi, i) => [
    i + 1, nmi.ingredientName, nmi.purpose, nmi.quantity ?? "", nmi.unit,
    getSource(`nonMedIngredients[${i}].name`),
  ]);
  const ws3 = XLSX.utils.aoa_to_sheet([nmiHeaders, ...nmiRows]);
  ws3["!cols"] = nmiHeaders.map(() => ({ wch: 20 }));
  XLSX.utils.book_append_sheet(wb, ws3, "Non-Medicinal");

  // Sheet 4: Claims
  const claimHeaders = ["#", "Claim (EN)", "Claim (FR)", "From Monograph", "Monograph Name", "Linked Ingredient IDs", "Claim Type", "Selected", "Data Source"];
  const claimRows = app.claims.map((c, i) => [
    i + 1, c.claimTextEn, c.claimTextFr, c.fromMonograph ? "Yes" : "No",
    c.monographName, c.linkedIngredientIds, c.claimType, c.selected ? "Yes" : "No",
    getSource(`claims[${i}].claimTextEn`),
  ]);
  const ws4 = XLSX.utils.aoa_to_sheet([claimHeaders, ...claimRows]);
  ws4["!cols"] = [{ wch: 5 }, { wch: 60 }, { wch: 60 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, ws4, "Claims");

  // Sheet 5: Dosage Groups
  const doseHeaders = ["#", "Population", "Age Min", "Age Max", "Min Dose", "Max Dose", "Unit", "Frequency", "Directions", "With Food", "Data Source"];
  const doseRows = app.dosageGroups.map((d, i) => [
    i + 1, d.population, d.ageRangeMin ?? "", d.ageRangeMax ?? "",
    d.minDose ?? "", d.maxDose ?? "", d.doseUnit, d.frequency,
    d.directions, d.withFood ? "Yes" : "No",
    getSource(`dosage[${i}].population`),
  ]);
  const ws5 = XLSX.utils.aoa_to_sheet([doseHeaders, ...doseRows]);
  ws5["!cols"] = doseHeaders.map(() => ({ wch: 15 }));
  XLSX.utils.book_append_sheet(wb, ws5, "Dosage Groups");

  // Sheet 6: Risk Information
  const riskHeaders = ["#", "Risk Type", "Text (EN)", "Text (FR)", "From Monograph", "Monograph Name", "Data Source"];
  const riskRows = app.riskInfos.map((r, i) => [
    i + 1, r.riskType, r.textEn, r.textFr, r.fromMonograph ? "Yes" : "No",
    r.monographName, getSource(`risks[${i}].textEn`),
  ]);
  const ws6 = XLSX.utils.aoa_to_sheet([riskHeaders, ...riskRows]);
  ws6["!cols"] = [{ wch: 5 }, { wch: 18 }, { wch: 60 }, { wch: 60 }, { wch: 15 }, { wch: 20 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, ws6, "Risk Information");

  // Sheet 7: Data Sources Audit
  const auditHeaders = ["Field Path", "Value", "Data Source", "Source Document", "Notes"];
  const auditRows: string[][] = [];
  for (const [path, source] of Object.entries(dataSources)) {
    auditRows.push([path, "", source, app.sourceDocumentName, ""]);
  }
  if (auditRows.length === 0) {
    auditRows.push(["(no data source tracking)", "", "", "", "All data entered manually"]);
  }
  const ws7 = XLSX.utils.aoa_to_sheet([auditHeaders, ...auditRows]);
  ws7["!cols"] = [{ wch: 30 }, { wch: 40 }, { wch: 15 }, { wch: 30 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ws7, "Data Sources");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const safeName = app.productName.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_");

  await logAudit(user.id, "exported", "application", id, `${user.name} exported preset Excel for "${app.productName}"`);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="PLA_Preset_${safeName}_${date}.xlsx"`,
    },
  });
}
