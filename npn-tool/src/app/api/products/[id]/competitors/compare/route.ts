import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireEditor, isErrorResponse } from "@/lib/auth/guard";
import { logAudit } from "@/lib/db/audit";
import { handlePrismaError } from "@/lib/errors/handle-prisma";
import { compareCompetitors } from "@/lib/ai/competitor-research";

/**
 * POST /api/products/[id]/competitors/compare
 * Compare all analyzed competitors against our product concept.
 * Stores result in ProductStageData under sectionKey "competitor_comparison".
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { id } = await params;

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: { competitors: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Get analyzed competitors only
    const analyzedComps = product.competitors.filter((c) => c.analysisStatus === "completed");

    if (analyzedComps.length === 0) {
      return NextResponse.json(
        { error: "No analyzed competitors found. Analyze at least one competitor first." },
        { status: 400 },
      );
    }

    // Build competitor summaries for comparison
    const compSummaries = analyzedComps.map((c) => {
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

    // Run comparison
    const comparison = await compareCompetitors(
      {
        name: product.name,
        concept: product.productConcept || product.name,
        dosageForm: product.dosageForm,
        targetMarket: product.targetMarket || "Canada",
      },
      compSummaries,
    );

    // Store in ProductStageData
    await prisma.productStageData.upsert({
      where: {
        productId_stage_sectionKey: {
          productId: id,
          stage: "research",
          sectionKey: "competitor_comparison",
        },
      },
      create: {
        productId: id,
        stage: "research",
        sectionKey: "competitor_comparison",
        dataJson: JSON.stringify(comparison),
        aiGeneratedAt: new Date().toISOString(),
      },
      update: {
        dataJson: JSON.stringify(comparison),
        aiGeneratedAt: new Date().toISOString(),
        manualOverride: false,
      },
    });

    // Audit trail
    await prisma.aIResearchSession.create({
      data: {
        productId: id,
        stage: "research",
        researchType: "competitor_comparison",
        promptSummary: `Compared ${analyzedComps.length} competitors for "${product.name}"`,
        responseJson: JSON.stringify(comparison),
        status: "completed",
        createdById: user.id,
      },
    });

    await logAudit(
      user.id,
      "ai_research",
      "product",
      id,
      `${user.name} compared ${analyzedComps.length} competitors for "${product.name}"`,
    );

    return NextResponse.json(comparison);
  } catch (err) {
    return handlePrismaError(err, "compare competitors");
  }
}
