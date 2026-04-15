/**
 * Master prompt templates for product research.
 * Each template uses {{placeholders}} that get filled with product data.
 * Users can customize these in Settings.
 */

export interface ResearchPromptTemplate {
  key: string;
  label: string;
  desc: string;
  icon: string; // short emoji-style label
  template: string;
}

export const DEFAULT_RESEARCH_PROMPTS: ResearchPromptTemplate[] = [
  {
    key: "ingredient_research",
    label: "Ingredient Research",
    desc: "Find best ingredients, doses, and monograph coverage for this product concept",
    icon: "🧪",
    template: `You are a regulatory scientist specializing in Health Canada Natural Health Products (NHP).

PRODUCT: {{productName}}
BRAND: {{brandName}}
CONCEPT: {{productConcept}}
DOSAGE FORM: {{dosageForm}}
ROUTE: {{routeOfAdmin}}
CURRENT STAGE: {{stage}}

TASK: Research the best medicinal ingredients for this product concept.

For each recommended ingredient, provide:
1. Proper Name (English) and Scientific Name
2. Recommended dose range (mg) with references
3. Health Canada NHP Monograph name (if covered)
4. Application class this ingredient supports (I, II, or III)
5. Key safety considerations
6. Source material and extract type (if applicable)
7. Approved health claims under the monograph

Also recommend:
- Non-medicinal ingredients (excipients) suitable for the dosage form
- Suggested product class (I, II, or III) with reasoning
- 3-5 approved health claims that match this formulation

FORMAT: Return your response as structured JSON:
{
  "recommendedClass": "I|II|III",
  "classReasoning": "...",
  "ingredients": [
    { "properName": "", "scientificName": "", "doseMin": 0, "doseMax": 0, "unit": "mg", "monographName": "", "monographCovered": true, "safetyNotes": "", "sourceMaterial": "", "approvedClaims": [""] }
  ],
  "nonMedicinalIngredients": [""],
  "suggestedClaims": [""],
  "warnings": [""],
  "references": [""]
}`,
  },
  {
    key: "competitor_analysis",
    label: "Competitor Analysis",
    desc: "Analyze competing products on Amazon, retail, and Health Canada database",
    icon: "🏪",
    template: `You are a market research analyst specializing in the Canadian natural health product (NHP) market.

PRODUCT: {{productName}}
CONCEPT: {{productConcept}}
DOSAGE FORM: {{dosageForm}}

TASK: Conduct a competitive analysis for this product concept.

Research and provide:
1. TOP 10 COMPETING PRODUCTS currently sold in Canada (Amazon.ca, retail, health stores)
   - Product name, brand, NPN (if available), price range
   - Key ingredients and doses
   - Health claims on label
   - Customer rating and review summary
   - Strengths and weaknesses

2. MARKET POSITIONING
   - What gap does our product fill?
   - Pricing recommendation
   - Differentiation strategy

3. REGULATORY COMPARISON
   - Which competitors have Health Canada NPNs?
   - What claims are they making?
   - Any compliance concerns in the market?

FORMAT: Return as structured JSON:
{
  "competitors": [
    { "name": "", "brand": "", "npn": "", "price": "", "ingredients": "", "claims": [""], "rating": "", "strengths": [""], "weaknesses": [""] }
  ],
  "marketGap": "",
  "pricingRecommendation": "",
  "differentiationStrategy": "",
  "regulatoryNotes": ""
}`,
  },
  {
    key: "market_analysis",
    label: "Market Analysis",
    desc: "Market size, trends, growth opportunities, and target demographics",
    icon: "📊",
    template: `You are a market intelligence analyst for the natural health product industry.

PRODUCT: {{productName}}
CONCEPT: {{productConcept}}
DOSAGE FORM: {{dosageForm}}
TARGET MARKET: {{targetMarket}}

TASK: Provide a comprehensive market analysis.

Cover:
1. MARKET SIZE — Canadian NHP market for this category, growth rate, forecast
2. TARGET DEMOGRAPHICS — Age, gender, health-conscious segments, buying behavior
3. DISTRIBUTION CHANNELS — Amazon, health stores, pharmacies, DTC, subscription
4. TRENDS — What's trending in this category? Clean label, organic, vegan, etc.
5. PRICING ANALYSIS — What consumers pay for similar products, price sensitivity
6. GROWTH OPPORTUNITIES — Underserved segments, emerging needs, seasonal patterns
7. BARRIERS TO ENTRY — Competition density, brand loyalty, regulatory complexity

FORMAT: Return as structured JSON:
{
  "marketSize": { "canada": "", "global": "", "growthRate": "", "forecast": "" },
  "targetDemographics": [""],
  "distributionChannels": [""],
  "trends": [""],
  "pricingAnalysis": { "low": "", "mid": "", "premium": "" },
  "opportunities": [""],
  "barriers": [""]
}`,
  },
  {
    key: "regulatory_gap",
    label: "Regulatory Gap Analysis",
    desc: "What's missing before this product can be submitted to Health Canada",
    icon: "📋",
    template: `You are a Health Canada NHP regulatory affairs consultant.

PRODUCT: {{productName}}
CONCEPT: {{productConcept}}
DOSAGE FORM: {{dosageForm}}
ROUTE: {{routeOfAdmin}}
CURRENT STAGE: {{stage}}

TASK: Identify all regulatory gaps that must be addressed before filing a Product Licence Application (PLA) with Health Canada's NNHPD.

Check against:
1. Natural Health Products Regulations (SOR/2003-196)
2. Evidence for Quality of Natural Health Products guidance
3. Evidence for Safety and Efficacy guidance
4. NHPID monograph requirements
5. GMP (Good Manufacturing Practices) requirements
6. Labelling requirements (bilingual EN/FR)

For each gap found, provide:
- What's missing
- Why it's required (cite the regulation)
- What to do to fix it
- Priority (critical/high/medium/low)
- Estimated effort

FORMAT: Return as structured JSON:
{
  "overallReadiness": "0-100%",
  "gaps": [
    { "area": "", "description": "", "regulation": "", "fix": "", "priority": "", "effort": "" }
  ],
  "recommendedClass": "I|II|III",
  "nextSteps": [""]
}`,
  },
  {
    key: "monograph_compliance",
    label: "Monograph Compliance",
    desc: "Check ingredients against NHPID monographs for Class I/II eligibility",
    icon: "📖",
    template: `You are a Health Canada NHP monograph specialist.

PRODUCT: {{productName}}
CONCEPT: {{productConcept}}

TASK: Check this product concept against all relevant Health Canada NHP Monographs.

For each ingredient identified:
1. Which monograph covers it (if any)?
2. Is the proposed dose within monograph range?
3. Are the proposed claims monograph-approved?
4. What are the monograph-required cautions/warnings?
5. Does the source material match monograph specifications?

Determine:
- Is this a Class I product (single monograph, all ingredients covered)?
- Is this Class II (multiple monographs or traditional evidence)?
- Is this Class III (non-compendial, requires full evidence)?

FORMAT: Return as structured JSON:
{
  "productClass": "I|II|III",
  "classReasoning": "",
  "ingredientCompliance": [
    { "ingredient": "", "monograph": "", "doseCompliant": true, "claimsCompliant": true, "notes": "" }
  ],
  "requiredCautions": [""],
  "requiredWarnings": [""],
  "overallCompliance": "compliant|partial|non_compliant"
}`,
  },
  {
    key: "formulation_suggestion",
    label: "Formulation Suggestion",
    desc: "AI-recommended complete formulation with doses, excipients, and rationale",
    icon: "⚗️",
    template: `You are a natural health product formulation scientist.

PRODUCT: {{productName}}
CONCEPT: {{productConcept}}
DOSAGE FORM: {{dosageForm}}
ROUTE: {{routeOfAdmin}}

TASK: Design a complete product formulation.

Provide:
1. MEDICINAL INGREDIENTS — each with exact dose, unit, source, extract ratio
2. NON-MEDICINAL INGREDIENTS — excipients, flow agents, capsule shell, coatings
3. FORMULATION RATIONALE — why these ingredients at these doses
4. STABILITY CONSIDERATIONS — shelf life estimate, storage conditions
5. MANUFACTURING NOTES — any special processing requirements
6. COST ESTIMATE — ingredient cost per unit (approximate)

FORMAT: Return as structured JSON:
{
  "medicinalIngredients": [
    { "name": "", "dose": 0, "unit": "mg", "source": "", "extractRatio": "", "standardization": "", "rationale": "" }
  ],
  "nonMedicinalIngredients": [
    { "name": "", "purpose": "", "amount": "" }
  ],
  "totalCapsuleWeight": "",
  "shelfLife": "",
  "storageConditions": "",
  "manufacturingNotes": [""],
  "estimatedCostPerUnit": ""
}`,
  },
  {
    key: "dosage_recommendation",
    label: "Dosage Recommendation",
    desc: "Optimal dose ranges by population, frequency, and duration",
    icon: "💊",
    template: `You are a clinical pharmacologist specializing in natural health product dosing.

PRODUCT: {{productName}}
CONCEPT: {{productConcept}}

TASK: Provide dosage recommendations for all relevant populations.

For each population group:
1. Recommended dose (min-max range)
2. Frequency (times per day)
3. Duration of use
4. With or without food
5. Special directions
6. Evidence basis for the dose

Populations to cover: Adults, Seniors (65+), Adolescents (13-18), Children if applicable.

FORMAT: Return as structured JSON:
{
  "dosageGroups": [
    { "population": "", "ageRange": "", "doseMin": 0, "doseMax": 0, "unit": "mg", "frequency": "", "duration": "", "withFood": true, "directions": "", "evidence": "" }
  ],
  "contraindicatedPopulations": [""],
  "drugInteractions": [""]
}`,
  },
  {
    key: "condition_research",
    label: "Condition Research",
    desc: "Deep dive on the target health condition, mechanisms, and evidence",
    icon: "🔬",
    template: `You are a clinical researcher specializing in natural health interventions.

PRODUCT: {{productName}}
CONCEPT: {{productConcept}}

TASK: Provide a comprehensive research summary on the target health condition(s) this product addresses.

Cover:
1. CONDITION OVERVIEW — prevalence, demographics, pathophysiology
2. CURRENT TREATMENT LANDSCAPE — conventional and natural approaches
3. MECHANISM OF ACTION — how the proposed ingredients address the condition
4. CLINICAL EVIDENCE — key studies supporting efficacy (cite authors, year, journal)
5. SAFETY PROFILE — known risks, contraindications, drug interactions
6. REGULATORY PRECEDENT — similar products approved by Health Canada (NPN numbers)
7. MARKET DEMAND — consumer search trends, awareness levels

FORMAT: Return as structured JSON:
{
  "conditions": [""],
  "prevalence": "",
  "mechanismOfAction": "",
  "clinicalEvidence": [
    { "study": "", "authors": "", "year": "", "findings": "", "relevance": "" }
  ],
  "safetyProfile": { "risks": [""], "contraindications": [""], "interactions": [""] },
  "regulatoryPrecedent": [
    { "productName": "", "npn": "", "ingredients": "", "claims": [""] }
  ],
  "marketDemand": ""
}`,
  },
  {
    key: "combination_discovery",
    label: "Combination Discovery",
    desc: "Find synergistic ingredient combinations for enhanced efficacy",
    icon: "🧬",
    template: `You are a nutraceutical formulation scientist with expertise in ingredient synergies.

PRODUCT: {{productName}}
CONCEPT: {{productConcept}}

TASK: Identify synergistic ingredient combinations that could enhance this product's efficacy.

For each combination:
1. Ingredients involved and their doses
2. Mechanism of synergy (how they work together)
3. Clinical evidence for the combination
4. Any antagonistic interactions to avoid
5. Regulatory considerations (monograph coverage)

FORMAT: Return as structured JSON:
{
  "synergies": [
    { "ingredients": [""], "mechanism": "", "evidence": "", "doses": "", "monographCoverage": "" }
  ],
  "antagonisms": [
    { "ingredients": [""], "reason": "", "avoidance": "" }
  ],
  "recommendedStack": { "primary": [""], "supportive": [""], "rationale": "" }
}`,
  },
];

/** Fill template placeholders with product data */
export function fillPromptTemplate(template: string, product: Record<string, string>): string {
  return template
    .replace(/\{\{productName\}\}/g, product.productName || product.name || "")
    .replace(/\{\{brandName\}\}/g, product.brandName || "")
    .replace(/\{\{productConcept\}\}/g, product.productConcept || "")
    .replace(/\{\{dosageForm\}\}/g, product.dosageForm || "")
    .replace(/\{\{routeOfAdmin\}\}/g, product.routeOfAdmin || "")
    .replace(/\{\{stage\}\}/g, product.stage || "")
    .replace(/\{\{targetMarket\}\}/g, product.targetMarket || "Canada");
}
