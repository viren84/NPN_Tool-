import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, requireEditor, isErrorResponse } from "@/lib/auth/guard";
import { logAudit } from "@/lib/db/audit";
import { parseJsonBody } from "@/lib/utils/parse-body";
import { handlePrismaError } from "@/lib/errors/handle-prisma";
import { compareCompetitors } from "@/lib/ai/competitor-research";
import { researchIngredients } from "@/lib/ai/ingredient-research";
import { analyzeMarket, checkMonographCompliance, analyzeRegulatoryGaps, suggestFormulation, suggestDosage } from "@/lib/ai/product-research";
import { researchCondition, discoverCombinations } from "@/lib/ai/condition-research";

/**
 * GET /api/products/[id]/ai-research?stage=research&type=competitor_analysis
 * List past AI research sessions for a product.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth();
  if (isErrorResponse(user)) return user;

  const { id } = await params;
  const stage = req.nextUrl.searchParams.get("stage") || undefined;
  const researchType = req.nextUrl.searchParams.get("type") || undefined;

  try {
    const where: Record<string, string> = { productId: id };
    if (stage) where.stage = stage;
    if (researchType) where.researchType = researchType;

    const sessions = await prisma.aIResearchSession.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(sessions);
  } catch (err) {
    return handlePrismaError(err, "list AI research sessions");
  }
}

/**
 * POST /api/products/[id]/ai-research
 * Run an AI research session. Body: { researchType, stage?, context? }
 *
 * This is a placeholder that creates the session record.
 * Phase 2 will wire this to actual Claude calls via src/lib/ai/competitor-research.ts
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { id } = await params;

  const parsed = await parseJsonBody(req);
  if (parsed.error) return parsed.error;
  const body = parsed.data as Record<string, unknown>;

  const researchType = ((body.researchType as string) || "").trim();
  if (!researchType) {
    return NextResponse.json({ error: "researchType is required" }, { status: 400 });
  }

  const validTypes = [
    "competitor_analysis", "ingredient_research", "market_analysis",
    "regulatory_gap", "monograph_compliance", "formulation_suggestion",
    "dosage_recommendation", "pla_readiness",
    "condition_research", "combination_discovery",
  ];

  if (!validTypes.includes(researchType)) {
    return NextResponse.json(
      { error: `Invalid researchType. Must be one of: ${validTypes.join(", ")}` },
      { status: 400 },
    );
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        competitors: true,
        ingredientSpecs: true,
        productDocuments: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const stage = ((body.stage as string) || product.stage).trim();
    const context = ((body.context as string) || "").trim();

    // Build prompt summary for audit
    const promptSummary = `${researchType} for "${product.name}" at stage ${stage}${context ? ` — context: ${context.slice(0, 200)}` : ""}`;

    // Route to appropriate AI function based on researchType
    let aiResponse: unknown;
    let sessionStatus = "completed";

    try {
      switch (researchType) {
        case "market_analysis":
          aiResponse = await analyzeMarket(
            product.name,
            product.productConcept || context,
            product.dosageForm,
            product.targetMarket || "Canada",
          );
          break;

        case "ingredient_research":
          aiResponse = await researchIngredients(
            product.productConcept || product.name,
            product.dosageForm,
            [], // LNHPD precedents could be added here
          );
          break;

        case "monograph_compliance":
          aiResponse = await checkMonographCompliance(
            product.ingredientSpecs.map((s) => ({
              ingredientName: s.ingredientName,
              targetDose: s.targetDose,
              targetUnit: s.targetUnit,
              standardization: s.standardization,
            })),
          );
          break;

        case "regulatory_gap":
        case "pla_readiness":
          aiResponse = await analyzeRegulatoryGaps(
            { name: product.name, applicationClass: product.applicationClass, dosageForm: product.dosageForm, stage },
            product.productDocuments.length,
            product.ingredientSpecs.length,
            product.competitors.length,
          );
          break;

        case "formulation_suggestion": {
          const gaps = product.competitors.flatMap((c) => {
            try { return JSON.parse(c.opportunitiesJson || "[]") as string[]; } catch { return []; }
          });
          aiResponse = await suggestFormulation(
            product.productConcept || product.name,
            gaps,
            context ? [context] : [],
          );
          break;
        }

        case "dosage_recommendation":
          aiResponse = await suggestDosage(
            product.ingredientSpecs.map((s) => ({
              ingredientName: s.ingredientName,
              targetDose: s.targetDose,
              targetUnit: s.targetUnit,
            })),
            product.dosageForm,
            context || "Adults (18+)",
          );
          break;

        case "competitor_analysis": {
          const comps = product.competitors
            .filter((c) => c.analysisStatus === "completed")
            .map((c) => {
              const ings = (() => { try { return JSON.parse(c.ingredientsJson || "[]"); } catch { return []; } })();
              const reviews = (() => { try { return JSON.parse(c.reviewSummaryJson || "{}"); } catch { return {}; } })();
              return {
                productName: c.productName,
                brand: c.brand || c.competitorName,
                ingredients: (ings as Array<{ name: string }>).map((i) => i.name).join(", "),
                price: c.price,
                rating: String((reviews as Record<string, unknown>).avgRating || "N/A"),
                topComplaints: ((reviews as Record<string, unknown>).topComplaints as string[] || []).join("; "),
              };
            });
          if (comps.length === 0) {
            aiResponse = { error: "No analyzed competitors found. Add and analyze competitors first." };
            break;
          }
          aiResponse = await compareCompetitors(
            { name: product.name, concept: product.productConcept, dosageForm: product.dosageForm, targetMarket: product.targetMarket || "Canada" },
            comps,
          );
          break;
        }

        case "condition_research":
          aiResponse = await researchCondition(
            product.targetCondition || context || "general health",
            product.targetConditionDetail || "",
            product.targetMarket || "Canada",
          );
          break;

        case "combination_discovery": {
          const primaryMol = ((body.primaryMolecule as string) || "").trim();
          const primaryDose = typeof body.primaryDose === "number" ? body.primaryDose : 0;
          const primaryUnit = ((body.primaryUnit as string) || "mg").trim();
          if (!primaryMol) {
            aiResponse = { error: "primaryMolecule is required for combination_discovery" };
            sessionStatus = "failed";
            break;
          }
          aiResponse = await discoverCombinations(
            primaryMol,
            primaryDose,
            primaryUnit,
            product.targetCondition || context || "general health",
            product.targetConditionDetail || "",
          );
          break;
        }

        default:
          aiResponse = { error: `Unhandled research type: ${researchType}` };
          sessionStatus = "failed";
      }
    } catch (aiErr) {
      const errMsg = aiErr instanceof Error ? aiErr.message : "AI research failed";
      aiResponse = { error: errMsg };
      sessionStatus = "failed";
    }

    const session = await prisma.aIResearchSession.create({
      data: {
        productId: id,
        stage,
        researchType,
        promptSummary,
        responseJson: JSON.stringify(aiResponse),
        tokensUsed: 0,
        status: sessionStatus,
        createdById: user.id,
      },
    });

    await logAudit(
      user.id,
      "ai_research",
      "ai_research_session",
      session.id,
      `${user.name} ran ${researchType} research for "${product.name}"`,
    );

    return NextResponse.json(session, { status: 201 });
  } catch (err) {
    return handlePrismaError(err, "create AI research session");
  }
}
