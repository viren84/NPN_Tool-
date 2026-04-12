import { askClaude } from "../ai/claude";

interface ReportInput {
  productName: string;
  applicationClass: string;
  ingredients: Array<{
    properName: string;
    commonName: string;
    scientificName: string;
    quantity: number;
    quantityUnit: string;
    monographName: string;
    monographCompliant: boolean;
  }>;
  claims: string[];
}

export async function generateSafetyReport(input: ReportInput): Promise<string> {
  const ingList = input.ingredients
    .map((i) => `- ${i.properName} (${i.scientificName}): ${i.quantity} ${i.quantityUnit}, Monograph: ${i.monographName || "None"}`)
    .join("\n");

  const prompt = `Generate a comprehensive Safety Summary Report for a Health Canada NHP Class ${input.applicationClass} application.

Product: ${input.productName}
Ingredients:
${ingList}

Health Claims: ${input.claims.join("; ")}

The report must include:
1. Executive Summary
2. Ingredient-by-Ingredient Safety Profile
   - Known adverse reactions and incidence rates
   - Drug interactions
   - Contraindicated populations (pregnancy, children, specific conditions)
   - Toxicological data (LD50 if available, NOAEL)
   - Historical safety record (traditional use history if applicable)
3. Combination Safety Assessment
   - Potential ingredient-ingredient interactions
   - Cumulative dose safety
4. Recommended Risk Information
   - Cautions
   - Warnings
   - Contraindications
   - Known Adverse Reactions
5. Safety Conclusion

Format as a professional report in HTML with clear section headings. Include references where possible.
Note: This is a DRAFT requiring human expert review before submission.`;

  return askClaude(
    "You are a toxicology and NHP safety expert. Generate comprehensive safety summary reports for Health Canada NPN applications. Include citations to known pharmacopoeias and safety databases.",
    prompt,
    { maxTokens: 6000, temperature: 0.2 }
  );
}

export async function generateEfficacyReport(input: ReportInput): Promise<string> {
  const ingList = input.ingredients
    .map((i) => `- ${i.properName} (${i.scientificName}): ${i.quantity} ${i.quantityUnit}`)
    .join("\n");

  const prompt = `Generate a comprehensive Efficacy Summary Report for a Health Canada NHP Class ${input.applicationClass} application.

Product: ${input.productName}
Ingredients:
${ingList}

Health Claims to Support:
${input.claims.map((c, i) => `${i + 1}. ${c}`).join("\n")}

The report must include:
1. Executive Summary
2. Claim-by-Claim Evidence Review
   For each claim:
   - Supporting clinical studies (design, population, outcomes, significance)
   - Systematic reviews / meta-analyses if available
   - Traditional use evidence (if applicable, with pharmacopoeial references)
   - Mechanism of action
   - Evidence strength assessment (Strong / Moderate / Limited)
3. Dose-Response Relationship
   - Does the proposed dose fall within studied effective ranges?
4. Overall Efficacy Conclusion
5. References

Format as a professional report in HTML.
Note: This is a DRAFT requiring human expert review and additional study citations before submission.`;

  return askClaude(
    "You are a clinical evidence and NHP efficacy expert. Generate evidence-based efficacy summary reports for Health Canada NPN applications. Focus on supporting each specific health claim with appropriate evidence.",
    prompt,
    { maxTokens: 6000, temperature: 0.2 }
  );
}
