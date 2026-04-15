import { askClaude } from "./claude";

const EXTRACTOR_SYSTEM = `You are an expert at extracting structured NHP (Natural Health Product) application data from research documents, formulation briefs, supplier materials, and regulatory correspondence.

You extract:
- Product identity (name, brand, dosage form, route of administration)
- Product concept and target health condition
- Medicinal ingredients with doses, sources, and monograph references
- Non-medicinal ingredients with purposes
- Health claims (English and French if available)
- Dosage groups with population, dose, frequency, directions
- Risk information (cautions, warnings, contraindications, adverse reactions)
- Application class recommendation based on ingredients and claims

Be precise. Never fabricate data. If something cannot be determined from the document, use null.
Always respond in valid JSON.`;

export interface ExtractedApplicationData {
  productName: string | null;
  brandName: string | null;
  dosageForm: string | null;
  routeOfAdmin: string | null;
  productConcept: string | null;
  applicationClass: string | null;
  classReasoning: string | null;
  medicinalIngredients: Array<{
    nhpidName: string;
    properName: string;
    commonName: string;
    scientificName: string;
    quantity: number;
    quantityUnit: string;
    sourceMaterial: string;
    standardization: string;
    monographName: string;
  }>;
  nonMedicinalIngredients: Array<{
    ingredientName: string;
    purpose: string;
  }>;
  claims: Array<{
    claimTextEn: string;
    claimTextFr: string;
    fromMonograph: boolean;
    monographName: string;
  }>;
  dosageGroups: Array<{
    population: string;
    minDose: number;
    maxDose: number;
    doseUnit: string;
    frequency: string;
    directions: string;
  }>;
  riskInfos: Array<{
    riskType: string;
    textEn: string;
    textFr: string;
    fromMonograph: boolean;
  }>;
  warnings: string[];
  confidence: number;
}

/**
 * Extract PLA application data from a research document, formulation brief,
 * or any document containing product development information.
 */
export async function extractApplicationData(
  textContent: string,
  fileName: string,
): Promise<ExtractedApplicationData> {
  const prompt = `Extract ALL product application data from this document. This could be a research brief, formulation document, regulatory correspondence, or supplier material.

File: ${fileName}

Document content:
${textContent.slice(0, 15000)}

Extract everything relevant to creating a Health Canada NPN application.

Return JSON:
{
  "productName": "product name or null",
  "brandName": "brand name or null",
  "dosageForm": "Capsule/Tablet/Softgel/Liquid/Powder/etc or null",
  "routeOfAdmin": "Oral/Topical/Sublingual/etc or null",
  "productConcept": "description of what this product does — summarize from the document",
  "applicationClass": "I or II or III or null — based on ingredients and claims",
  "classReasoning": "why this class — which ingredients or claims drive the classification",
  "medicinalIngredients": [
    {
      "nhpidName": "NHPID name if identifiable",
      "properName": "proper name",
      "commonName": "common name",
      "scientificName": "Latin/scientific name",
      "quantity": 0,
      "quantityUnit": "mg",
      "sourceMaterial": "source if mentioned",
      "standardization": "standardization if mentioned",
      "monographName": "covering monograph name or empty"
    }
  ],
  "nonMedicinalIngredients": [
    {"ingredientName": "name", "purpose": "purpose/function"}
  ],
  "claims": [
    {
      "claimTextEn": "health claim in English",
      "claimTextFr": "claim in French if available, otherwise empty",
      "fromMonograph": true,
      "monographName": "source monograph or empty"
    }
  ],
  "dosageGroups": [
    {
      "population": "Adults/Children/etc",
      "minDose": 1,
      "maxDose": 2,
      "doseUnit": "capsule(s)",
      "frequency": "daily",
      "directions": "Take with food"
    }
  ],
  "riskInfos": [
    {
      "riskType": "caution or warning or contraindication or adverse_reaction",
      "textEn": "risk text in English",
      "textFr": "risk text in French if available",
      "fromMonograph": true
    }
  ],
  "warnings": ["any extraction warnings or notes about data quality"],
  "confidence": 0.85
}

Extract as much as possible. Use null for fields you cannot determine.
For ingredients, extract ALL mentioned — even if quantities are not specified.
For claims, extract both explicit claims AND implied health benefits.

Return ONLY valid JSON.`;

  const response = await askClaude(EXTRACTOR_SYSTEM, prompt, {
    maxTokens: 8000,
    temperature: 0.1,
  });

  try {
    const cleaned = response.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleaned) as ExtractedApplicationData;
  } catch {
    throw new Error("AI could not extract application data from this document. The document may not contain relevant NHP product information.");
  }
}
