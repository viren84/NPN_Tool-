import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, requireEditor, isErrorResponse } from "@/lib/auth/guard";
import { logAudit } from "@/lib/db/audit";
import { parseJsonBody } from "@/lib/utils/parse-body";

/**
 * GET /api/products/[id]/review — Get review status for a product
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  if (isErrorResponse(user)) return user;

  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      reviewStatus: true,
      reviewerId: true,
      reviewNotes: true,
      reviewRequestedAt: true,
      reviewCompletedAt: true,
    },
  });

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json(product);
}

/**
 * POST /api/products/[id]/review — Request a review
 * Body: { reviewerId }
 * Sets reviewStatus="requested", reviewRequestedAt=now
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { id } = await params;

  const parsed = await parseJsonBody<{ reviewerId: string }>(req);
  if (parsed.error) return parsed.error;
  const { reviewerId } = parsed.data;

  if (!reviewerId || typeof reviewerId !== "string" || reviewerId.trim() === "") {
    return NextResponse.json({ error: "reviewerId is required" }, { status: 400 });
  }

  // Verify the product exists
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  // Verify the reviewer exists
  const reviewer = await prisma.user.findUnique({ where: { id: reviewerId.trim() } });
  if (!reviewer) {
    return NextResponse.json({ error: "Reviewer not found" }, { status: 404 });
  }

  const updated = await prisma.product.update({
    where: { id },
    data: {
      reviewStatus: "requested",
      reviewerId: reviewerId.trim(),
      reviewRequestedAt: new Date().toISOString(),
      reviewCompletedAt: "",
      reviewNotes: "",
    },
  });

  await logAudit(
    user.id,
    "review_requested",
    "product",
    id,
    `${user.name} requested review of "${product.name}" by ${reviewer.name}`
  );

  return NextResponse.json(updated);
}

const VALID_DECISIONS = ["approved", "rejected", "needs_changes"];

/**
 * PUT /api/products/[id]/review — Submit review decision
 * Body: { decision: "approved"|"rejected"|"needs_changes", notes: string }
 * Only the assigned reviewer can submit.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  if (isErrorResponse(user)) return user;

  const { id } = await params;

  const parsed = await parseJsonBody<{ decision: string; notes: string }>(req);
  if (parsed.error) return parsed.error;
  const { decision, notes } = parsed.data;

  if (!decision || typeof decision !== "string" || !VALID_DECISIONS.includes(decision)) {
    return NextResponse.json(
      { error: `decision is required and must be one of: ${VALID_DECISIONS.join(", ")}` },
      { status: 400 }
    );
  }

  if (notes !== undefined && typeof notes !== "string") {
    return NextResponse.json({ error: "notes must be a string" }, { status: 400 });
  }

  // Verify the product exists and has a review requested
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  if (!product.reviewerId) {
    return NextResponse.json({ error: "No review has been requested for this product" }, { status: 400 });
  }

  // Only the assigned reviewer can submit a decision
  if (product.reviewerId !== user.id) {
    return NextResponse.json(
      { error: "Only the assigned reviewer can submit a review decision" },
      { status: 403 }
    );
  }

  const updated = await prisma.product.update({
    where: { id },
    data: {
      reviewStatus: decision,
      reviewCompletedAt: new Date().toISOString(),
      reviewNotes: notes || "",
    },
  });

  await logAudit(
    user.id,
    "review_completed",
    "product",
    id,
    `${user.name} reviewed "${product.name}" — decision: ${decision}`
  );

  return NextResponse.json(updated);
}
