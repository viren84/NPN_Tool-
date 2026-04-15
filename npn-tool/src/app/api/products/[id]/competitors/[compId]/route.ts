import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, requireEditor, isErrorResponse } from "@/lib/auth/guard";
import { logAudit } from "@/lib/db/audit";
import { parseJsonBody } from "@/lib/utils/parse-body";
import { whitelistFields, COMPETITOR_PRODUCT_FIELDS } from "@/lib/utils/whitelist";
import { handlePrismaError } from "@/lib/errors/handle-prisma";

/**
 * GET /api/products/[id]/competitors/[compId]
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; compId: string }> },
) {
  const user = await requireAuth();
  if (isErrorResponse(user)) return user;

  const { id, compId } = await params;

  try {
    const comp = await prisma.competitorProduct.findFirst({
      where: { id: compId, productId: id },
    });

    if (!comp) {
      return NextResponse.json({ error: "Competitor not found" }, { status: 404 });
    }

    return NextResponse.json(comp);
  } catch (err) {
    return handlePrismaError(err, "get competitor");
  }
}

/**
 * PUT /api/products/[id]/competitors/[compId]
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; compId: string }> },
) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { id, compId } = await params;

  const parsed = await parseJsonBody(req);
  if (parsed.error) return parsed.error;
  const raw = parsed.data as Record<string, unknown>;

  const data = whitelistFields(raw, COMPETITOR_PRODUCT_FIELDS);

  // Serialize JSON array fields if passed as arrays
  for (const field of ["ingredientsJson", "claimsJson", "certifications", "strengthsJson", "weaknessesJson", "opportunitiesJson"]) {
    if (raw[field] !== undefined) {
      (data as Record<string, unknown>)[field] = typeof raw[field] === "string" ? raw[field] : JSON.stringify(raw[field]);
    }
  }

  // Allow reviewSummaryJson update
  if (raw.reviewSummaryJson !== undefined) {
    (data as Record<string, unknown>).reviewSummaryJson = typeof raw.reviewSummaryJson === "string"
      ? raw.reviewSummaryJson : JSON.stringify(raw.reviewSummaryJson);
  }

  try {
    const existing = await prisma.competitorProduct.findFirst({
      where: { id: compId, productId: id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Competitor not found" }, { status: 404 });
    }

    const updated = await prisma.competitorProduct.update({
      where: { id: compId },
      data: data as Record<string, unknown>,
    });

    await logAudit(
      user.id,
      "updated",
      "competitor_product",
      compId,
      `${user.name} updated competitor "${updated.productName || updated.competitorName}"`,
      data as Record<string, unknown>,
    );

    return NextResponse.json(updated);
  } catch (err) {
    return handlePrismaError(err, "update competitor");
  }
}

/**
 * DELETE /api/products/[id]/competitors/[compId]
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; compId: string }> },
) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { id, compId } = await params;

  try {
    const comp = await prisma.competitorProduct.findFirst({
      where: { id: compId, productId: id },
    });

    if (!comp) {
      return NextResponse.json({ error: "Competitor not found" }, { status: 404 });
    }

    await prisma.competitorProduct.delete({ where: { id: compId } });

    await logAudit(
      user.id,
      "deleted",
      "competitor_product",
      compId,
      `${user.name} deleted competitor "${comp.productName || comp.competitorName}"`,
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    return handlePrismaError(err, "delete competitor");
  }
}
