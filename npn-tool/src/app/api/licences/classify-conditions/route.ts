import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { askClaude } from "@/lib/ai/claude";
import { CONDITION_KEYS } from "@/lib/constants/health-conditions";

const SYSTEM_PROMPT = `You are a Health Canada NHP (Natural Health Product) classification expert.
Given a product's name, approved health claims, and medicinal ingredients, classify it into 1-3 health condition categories.

VALID CATEGORIES (use ONLY these exact keys):
${CONDITION_KEYS.join(", ")}

Rules:
- Return ONLY a JSON array of category keys, nothing else
- Pick 1-3 categories that best describe the product's primary health purpose
- Base your classification primarily on the CLAIMS (approved health purposes)
- Use ingredients as secondary signal when claims are sparse
- Use product name as tertiary signal
- If truly unclear, use "general_wellness"

Example: ["immune","antioxidant"]
Example: ["cardiovascular"]
Example: ["joint_bone","pain_inflammation"]`;

/**
 * POST /api/licences/classify-conditions
 * Body: { ids?: string[] } — if no ids, classify ALL unclassified licences
 * Classifies licences using Claude AI based on claims + ingredients + name
 */
export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "viewer") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let ids: string[] | undefined;
  try {
    const body = await req.json();
    ids = body.ids;
  } catch {
    // no body = classify all
  }

  // Fetch licences to classify
  const where: Record<string, unknown> = {};
  if (ids && ids.length > 0) {
    where.id = { in: ids };
  } else {
    // Only classify those without conditions yet
    where.healthConditionsJson = "[]";
  }

  const licences = await prisma.productLicence.findMany({
    where,
    select: {
      id: true,
      productName: true,
      medicinalIngredientsJson: true,
      claimsJson: true,
    },
  });

  if (licences.length === 0) {
    return NextResponse.json({ classified: 0, message: "No licences need classification" });
  }

  let classified = 0;
  const results: { id: string; name: string; conditions: string[] }[] = [];

  // Process in batches of 5 to avoid rate limits
  for (let i = 0; i < licences.length; i += 5) {
    const batch = licences.slice(i, i + 5);

    // Build one prompt for the batch
    const batchPrompt = batch.map((lic, idx) => {
      const claims = safeParse(lic.claimsJson);
      const ingredients = safeParse(lic.medicinalIngredientsJson);

      const claimTexts = claims.map((c: Record<string, string>) =>
        c.purpose || c.text || c.claim_text || c.textEn || ""
      ).filter(Boolean).join("; ");

      const ingredientNames = ingredients.map((ing: Record<string, string>) =>
        ing.ingredient_name || ing.name || ""
      ).filter(Boolean).join(", ");

      return `PRODUCT ${idx + 1}:
Name: ${lic.productName}
Claims: ${claimTexts || "none"}
Ingredients: ${ingredientNames || "none"}`;
    }).join("\n\n");

    const userMsg = `Classify these ${batch.length} products. Return a JSON array of arrays (one inner array per product, in order).

${batchPrompt}

Return ONLY valid JSON like: [["immune","antioxidant"],["cardiovascular"],["joint_bone"]]`;

    try {
      const response = await askClaude(SYSTEM_PROMPT, userMsg, { maxTokens: 500, temperature: 0.1 });

      // Extract JSON array from response
      const match = response.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]) as string[][];
        for (let j = 0; j < batch.length && j < parsed.length; j++) {
          const conditions = parsed[j].filter((c: string) => CONDITION_KEYS.includes(c));
          if (conditions.length > 0) {
            await prisma.productLicence.update({
              where: { id: batch[j].id },
              data: { healthConditionsJson: JSON.stringify(conditions) },
            });
            classified++;
            results.push({ id: batch[j].id, name: batch[j].productName, conditions });
          }
        }
      }
    } catch (err) {
      // Log but continue with next batch
      console.error("Classification batch error:", err instanceof Error ? err.message : err);
    }
  }

  return NextResponse.json({ classified, total: licences.length, results });
}

function safeParse(json: string): Record<string, string>[] {
  try {
    const parsed = JSON.parse(json || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
