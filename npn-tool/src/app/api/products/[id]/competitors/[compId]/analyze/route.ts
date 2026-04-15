import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireEditor, isErrorResponse } from "@/lib/auth/guard";
import { logAudit } from "@/lib/db/audit";
import { parseJsonBody } from "@/lib/utils/parse-body";
import { handlePrismaError } from "@/lib/errors/handle-prisma";
import { analyzeCompetitorProduct } from "@/lib/ai/competitor-research";

/**
 * POST /api/products/[id]/competitors/[compId]/analyze
 * Re-analyze a competitor with new/updated pasted content.
 * Body: { pastedContent: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; compId: string }> },
) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { id, compId } = await params;

  const parsed = await parseJsonBody(req);
  if (parsed.error) return parsed.error;
  const body = parsed.data as Record<string, unknown>;

  const pastedContent = ((body.pastedContent as string) || "").trim();
  if (pastedContent.length < 100) {
    return NextResponse.json(
      { error: "pastedContent must be at least 100 characters of product page text" },
      { status: 400 },
    );
  }

  try {
    const comp = await prisma.competitorProduct.findFirst({
      where: { id: compId, productId: id },
    });

    if (!comp) {
      return NextResponse.json({ error: "Competitor not found" }, { status: 404 });
    }

    // Set analyzing status
    await prisma.competitorProduct.update({
      where: { id: compId },
      data: { analysisStatus: "analyzing", analysisError: "" },
    });

    // Run AI analysis
    const analysis = await analyzeCompetitorProduct(pastedContent, comp.sourceType);

    // Update competitor with results
    const updated = await prisma.competitorProduct.update({
      where: { id: compId },
      data: {
        productName: analysis.productName || comp.productName,
        brand: analysis.brand || comp.brand,
        competitorName: analysis.brand || comp.competitorName,
        companyWebsite: analysis.companyWebsite || comp.companyWebsite,
        ingredientsJson: JSON.stringify(analysis.ingredients || []),
        claimsJson: JSON.stringify(analysis.claims || []),
        price: analysis.price || comp.price,
        dosageForm: analysis.dosageForm || comp.dosageForm,
        servingSize: analysis.servingSize || "",
        servingsPerContainer: analysis.servingsPerContainer || "",
        certifications: JSON.stringify(analysis.certifications || []),
        reviewSummaryJson: JSON.stringify(analysis.reviewAnalysis || {}),
        marketingStrategy: analysis.marketingStrategy || "",
        socialPresence: analysis.socialPresence || "",
        strengthsJson: JSON.stringify(analysis.competitiveStrengths || []),
        weaknessesJson: JSON.stringify(analysis.competitiveWeaknesses || []),
        opportunitiesJson: JSON.stringify(analysis.opportunitiesForUs || []),
        nhpComplianceNotes: analysis.nhpComplianceNotes || "",
        analysisStatus: "completed",
        analyzedAt: new Date().toISOString(),
      },
    });

    // Audit trail
    await prisma.aIResearchSession.create({
      data: {
        productId: id,
        researchType: "competitor_analysis",
        promptSummary: `Re-analyzed competitor "${updated.productName}" (${comp.sourceType})`,
        responseJson: JSON.stringify(analysis),
        status: "completed",
        createdById: user.id,
      },
    });

    await logAudit(
      user.id,
      "analyzed",
      "competitor_product",
      compId,
      `${user.name} analyzed competitor "${updated.productName}" with AI`,
    );

    return NextResponse.json(updated);
  } catch (err) {
    // If AI fails, mark the competitor as failed
    await prisma.competitorProduct.update({
      where: { id: compId },
      data: {
        analysisStatus: "failed",
        analysisError: err instanceof Error ? err.message.slice(0, 500) : "Analysis failed",
      },
    }).catch(() => {});

    return handlePrismaError(err, "analyze competitor");
  }
}
