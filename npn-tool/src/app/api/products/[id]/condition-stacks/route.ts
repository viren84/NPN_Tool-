import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, requireEditor, isErrorResponse } from "@/lib/auth/guard";
import { logAudit } from "@/lib/db/audit";
import { parseJsonBody } from "@/lib/utils/parse-body";
import { handlePrismaError } from "@/lib/errors/handle-prisma";
import { discoverCombinations } from "@/lib/ai/condition-research";

/**
 * GET /api/products/[id]/condition-stacks?condition=stress
 * List all condition stacks for a product.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth();
  if (isErrorResponse(user)) return user;

  const { id } = await params;
  const condition = req.nextUrl.searchParams.get("condition") || undefined;

  try {
    const where: Record<string, string> = { productId: id };
    if (condition) where.condition = condition;

    const stacks = await prisma.conditionStack.findMany({
      where,
      orderBy: [{ selected: "desc" }, { aiConfidence: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(stacks);
  } catch (err) {
    return handlePrismaError(err, "list condition stacks");
  }
}

/**
 * POST /api/products/[id]/condition-stacks
 * Two modes:
 *   1. Manual: body has { condition, stackName, primaryMolecule, primaryDose, primaryUnit, moleculesJson }
 *   2. AI Suggest: body has { condition, primaryMolecule, primaryDose, primaryUnit, aiSuggest: true }
 *      → Calls Claude to find combinations, creates multiple stacks
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

  try {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const condition = ((body.condition as string) || product.targetCondition || "").trim();
    const conditionDetail = ((body.conditionDetail as string) || product.targetConditionDetail || "").trim();
    const primaryMolecule = ((body.primaryMolecule as string) || "").trim();
    const primaryDose = typeof body.primaryDose === "number" ? body.primaryDose : 0;
    const primaryUnit = ((body.primaryUnit as string) || "mg").trim();

    if (!condition) {
      return NextResponse.json({ error: "condition is required" }, { status: 400 });
    }
    if (!primaryMolecule) {
      return NextResponse.json({ error: "primaryMolecule is required" }, { status: 400 });
    }

    // ----- AI SUGGEST MODE -----
    if (body.aiSuggest === true) {
      // Call AI to discover combinations
      const discovery = await discoverCombinations(
        primaryMolecule,
        primaryDose,
        primaryUnit,
        condition,
        conditionDetail,
      );

      // Create a ConditionStack for each suggested stack
      const created = [];
      for (const stack of discovery.stacks) {
        const record = await prisma.conditionStack.create({
          data: {
            productId: id,
            condition,
            conditionDetail,
            stackName: stack.stackName,
            stackType: "ai_suggested",
            primaryMolecule,
            primaryDose,
            primaryUnit,
            moleculesJson: JSON.stringify(stack.molecules),
            marketPrevalence: parseInt(stack.marketPrevalence.replace(/\D/g, "")) || 0,
            avgMarketRating: parseFloat(stack.avgRating) || 0,
            marketGap: stack.marketGap,
            consumerPainPoints: JSON.stringify(stack.consumerPainPointsAddressed || []),
            applicationClass: stack.applicationClass,
            monographCoverage: stack.monographCoverage,
            availableClaimsJson: JSON.stringify(stack.availableClaims || []),
            complianceNotes: "",
            aiGenerated: true,
            aiConfidence: 0.8,
            scientificBasis: stack.scientificBasis,
          },
        });
        created.push(record);
      }

      // Log AI session
      await prisma.aIResearchSession.create({
        data: {
          productId: id,
          stage: product.stage,
          researchType: "combination_discovery",
          promptSummary: `Discovered ${created.length} stacks for ${primaryMolecule} targeting ${condition}`,
          responseJson: JSON.stringify(discovery),
          status: "completed",
          createdById: user.id,
        },
      });

      await logAudit(
        user.id,
        "ai_research",
        "condition_stack",
        id,
        `${user.name} discovered ${created.length} molecule stacks for "${primaryMolecule}" targeting "${condition}"`,
      );

      return NextResponse.json({
        stacks: created,
        recommendation: discovery.overallRecommendation,
      }, { status: 201 });
    }

    // ----- MANUAL MODE -----
    const stackName = ((body.stackName as string) || `${primaryMolecule} Stack`).trim();
    let moleculesJson = "[]";
    if (body.moleculesJson !== undefined) {
      moleculesJson = typeof body.moleculesJson === "string" ? body.moleculesJson : JSON.stringify(body.moleculesJson);
    }

    const stack = await prisma.conditionStack.create({
      data: {
        productId: id,
        condition,
        conditionDetail,
        stackName,
        stackType: "custom",
        primaryMolecule,
        primaryDose,
        primaryUnit,
        moleculesJson,
        notes: ((body.notes as string) || "").trim(),
      },
    });

    await logAudit(
      user.id,
      "created",
      "condition_stack",
      stack.id,
      `${user.name} created stack "${stackName}" for "${condition}"`,
    );

    return NextResponse.json(stack, { status: 201 });
  } catch (err) {
    return handlePrismaError(err, "create condition stack");
  }
}
