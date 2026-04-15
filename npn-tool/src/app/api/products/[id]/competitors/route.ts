import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, requireEditor, isErrorResponse } from "@/lib/auth/guard";
import { logAudit } from "@/lib/db/audit";
import { parseJsonBody } from "@/lib/utils/parse-body";
import { handlePrismaError } from "@/lib/errors/handle-prisma";
import { analyzeCompetitorProduct } from "@/lib/ai/competitor-research";

/**
 * GET /api/products/[id]/competitors
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth();
  if (isErrorResponse(user)) return user;

  const { id } = await params;

  try {
    const competitors = await prisma.competitorProduct.findMany({
      where: { productId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(competitors);
  } catch (err) {
    return handlePrismaError(err, "list competitors");
  }
}

/**
 * POST /api/products/[id]/competitors
 * Add a competitor. Body: { sourceUrl, sourceType?, productName?, competitorName?, pastedContent? }
 * The pastedContent field holds the scraped/pasted page content for AI analysis (Phase 2).
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

    const sourceUrl = ((body.sourceUrl as string) || "").trim();
    const sourceType = ((body.sourceType as string) || "amazon").trim();
    const productName = ((body.productName as string) || "").trim();
    const competitorName = ((body.competitorName as string) || "").trim();

    if (!sourceUrl && !productName && !competitorName) {
      return NextResponse.json(
        { error: "At least one of sourceUrl, productName, or competitorName is required" },
        { status: 400 },
      );
    }

    const competitor = await prisma.competitorProduct.create({
      data: {
        productId: id,
        sourceUrl,
        sourceType,
        productName,
        competitorName,
        brand: ((body.brand as string) || "").trim(),
        companyWebsite: ((body.companyWebsite as string) || "").trim(),
        price: ((body.price as string) || "").trim(),
        dosageForm: ((body.dosageForm as string) || "").trim(),
        analysisStatus: "pending",
      },
    });

    await logAudit(
      user.id,
      "created",
      "competitor_product",
      competitor.id,
      `${user.name} added competitor "${productName || competitorName || sourceUrl}" to product "${product.name}"`,
    );

    // AI analysis if pasted content provided (non-blocking)
    const pastedContent = ((body.pastedContent as string) || "").trim();
    if (pastedContent.length > 100) {
      (async () => {
        try {
          await prisma.competitorProduct.update({
            where: { id: competitor.id },
            data: { analysisStatus: "analyzing" },
          });

          const analysis = await analyzeCompetitorProduct(pastedContent, sourceType);

          await prisma.competitorProduct.update({
            where: { id: competitor.id },
            data: {
              productName: analysis.productName || productName,
              brand: analysis.brand || "",
              competitorName: analysis.brand || competitorName,
              companyWebsite: analysis.companyWebsite || "",
              ingredientsJson: JSON.stringify(analysis.ingredients || []),
              claimsJson: JSON.stringify(analysis.claims || []),
              price: analysis.price || ((body.price as string) || ""),
              dosageForm: analysis.dosageForm || "",
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

          // Log AI session
          await prisma.aIResearchSession.create({
            data: {
              productId: id,
              stage: product.stage,
              researchType: "competitor_analysis",
              promptSummary: `Analyzed competitor "${analysis.productName || sourceUrl}" (${sourceType})`,
              responseJson: JSON.stringify(analysis),
              status: "completed",
              createdById: user.id,
            },
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Analysis failed";
          await prisma.competitorProduct.update({
            where: { id: competitor.id },
            data: { analysisStatus: "failed", analysisError: msg.slice(0, 500) },
          }).catch(() => {});
        }
      })();
    }

    return NextResponse.json(competitor, { status: 201 });
  } catch (err) {
    return handlePrismaError(err, "create competitor");
  }
}
