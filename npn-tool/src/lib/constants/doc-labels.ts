/** Canonical document type labels used across PackageClient, DocumentsClient, and PDF export. */
export const DOC_LABELS: Record<string, string> = {
  pla_form: "PLA Form (.html)",
  cover_letter: "Cover Letter",
  fps_form: "Finished Product Specifications",
  label_en: "Product Label (English)",
  label_fr: "Product Label (French)",
  monograph_attestation: "Monograph Attestation",
  safety_report: "Safety Summary Report",
  efficacy_report: "Efficacy Summary Report",
  animal_tissue_form: "Animal Tissue Form",
  senior_attestation: "Senior Official Attestation",
  ingredient_specs: "Medicinal Ingredient Specifications",
  non_med_list: "Non-Medicinal Ingredient List",
  quality_chemistry_report: "Quality/Chemistry Report",
};

/** Ordered document types for PDF export numbering. */
export const DOC_ORDER = Object.keys(DOC_LABELS);

/** Numbered label for PDF export (e.g. "01 - PLA Form (.html)") */
export function numberedLabel(docType: string): string {
  const idx = DOC_ORDER.indexOf(docType);
  const num = idx >= 0 ? String(idx + 1).padStart(2, "0") : "??";
  return `${num} - ${DOC_LABELS[docType] || docType}`;
}
