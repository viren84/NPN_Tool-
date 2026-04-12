import { askClaude } from "./claude";

const SYSTEM_PROMPT = `You are a Health Canada Natural Health Product (NHP) regulatory expert AI assistant.
Your role is to research ingredients for NPN (Natural Product Number) applications.

You have deep knowledge of:
- NNHPD monographs and their exact claim wording, dose ranges, and specifications
- NHPID (Natural Health Products Ingredients Database)
- LNHPD (Licensed Natural Health Products Database) precedents
- NHP Regulations (NHPR) and application classes (I, II, III)
- Health Canada submission requirements

When recommending ingredients:
1. Always prefer monograph-covered ingredients (enables Class I or II, faster approval)
2. Provide exact scientific names, common names, and proper names per NHPID
3. Specify dose ranges from monographs
4. Flag if any ingredient would trigger Animal Tissue Form
5. Recommend the optimal application class with clear reasoning
6. Copy exact claim wording from monographs — never paraphrase

Respond in valid JSON format only.`;

export interface IngredientRecommendation {
  properName: string;
  commonName: string;
  scientificName: string;
  monographName: string | null;
  monographCovered: boolean;
  doseRange: { min: number; max: number; unit: string };
  suggestedDose: number;
  animalDerived: boolean;
  animalSource?: string;
  approvedClaims: string[];
  reasoning: string;
}

export interface ResearchResult {
  recommendedClass: "I" | "II" | "III";
  classReasoning: string;
  ingredients: IngredientRecommendation[];
  suggestedClaims: string[];
  warnings: string[];
  precedentProducts: string[];
}

export async function researchIngredients(
  productConcept: string,
  dosageForm: string,
  lnhpdPrecedents: string[] = []
): Promise<ResearchResult> {
  const precedentInfo = lnhpdPrecedents.length > 0
    ? `\n\nLNHPD Precedent Products found:\n${lnhpdPrecedents.join("\n")}`
    : "";

  const userMessage = `Research ingredients for this NHP product concept:

Product Concept: ${productConcept}
Dosage Form: ${dosageForm}
${precedentInfo}

Return a JSON object with this exact structure:
{
  "recommendedClass": "I" | "II" | "III",
  "classReasoning": "explanation of why this class",
  "ingredients": [
    {
      "properName": "NHPID proper name",
      "commonName": "common name",
      "scientificName": "Latin/scientific name",
      "monographName": "monograph name or null",
      "monographCovered": true/false,
      "doseRange": { "min": number, "max": number, "unit": "mg" },
      "suggestedDose": number,
      "animalDerived": true/false,
      "animalSource": "species/tissue if animal derived",
      "approvedClaims": ["exact monograph claim wording"],
      "reasoning": "why this ingredient"
    }
  ],
  "suggestedClaims": ["recommended claim wording from monographs"],
  "warnings": ["any regulatory concerns"],
  "precedentProducts": ["similar licensed product names/NPNs"]
}

Return ONLY valid JSON, no markdown.`;

  const response = await askClaude(SYSTEM_PROMPT, userMessage, { maxTokens: 4096, temperature: 0.2 });

  try {
    const cleaned = response.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleaned) as ResearchResult;
  } catch {
    throw new Error("AI returned invalid JSON. Please try again.");
  }
}
