import { askClaude } from "./claude";

const CONDITION_SYSTEM = `You are a health supplement product development strategist and NHP (Natural Health Product) formulation scientist.

You think CONDITION-FIRST: people buy supplements to solve health problems, not because they like molecules.
When analyzing a health condition, you consider:

1. WHAT molecules target this condition — ranked by scientific evidence strength
2. WHY certain combinations work — synergistic mechanisms, bioavailability, complementary pathways
3. WHAT the market offers — existing products, pricing, customer complaints
4. WHAT claims Health Canada allows — exact monograph wording for this condition
5. WHERE the gaps are — what combinations the market DOESN'T have yet

You know:
- NNHPD monographs (exact claim wording, dose ranges, quality specs)
- NHPID (proper names, CAS numbers, safety profiles)
- Supplement formulation science (bioavailability enhancers, cofactors, stability)
- Canadian supplement market (pricing tiers, consumer demographics, retail channels)
- Amazon supplement landscape (bestsellers, review patterns, complaint themes)

When suggesting molecule combinations, classify each supporting molecule's ROLE:
- bioavailability_enhancer: increases absorption of the primary (e.g., Piperine + Curcumin)
- synergistic_pair: same condition, different mechanism (e.g., EPA + DHA)
- cofactor: required for the primary to metabolize (e.g., B6 + Zinc)
- complementary: broadens the health benefit (e.g., D3 + K2)
- stability_partner: prevents degradation (e.g., Vitamin C + Vitamin E)
- differentiator: unique addition competitors lack

Always respond in valid JSON. Be specific — cite dose ranges, monograph names, and scientific mechanisms.`;

export interface ConditionResearchResult {
  condition: string;
  conditionDescription: string;
  marketSize: string;
  growthRate: string;
  consumerProfile: string;
  topMolecules: Array<{
    name: string;
    properName: string;
    evidenceStrength: string;
    primaryMechanism: string;
    monographName: string | null;
    typicalDoseRange: { min: number; max: number; unit: string };
    popularity: string;
  }>;
  allowedClaims: Array<{
    claimText: string;
    monographSource: string;
    requiresIngredient: string;
  }>;
  consumerPainPoints: string[];
  marketGaps: string[];
  regulatoryNotes: string;
}

export interface CombinationDiscoveryResult {
  primaryMolecule: string;
  condition: string;
  stacks: Array<{
    stackName: string;
    molecules: Array<{
      name: string;
      dose: number;
      unit: string;
      role: string;
      synergyReason: string;
      monographName: string | null;
      monographCovered: boolean;
    }>;
    applicationClass: string;
    monographCoverage: string;
    availableClaims: string[];
    marketPrevalence: string;
    avgRating: string;
    consumerPainPointsAddressed: string[];
    marketGap: string;
    scientificBasis: string;
    competitiveAdvantage: string;
    estimatedCostTier: string;
  }>;
  overallRecommendation: string;
}

export interface ConditionStackValidation {
  stackName: string;
  applicationClass: string;
  classReasoning: string;
  ingredientCompliance: Array<{
    name: string;
    monographName: string | null;
    covered: boolean;
    doseCompliant: boolean;
    compliantRange: { min: number; max: number; unit: string } | null;
    warnings: string[];
  }>;
  unlockedClaims: string[];
  missingForClassI: string[];
  interactions: string[];
  overallViability: string;
}

/**
 * Research a health condition: what molecules work, what the market looks like,
 * what claims are allowed, where the gaps are.
 */
export async function researchCondition(
  condition: string,
  conditionDetail: string = "",
  targetMarket: string = "Canada",
): Promise<ConditionResearchResult> {
  const prompt = `Research this health condition for supplement product development.

CONDITION: ${condition}
${conditionDetail ? `DETAIL: ${conditionDetail}` : ""}
TARGET MARKET: ${targetMarket}

Analyze this condition from a supplement product development perspective.
What molecules address it? What does the market look like? What claims can we make?

Return JSON:
{
  "condition": "${condition}",
  "conditionDescription": "what this condition means for consumers — in plain language",
  "marketSize": "estimated supplement market size for this condition in ${targetMarket}",
  "growthRate": "annual growth rate",
  "consumerProfile": "who buys supplements for this condition — demographics, motivations, buying behavior",
  "topMolecules": [
    {
      "name": "common name",
      "properName": "NHPID proper name",
      "evidenceStrength": "strong/moderate/emerging — based on clinical evidence",
      "primaryMechanism": "how this molecule addresses the condition — specific mechanism",
      "monographName": "Health Canada monograph name or null",
      "typicalDoseRange": {"min": 0, "max": 0, "unit": "mg"},
      "popularity": "how widely used in commercial products for this condition"
    }
  ],
  "allowedClaims": [
    {
      "claimText": "exact Health Canada approved claim wording",
      "monographSource": "which monograph this claim comes from",
      "requiresIngredient": "which ingredient unlocks this claim"
    }
  ],
  "consumerPainPoints": ["specific complaints from people buying supplements for this condition — from reviews, forums, surveys"],
  "marketGaps": ["specific opportunities — combinations nobody offers, dose ranges underserved, formats missing"],
  "regulatoryNotes": "key regulatory considerations for this condition category in Canada"
}

List at least 8-10 top molecules ranked by evidence strength.
List all available monograph claims for this condition.
Be specific about market gaps — generic observations are useless.

Return ONLY valid JSON.`;

  const response = await askClaude(CONDITION_SYSTEM, prompt, {
    maxTokens: 6000,
    temperature: 0.2,
  });

  try {
    return JSON.parse(response.replace(/```json\n?|\n?```/g, "").trim()) as ConditionResearchResult;
  } catch {
    throw new Error("AI returned invalid JSON for condition research.");
  }
}

/**
 * Find molecule combinations for a primary molecule targeting a specific condition.
 * This is the core "what goes with X for condition Y?" function.
 */
export async function discoverCombinations(
  primaryMolecule: string,
  primaryDose: number,
  primaryUnit: string,
  condition: string,
  conditionDetail: string = "",
): Promise<CombinationDiscoveryResult> {
  const prompt = `Find all relevant molecule combinations for this primary ingredient targeting a specific health condition.

PRIMARY MOLECULE: ${primaryMolecule} (${primaryDose} ${primaryUnit})
TARGET CONDITION: ${condition}
${conditionDetail ? `CONDITION DETAIL: ${conditionDetail}` : ""}

Think like a formulation scientist AND a market strategist:
- What molecules are COMBINED with ${primaryMolecule} in real products on the market?
- What combinations have SCIENTIFIC support for ${condition}?
- What combinations are MISSING from the market (competitive gap)?
- What combinations enable Class I filing (monograph-covered)?

For each combination, classify every supporting molecule's ROLE:
- bioavailability_enhancer, synergistic_pair, cofactor, complementary, stability_partner, differentiator

Return JSON:
{
  "primaryMolecule": "${primaryMolecule}",
  "condition": "${condition}",
  "stacks": [
    {
      "stackName": "descriptive name for this combination (e.g., 'Adaptogen Calm Trio')",
      "molecules": [
        {
          "name": "molecule name (include ${primaryMolecule} as first entry)",
          "dose": 0,
          "unit": "mg",
          "role": "primary | bioavailability_enhancer | synergistic_pair | cofactor | complementary | stability_partner | differentiator",
          "synergyReason": "specific scientific reason this molecule enhances the stack for ${condition}",
          "monographName": "Health Canada monograph name or null",
          "monographCovered": true
        }
      ],
      "applicationClass": "I or II or III — determined by the ingredient with LEAST monograph coverage",
      "monographCoverage": "full (all covered) | partial (some covered) | none",
      "availableClaims": ["exact approved claim wording this combination unlocks"],
      "marketPrevalence": "approx how many products use this combo (e.g., '500+ products')",
      "avgRating": "average customer rating for products with this combo",
      "consumerPainPointsAddressed": ["which consumer complaints this combo solves"],
      "marketGap": "what's missing — why our version would be different/better",
      "scientificBasis": "the mechanism of synergy — why these molecules work TOGETHER, not just individually",
      "competitiveAdvantage": "why this stack would win against existing products",
      "estimatedCostTier": "budget ($15-20) | mid ($25-35) | premium ($40+) per bottle"
    }
  ],
  "overallRecommendation": "which stack is the best opportunity and why — one clear recommendation"
}

Generate at least 4-6 distinct stacks, ordered from most recommended to least.
Include at least one "market gap" stack that doesn't widely exist yet.
Always include a "Class I optimized" stack (all monograph-covered ingredients).

Return ONLY valid JSON.`;

  const response = await askClaude(CONDITION_SYSTEM, prompt, {
    maxTokens: 8000,
    temperature: 0.2,
  });

  try {
    return JSON.parse(response.replace(/```json\n?|\n?```/g, "").trim()) as CombinationDiscoveryResult;
  } catch {
    throw new Error("AI returned invalid JSON for combination discovery.");
  }
}

/**
 * Validate a specific molecule stack for regulatory compliance and market viability.
 */
export async function validateConditionStack(
  stackName: string,
  molecules: Array<{ name: string; dose: number; unit: string }>,
  condition: string,
): Promise<ConditionStackValidation> {
  const moleculeList = molecules
    .map((m) => `- ${m.name}: ${m.dose} ${m.unit}`)
    .join("\n");

  const prompt = `Validate this supplement formulation stack for Health Canada NHP compliance and market viability.

STACK: ${stackName}
TARGET CONDITION: ${condition}

MOLECULES:
${moleculeList}

Check each ingredient against NNHPD monographs. Determine the overall application class.
Identify which health claims this specific combination unlocks.
Flag any ingredient interactions or regulatory issues.

Return JSON:
{
  "stackName": "${stackName}",
  "applicationClass": "I or II or III",
  "classReasoning": "which ingredient drives the class and why",
  "ingredientCompliance": [
    {
      "name": "ingredient name",
      "monographName": "covering monograph or null",
      "covered": true,
      "doseCompliant": true,
      "compliantRange": {"min": 0, "max": 0, "unit": "mg"},
      "warnings": ["monograph cautions, contraindications"]
    }
  ],
  "unlockedClaims": ["exact approved claim wording this combo enables for ${condition}"],
  "missingForClassI": ["what would need to change to make this Class I — empty if already Class I"],
  "interactions": ["known interactions between these specific ingredients"],
  "overallViability": "assessment: strong/moderate/weak — with reasoning"
}

Return ONLY valid JSON.`;

  const response = await askClaude(CONDITION_SYSTEM, prompt, {
    maxTokens: 4096,
    temperature: 0.2,
  });

  try {
    return JSON.parse(response.replace(/```json\n?|\n?```/g, "").trim()) as ConditionStackValidation;
  } catch {
    throw new Error("AI returned invalid JSON for stack validation.");
  }
}
