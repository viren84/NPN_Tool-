import { NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/auth/guard";
import * as XLSX from "xlsx";

/**
 * GET /api/applications/export-template
 * Download an empty mapping template Excel that can be filled externally and imported.
 */
export async function GET() {
  const user = await requireAuth();
  if (isErrorResponse(user)) return user;

  const wb = XLSX.utils.book_new();

  // Sheet 1: Instructions
  const instructions = [
    ["NPN Filing Tool — Application Import Template"],
    [""],
    ["HOW TO USE:"],
    ["1. Fill in the 'Product Info' sheet with your product details"],
    ["2. Fill in the 'Medicinal Ingredients' sheet (one row per ingredient)"],
    ["3. Fill in the 'Non-Medicinal' sheet (one row per excipient)"],
    ["4. Fill in the 'Claims' sheet (one row per health claim)"],
    ["5. Fill in the 'Dosage' sheet (one row per population group)"],
    ["6. Fill in the 'Risk Info' sheet (one row per caution/warning)"],
    ["7. Save the file and import via the NPN Filing Tool"],
    [""],
    ["FIELD RULES:"],
    ["- Fields marked * are required"],
    ["- Application Class: I, II, or III"],
    ["- Dosage Form: Capsule, Tablet, Softgel, Liquid, Powder, Chewable Tablet, Lozenge, Cream, Spray, Drops"],
    ["- Route: Oral, Topical, Sublingual, Nasal, Inhalation"],
    ["- Risk Type: caution, warning, contraindication, adverse_reaction"],
    ["- Quantity units: mg, mcg, IU, g, mL"],
    [""],
    ["All imported data will be tagged with source='imported' in the NPN Filing Tool."],
  ];
  const wsInst = XLSX.utils.aoa_to_sheet(instructions);
  wsInst["!cols"] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsInst, "Instructions");

  // Sheet 2: Product Info
  const productInfo = [
    ["Field", "Value", "Notes"],
    ["product_name *", "", "Product name (required)"],
    ["brand_name", "", "Brand name"],
    ["application_class", "", "I, II, or III"],
    ["application_type", "", "Compendial, Traditional, or Non-traditional"],
    ["dosage_form", "", "Capsule, Tablet, Softgel, Liquid, Powder, etc."],
    ["route_of_admin", "", "Oral, Topical, Sublingual, etc."],
    ["product_concept", "", "Description of what this product does"],
    ["duration_of_use", "", "e.g., 30 days, ongoing"],
    ["animal_tissue", "", "Yes or No"],
    ["sterile", "", "Yes or No"],
  ];
  const wsProd = XLSX.utils.aoa_to_sheet(productInfo);
  wsProd["!cols"] = [{ wch: 20 }, { wch: 50 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsProd, "Product Info");

  // Sheet 3: Medicinal Ingredients
  const miTemplate = [
    ["nhpid_name", "proper_name", "common_name", "scientific_name", "quantity *", "unit *", "potency", "potency_unit", "source_material", "standardization", "extract_type", "extract_solvent", "extract_ratio", "monograph_name"],
    ["", "", "", "", "", "mg", "", "", "", "", "", "", "", ""],
  ];
  const wsMI = XLSX.utils.aoa_to_sheet(miTemplate);
  wsMI["!cols"] = miTemplate[0].map(() => ({ wch: 18 }));
  XLSX.utils.book_append_sheet(wb, wsMI, "Medicinal Ingredients");

  // Sheet 4: Non-Medicinal Ingredients
  const nmiTemplate = [
    ["ingredient_name *", "purpose", "quantity", "unit"],
    ["", "", "", ""],
  ];
  const wsNMI = XLSX.utils.aoa_to_sheet(nmiTemplate);
  wsNMI["!cols"] = nmiTemplate[0].map(() => ({ wch: 20 }));
  XLSX.utils.book_append_sheet(wb, wsNMI, "Non-Medicinal");

  // Sheet 5: Claims
  const claimTemplate = [
    ["claim_text_en *", "claim_text_fr", "from_monograph", "monograph_name", "claim_type"],
    ["", "", "Yes or No", "", "health"],
  ];
  const wsClaim = XLSX.utils.aoa_to_sheet(claimTemplate);
  wsClaim["!cols"] = [{ wch: 60 }, { wch: 60 }, { wch: 15 }, { wch: 20 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsClaim, "Claims");

  // Sheet 6: Dosage
  const doseTemplate = [
    ["population *", "age_min", "age_max", "min_dose", "max_dose", "dose_unit", "frequency", "directions", "with_food"],
    ["Adults", "18", "", "1", "2", "capsule(s)", "daily", "Take with food", "Yes"],
  ];
  const wsDose = XLSX.utils.aoa_to_sheet(doseTemplate);
  wsDose["!cols"] = doseTemplate[0].map(() => ({ wch: 15 }));
  XLSX.utils.book_append_sheet(wb, wsDose, "Dosage");

  // Sheet 7: Risk Info
  const riskTemplate = [
    ["risk_type *", "text_en *", "text_fr", "from_monograph", "monograph_name"],
    ["caution", "", "", "Yes or No", ""],
  ];
  const wsRisk = XLSX.utils.aoa_to_sheet(riskTemplate);
  wsRisk["!cols"] = [{ wch: 18 }, { wch: 60 }, { wch: 60 }, { wch: 15 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsRisk, "Risk Info");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="NPN_Application_Template.xlsx"`,
    },
  });
}
