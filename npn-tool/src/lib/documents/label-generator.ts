import { askClaude } from "../ai/claude";

interface LabelInput {
  productName: string;
  brandName: string;
  dosageForm: string;
  routeOfAdmin: string;
  medicinalIngredients: Array<{
    properName: string;
    commonName: string;
    quantity: number;
    quantityUnit: string;
  }>;
  nonMedicinalIngredients: Array<{
    ingredientName: string;
    purpose: string;
  }>;
  claims: string[];
  dosageInstructions: string;
  warnings: string[];
  companyName: string;
  companyAddress: string;
}

export async function generateEnglishLabel(input: LabelInput): Promise<string> {
  const ingList = input.medicinalIngredients
    .map((i) => `${i.properName} (${i.commonName}): ${i.quantity} ${i.quantityUnit}`)
    .join("\n");

  const nonMedList = input.nonMedicinalIngredients
    .map((i) => `${i.ingredientName} (${i.purpose})`)
    .join(", ");

  const prompt = `Generate a bilingual English product label for a Canadian Natural Health Product per NHPR Sections 86-95.

Product: ${input.productName}
Brand: ${input.brandName || input.productName}
Dosage Form: ${input.dosageForm}
Route: ${input.routeOfAdmin}

Medicinal Ingredients (per ${input.dosageForm.toLowerCase()}):
${ingList}

Non-Medicinal Ingredients: ${nonMedList || "None listed yet"}

Recommended Use/Purpose:
${input.claims.join("\n")}

Dosage: ${input.dosageInstructions || "Adults: Take 1 " + input.dosageForm.toLowerCase() + " daily with food, or as directed by a healthcare practitioner."}

Warnings/Cautions:
${input.warnings.length > 0 ? input.warnings.join("\n") : "Consult a healthcare practitioner prior to use if you are pregnant or breastfeeding."}

Licence Holder: ${input.companyName}
Address: ${input.companyAddress}

Requirements:
- Product Facts Table format per NHPR
- Include: NPN [placeholder], Product Name, Dosage Form
- Include: Medicinal Ingredients table (Name, Quantity per dosage unit)
- Include: Non-Medicinal Ingredients list
- Include: Recommended Use, Recommended Dose, Duration of Use
- Include: Cautions and Warnings
- Include: Lot # [placeholder], Exp. Date [placeholder]
- Include: Licence Holder info
- Clean HTML layout suitable for label printing

Return ONLY the HTML label content.`;

  return askClaude(
    "You are a Canadian NHP labelling expert. Generate NHPR-compliant Product Facts Table labels in clean HTML.",
    prompt,
    { maxTokens: 3000 }
  );
}

export async function translateLabelToFrench(englishLabel: string): Promise<string> {
  const prompt = `Translate this Canadian Natural Health Product label from English to French.

CRITICAL RULES:
- Use official Health Canada / NHPR French regulatory terminology
- "Recommended Use" = "Usage recommandé"
- "Recommended Dose" = "Dose recommandée"
- "Duration of Use" = "Durée d'utilisation"
- "Caution" = "Mise en garde"
- "Warning" = "Avertissement"
- "Medicinal Ingredients" = "Ingrédients médicinaux"
- "Non-Medicinal Ingredients" = "Ingrédients non médicinaux"
- "Product Facts" = "Information sur le produit"
- "Consult a healthcare practitioner" = "Consultez un professionnel de la santé"
- Keep ingredient scientific/proper names as-is (Latin names don't translate)
- Keep NPN number, lot number, expiry date placeholders as-is
- Maintain the exact same HTML structure

English Label:
${englishLabel}

Return ONLY the translated French HTML label.`;

  return askClaude(
    "You are a French regulatory translation expert specializing in Canadian Natural Health Product labels. Use official NHPR French terminology. This is regulatory text — precision is critical.",
    prompt,
    { maxTokens: 3000, temperature: 0.1 }
  );
}
