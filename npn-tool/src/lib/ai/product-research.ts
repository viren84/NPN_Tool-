import { askClaude } from "./claude";

const NHP_RESEARCH_SYSTEM = `You are a Health Canada Natural Health Product (NHP) regulatory expert and supplement formulation scientist.

You have deep knowledge of:
- NNHPD monographs: exact claim wording, dose ranges, quality specifications
- NHPID (Natural Health Products Ingredients Database): proper names, CAS numbers, safety data
- LNHPD (Licensed Natural Health Products Database): approved products, precedents
- NHP Regulations (NHPR): application classes I/II/III, submission requirements
- Health Canada review timelines and common deficiency letter issues
- Supplement formulation science: bioavailability, stability, ingredient interactions
- Canadian supplement market: pricing, trends, consumer preferences

Always respond in valid JSON. Be specific and actionable — cite monograph names, dose ranges, and exact regulatory requirements when possible.`;

export interface MarketAnalysis {
  marketSize: string;
  growthRate: string;
  trends: string[];
  topCompetitors: Array<{ name: string; estimatedShare: string; keyProducts: string[] }>;
  consumerDemographics: string;
  pricingTiers: Array<{ tier: string; priceRange: string; characteristics: string }>;
  distributionChannels: string[];
  regulatoryLandscape: string;
  opportunities: string[];
  threats: string[];
  recommendedPositioning: string;
}

export interface MonographCompliance {
  overallClass: string;
  classReasoning: string;
  ingredients: Array<{
    name: string;
    monographName: string | null;
    monographCovered: boolean;
    compliantDoseRange: { min: number; max: number; unit: string } | null;
    currentDose: number;
    doseCompliant: boolean;
    requiredSpecs: string[];
    warnings: string[];
    claimsAvailable: string[];
  }>;
  overallWarnings: string[];
  missingRequirements: string[];
}

export interface RegulatoryGapAnalysis {
  overallReadiness: string;
  readinessScore: number;
  recommendedClass: string;
  missingDocuments: string[];
  incompleteIngredients: string[];
  claimComplianceIssues: string[];
  estimatedReviewTimeline: string;
  criticalGaps: string[];
  recommendations: string[];
}

export interface FormulationSuggestion {
  recommendedIngredients: Array<{
    name: string;
    properName: string;
    suggestedDose: number;
    unit: string;
    monographName: string | null;
    reasoning: string;
    competitiveAdvantage: string;
  }>;
  dosageFormRecommendation: string;
  servingSizeRecommendation: string;
  targetClaims: string[];
  formulationNotes: string[];
  stabilityConsiderations: string[];
  costConsiderations: string;
}

export interface DosageSuggestion {
  populations: Array<{
    population: string;
    ageRange: string;
    dose: number;
    unit: string;
    frequency: string;
    directions: string;
    withFood: boolean;
    monographBasis: string;
  }>;
  contraindicatedPopulations: string[];
  interactionWarnings: string[];
  generalDirections: string;
}

/**
 * Analyze the supplement market for a product category.
 */
export async function analyzeMarket(
  productName: string,
  concept: string,
  dosageForm: string,
  targetMarket: string,
): Promise<MarketAnalysis> {
  const prompt = `Analyze the supplement market for this product category.

Product: ${productName}
Concept: ${concept}
Dosage Form: ${dosageForm}
Target Market: ${targetMarket || "Canada"}

Return JSON:
{
  "marketSize": "estimated market size for this category in target market",
  "growthRate": "estimated annual growth rate",
  "trends": ["current market trends relevant to this product"],
  "topCompetitors": [{"name": "brand", "estimatedShare": "market share", "keyProducts": ["product names"]}],
  "consumerDemographics": "who buys this type of product — age, gender, health motivations",
  "pricingTiers": [{"tier": "budget/mid/premium", "priceRange": "$X-$Y per bottle", "characteristics": "what defines this tier"}],
  "distributionChannels": ["where these products sell — online, retail, pharmacy, etc."],
  "regulatoryLandscape": "Canadian NHP regulations for this category — monograph availability, common submission class",
  "opportunities": ["specific market gaps or underserved segments"],
  "threats": ["competitive or regulatory threats"],
  "recommendedPositioning": "specific positioning recommendation for our product"
}

Return ONLY valid JSON.`;

  const response = await askClaude(NHP_RESEARCH_SYSTEM, prompt, { maxTokens: 4096, temperature: 0.2 });

  try {
    return JSON.parse(response.replace(/```json\n?|\n?```/g, "").trim()) as MarketAnalysis;
  } catch {
    throw new Error("AI returned invalid JSON for market analysis.");
  }
}

/**
 * Check ingredient specs against NNHPD monographs.
 */
export async function checkMonographCompliance(
  ingredients: Array<{ ingredientName: string; targetDose: number; targetUnit: string; standardization?: string }>,
): Promise<MonographCompliance> {
  const ingredientList = ingredients
    .map((i, idx) => `${idx + 1}. ${i.ingredientName} — ${i.targetDose} ${i.targetUnit}${i.standardization ? ` (${i.standardization})` : ""}`)
    .join("\n");

  const prompt = `Check these ingredients against Health Canada NNHPD monographs.

Ingredients:
${ingredientList}

For EACH ingredient, determine:
1. Which monograph covers it (if any)
2. Whether the proposed dose is within the monograph's acceptable range
3. Required quality specifications
4. Available approved claims
5. Any warnings or restrictions

Return JSON:
{
  "overallClass": "I or II or III",
  "classReasoning": "why this class — which ingredients drive the classification",
  "ingredients": [
    {
      "name": "ingredient name",
      "monographName": "exact monograph name or null if not covered",
      "monographCovered": true/false,
      "compliantDoseRange": {"min": 0, "max": 0, "unit": "mg"} or null,
      "currentDose": 0,
      "doseCompliant": true/false,
      "requiredSpecs": ["identity test", "purity test", etc.],
      "warnings": ["any cautions, contraindications from monograph"],
      "claimsAvailable": ["exact monograph claim wording"]
    }
  ],
  "overallWarnings": ["cross-ingredient warnings or regulatory flags"],
  "missingRequirements": ["anything missing for a complete application"]
}

Return ONLY valid JSON.`;

  const response = await askClaude(NHP_RESEARCH_SYSTEM, prompt, { maxTokens: 4096, temperature: 0.2 });

  try {
    return JSON.parse(response.replace(/```json\n?|\n?```/g, "").trim()) as MonographCompliance;
  } catch {
    throw new Error("AI returned invalid JSON for monograph compliance check.");
  }
}

/**
 * Analyze regulatory gaps for filing readiness.
 */
export async function analyzeRegulatoryGaps(
  product: { name: string; applicationClass: string; dosageForm: string; stage: string },
  documentCount: number,
  ingredientCount: number,
  competitorCount: number,
): Promise<RegulatoryGapAnalysis> {
  const prompt = `Assess PLA filing readiness for this NHP product.

Product: ${product.name}
Current Stage: ${product.stage}
Application Class: ${product.applicationClass || "Not determined"}
Dosage Form: ${product.dosageForm || "Not set"}
Documents Uploaded: ${documentCount}
Ingredients Specified: ${ingredientCount}
Competitors Analyzed: ${competitorCount}

Based on Health Canada NHP submission requirements for a Class ${product.applicationClass || "I/II"} application, identify gaps.

Return JSON:
{
  "overallReadiness": "not_ready / partially_ready / ready",
  "readinessScore": 0-100,
  "recommendedClass": "I or II or III",
  "missingDocuments": ["list required documents that appear to be missing"],
  "incompleteIngredients": ["ingredient-related gaps"],
  "claimComplianceIssues": ["potential claim issues"],
  "estimatedReviewTimeline": "estimated HC review time for this class",
  "criticalGaps": ["must-fix items before filing"],
  "recommendations": ["ordered list of next steps"]
}

Return ONLY valid JSON.`;

  const response = await askClaude(NHP_RESEARCH_SYSTEM, prompt, { maxTokens: 3000, temperature: 0.2 });

  try {
    return JSON.parse(response.replace(/```json\n?|\n?```/g, "").trim()) as RegulatoryGapAnalysis;
  } catch {
    throw new Error("AI returned invalid JSON for regulatory gap analysis.");
  }
}

/**
 * Suggest formulation based on product concept and competitive landscape.
 */
export async function suggestFormulation(
  concept: string,
  competitorGaps: string[],
  targetClaims: string[],
): Promise<FormulationSuggestion> {
  const gapsText = competitorGaps.length > 0
    ? `\nCompetitor gaps identified:\n${competitorGaps.map((g, i) => `${i + 1}. ${g}`).join("\n")}`
    : "";
  const claimsText = targetClaims.length > 0
    ? `\nTarget claims:\n${targetClaims.map((c, i) => `${i + 1}. ${c}`).join("\n")}`
    : "";

  const prompt = `Suggest a formulation for this NHP product concept.

Product Concept: ${concept}
${gapsText}
${claimsText}

Recommend specific ingredients with doses that:
1. Are covered by NNHPD monographs (prefer Class I/II pathway)
2. Address the competitive gaps identified
3. Support the target health claims
4. Are commercially viable and available from standard suppliers

Return JSON:
{
  "recommendedIngredients": [
    {
      "name": "common name",
      "properName": "NHPID proper name",
      "suggestedDose": 0,
      "unit": "mg",
      "monographName": "covering monograph or null",
      "reasoning": "why this ingredient and dose",
      "competitiveAdvantage": "how this differentiates from competitors"
    }
  ],
  "dosageFormRecommendation": "recommended dosage form with reasoning",
  "servingSizeRecommendation": "recommended serving size",
  "targetClaims": ["recommended approved claim wording"],
  "formulationNotes": ["formulation considerations — stability, interactions, bioavailability"],
  "stabilityConsiderations": ["shelf life, storage, packaging recommendations"],
  "costConsiderations": "rough cost-of-goods analysis"
}

Return ONLY valid JSON.`;

  const response = await askClaude(NHP_RESEARCH_SYSTEM, prompt, { maxTokens: 4096, temperature: 0.2 });

  try {
    return JSON.parse(response.replace(/```json\n?|\n?```/g, "").trim()) as FormulationSuggestion;
  } catch {
    throw new Error("AI returned invalid JSON for formulation suggestion.");
  }
}

/**
 * Suggest dosage regimen based on ingredients and dosage form.
 */
export async function suggestDosage(
  ingredients: Array<{ ingredientName: string; targetDose: number; targetUnit: string }>,
  dosageForm: string,
  targetPopulation: string,
): Promise<DosageSuggestion> {
  const ingredientList = ingredients
    .map((i) => `- ${i.ingredientName}: ${i.targetDose} ${i.targetUnit}`)
    .join("\n");

  const prompt = `Suggest a dosage regimen for this NHP product.

Dosage Form: ${dosageForm || "Capsule"}
Target Population: ${targetPopulation || "Adults (18+)"}

Ingredients per serving:
${ingredientList}

Based on NNHPD monograph dose ranges and standard NHP practice, recommend:

Return JSON:
{
  "populations": [
    {
      "population": "Adults",
      "ageRange": "18 years and older",
      "dose": 1,
      "unit": "capsule(s)",
      "frequency": "once daily",
      "directions": "Take 1 capsule daily with food",
      "withFood": true,
      "monographBasis": "per XYZ monograph recommended dose"
    }
  ],
  "contraindicatedPopulations": ["populations who should not take this"],
  "interactionWarnings": ["known drug or supplement interactions"],
  "generalDirections": "general usage directions"
}

Return ONLY valid JSON.`;

  const response = await askClaude(NHP_RESEARCH_SYSTEM, prompt, { maxTokens: 3000, temperature: 0.2 });

  try {
    return JSON.parse(response.replace(/```json\n?|\n?```/g, "").trim()) as DosageSuggestion;
  } catch {
    throw new Error("AI returned invalid JSON for dosage suggestion.");
  }
}
