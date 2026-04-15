import { askClaude } from "./claude";

const COMPETITOR_SYSTEM = `You are a health supplement market intelligence analyst specializing in the Canadian NHP (Natural Health Product) and US dietary supplement markets.

You analyze competitor products from Amazon listings, supplement brand websites, and retail listings.
You understand supplement facts panels, health claims (both Canadian NHP and US FDA regulations), pricing strategy, consumer sentiment, and competitive positioning.

Always respond in valid JSON. Never fabricate data — if information cannot be determined from the provided content, use null.
Be specific and actionable in your analysis — vague observations are not useful.`;

export interface CompetitorAnalysis {
  productName: string;
  brand: string;
  company: string | null;
  companyWebsite: string | null;
  price: string;
  pricePerServing: string | null;
  dosageForm: string;
  servingSize: string;
  servingsPerContainer: string;
  ingredients: Array<{ name: string; amount: string; unit: string; type: string }>;
  claims: string[];
  certifications: string[];
  reviewAnalysis: {
    avgRating: number | null;
    totalReviews: number | null;
    topComplaints: string[];
    topPraises: string[];
    sideEffectsReported: string[];
    efficacyComments: string;
  };
  marketingStrategy: string;
  socialPresence: string;
  competitiveStrengths: string[];
  competitiveWeaknesses: string[];
  opportunitiesForUs: string[];
  nhpComplianceNotes: string;
}

export interface CompetitorComparison {
  marketPosition: string;
  pricingStrategy: string;
  differentiators: string[];
  ingredientGaps: string[];
  ingredientAdvantages: string[];
  claimStrategy: string[];
  consumerPainPoints: string[];
  formulationRecommendations: string[];
  riskFactors: string[];
  goToMarketSuggestions: string[];
}

/**
 * Analyze a competitor product from pasted Amazon/website content.
 */
export async function analyzeCompetitorProduct(
  content: string,
  sourceType: string = "amazon",
): Promise<CompetitorAnalysis> {
  const sourceLabel = sourceType === "amazon" ? "Amazon supplement product listing"
    : sourceType === "website" ? "supplement brand website product page"
    : "retail supplement product listing";

  const prompt = `Analyze this ${sourceLabel}. Extract every detail you can find.

Product Page Content:
${content.slice(0, 12000)}

Extract and analyze into this JSON structure:
{
  "productName": "exact product name",
  "brand": "brand name",
  "company": "parent company if visible, or null",
  "companyWebsite": "company URL if visible, or null",
  "price": "current price as shown (e.g. '$29.99')",
  "pricePerServing": "calculated price per serving, or null",
  "dosageForm": "capsule/tablet/softgel/powder/liquid/gummy/etc",
  "servingSize": "e.g. '2 capsules'",
  "servingsPerContainer": "e.g. '60'",
  "ingredients": [{"name": "ingredient name", "amount": "quantity", "unit": "mg/mcg/IU/etc", "type": "medicinal or non_medicinal"}],
  "claims": ["each health/marketing claim on the listing"],
  "certifications": ["e.g. organic, non-gmo, gmp, third-party tested, etc."],
  "reviewAnalysis": {
    "avgRating": 4.2,
    "totalReviews": 1500,
    "topComplaints": ["most common negative themes from reviews — be specific"],
    "topPraises": ["most common positive themes — be specific"],
    "sideEffectsReported": ["any side effects mentioned in reviews"],
    "efficacyComments": "summary of whether customers report it works"
  },
  "marketingStrategy": "detailed analysis: pricing tier (budget/mid/premium), target demographic, key selling points, positioning vs competitors",
  "socialPresence": "any social media links, follower counts, or community references visible",
  "competitiveStrengths": ["what this product does well — be specific about formulation, dosing, value"],
  "competitiveWeaknesses": ["where this product falls short — specific gaps in formulation, complaints, missing certifications"],
  "opportunitiesForUs": ["specific gaps we could exploit — be actionable, reference specific ingredients, doses, or claims"],
  "nhpComplianceNotes": "would these claims be compliant under Canadian NHP regulations? flag any issues"
}

Return ONLY valid JSON.`;

  const response = await askClaude(COMPETITOR_SYSTEM, prompt, {
    maxTokens: 6000,
    temperature: 0.2,
  });

  try {
    const cleaned = response.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleaned) as CompetitorAnalysis;
  } catch {
    throw new Error("AI returned invalid JSON for competitor analysis. Please try again.");
  }
}

/**
 * Compare our product concept against multiple competitors.
 */
export async function compareCompetitors(
  ourProduct: { name: string; concept: string; dosageForm: string; targetMarket: string },
  competitors: Array<{ productName: string; brand: string; ingredients: string; price: string; rating: string; topComplaints: string }>,
): Promise<CompetitorComparison> {
  const competitorList = competitors
    .map((c, i) => `${i + 1}. ${c.brand} - ${c.productName}\n   Price: ${c.price} | Rating: ${c.rating}\n   Ingredients: ${c.ingredients}\n   Top complaints: ${c.topComplaints}`)
    .join("\n\n");

  const prompt = `Compare our product concept against these competitors. Provide a strategic positioning analysis.

OUR PRODUCT CONCEPT:
Name: ${ourProduct.name}
Concept: ${ourProduct.concept}
Dosage Form: ${ourProduct.dosageForm}
Target Market: ${ourProduct.targetMarket}

COMPETITORS (${competitors.length}):
${competitorList}

Return JSON:
{
  "marketPosition": "where our product fits in the competitive landscape — specific positioning statement",
  "pricingStrategy": "recommended price point and reasoning based on competitor pricing",
  "differentiators": ["what makes our product unique — specific, actionable differentiators"],
  "ingredientGaps": ["ingredients competitors have that we should consider adding"],
  "ingredientAdvantages": ["ingredients or doses where we can be superior"],
  "claimStrategy": ["recommended health claims based on competitor positioning and Canadian NHP regulations"],
  "consumerPainPoints": ["unmet needs identified from competitor review complaints"],
  "formulationRecommendations": ["specific formulation suggestions based on competitive gaps"],
  "riskFactors": ["competitive risks to be aware of"],
  "goToMarketSuggestions": ["strategic launch recommendations"]
}

Return ONLY valid JSON.`;

  const response = await askClaude(COMPETITOR_SYSTEM, prompt, {
    maxTokens: 4096,
    temperature: 0.2,
  });

  try {
    const cleaned = response.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleaned) as CompetitorComparison;
  } catch {
    throw new Error("AI returned invalid JSON for competitor comparison. Please try again.");
  }
}

/**
 * Analyze a competitor's company website for brand intelligence.
 */
export async function analyzeCompetitorWebsite(
  content: string,
): Promise<Record<string, unknown>> {
  const prompt = `Analyze this supplement company's website content. Extract brand and business intelligence.

Website Content:
${content.slice(0, 10000)}

Return JSON:
{
  "companyName": "legal or brand name",
  "headquarters": "city, state/province, country if visible",
  "yearFounded": "year or null",
  "productCount": "approximate number of products if visible",
  "brandPositioning": "budget/mid-range/premium — with reasoning",
  "targetDemographic": "who they target — age, gender, health focus",
  "keyBrands": ["sub-brands or product lines"],
  "certifications": ["GMP, NSF, organic, etc."],
  "socialMedia": {"instagram": "handle/url", "facebook": "", "twitter": "", "youtube": "", "tiktok": ""},
  "socialFollowing": "estimated total social following if visible",
  "marketingApproach": "detailed analysis of their marketing strategy — channels, messaging, tone",
  "prStrategy": "any press mentions, partnerships, or PR activities visible",
  "distributionChannels": ["amazon, own website, retail stores, etc."],
  "uniqueSellingPoints": ["what they emphasize as differentiators"],
  "weaknesses": ["visible gaps in their brand, product line, or strategy"]
}

Return ONLY valid JSON.`;

  const response = await askClaude(COMPETITOR_SYSTEM, prompt, {
    maxTokens: 4096,
    temperature: 0.2,
  });

  try {
    const cleaned = response.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error("AI returned invalid JSON for website analysis. Please try again.");
  }
}
