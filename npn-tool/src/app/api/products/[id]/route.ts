import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, requireEditor, isErrorResponse } from "@/lib/auth/guard";
import { logAudit } from "@/lib/db/audit";
import { whitelistFields, PRODUCT_FIELDS } from "@/lib/utils/whitelist";
import { parseJsonBody } from "@/lib/utils/parse-body";
import { handlePrismaError } from "@/lib/errors/handle-prisma";

const VALID_STAGES = [
  "research", "formulation", "stability", "filing", "under_review",
  "approved", "production", "launch", "active", "amendment",
  "renewal", "suspended", "cancelled", "archived", "withdrawn",
] as const;

const VALID_PRIORITIES = ["low", "medium", "high", "critical"] as const;

const VALID_REVIEW_STATUSES = [
  "none", "requested", "in_review", "approved", "rejected", "needs_changes",
] as const;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth();
  if (isErrorResponse(user)) return user;

  const { id } = await params;

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        application: {
          select: {
            id: true,
            productName: true,
            status: true,
            applicationClass: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (err) {
    return handlePrismaError(err, "get product");
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { id } = await params;

  const parsed = await parseJsonBody(req);
  if (parsed.error) return parsed.error;
  const raw = parsed.data as Record<string, unknown>;

  // Whitelist allowed fields
  const data = whitelistFields(raw, PRODUCT_FIELDS);

  // Validate stage if provided
  if (data.stage !== undefined) {
    if (!VALID_STAGES.includes(data.stage as (typeof VALID_STAGES)[number])) {
      return NextResponse.json(
        { error: `Invalid stage. Must be one of: ${VALID_STAGES.join(", ")}` },
        { status: 400 },
      );
    }
  }

  // Validate priority if provided
  if (data.priority !== undefined) {
    if (!VALID_PRIORITIES.includes(data.priority as (typeof VALID_PRIORITIES)[number])) {
      return NextResponse.json(
        { error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(", ")}` },
        { status: 400 },
      );
    }
  }

  // Validate reviewStatus if provided
  if (data.reviewStatus !== undefined) {
    if (!VALID_REVIEW_STATUSES.includes(data.reviewStatus as (typeof VALID_REVIEW_STATUSES)[number])) {
      return NextResponse.json(
        { error: `Invalid reviewStatus. Must be one of: ${VALID_REVIEW_STATUSES.join(", ")}` },
        { status: 400 },
      );
    }
  }

  // Validate applicationClass if provided
  if (data.applicationClass !== undefined && data.applicationClass !== "") {
    if (!["I", "II", "III"].includes(data.applicationClass as string)) {
      return NextResponse.json(
        { error: "Invalid applicationClass. Must be I, II, or III." },
        { status: 400 },
      );
    }
  }

  // Serialize tags if passed as array
  if (data.tags !== undefined && typeof data.tags !== "string") {
    data.tags = JSON.stringify(data.tags);
  }

  try {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const product = await prisma.product.update({
      where: { id },
      data: data as Record<string, unknown>,
    });

    // Build change summary for audit
    const changedFields = Object.keys(data).filter(
      (k) => (existing as Record<string, unknown>)[k] !== (data as Record<string, unknown>)[k],
    );

    await logAudit(
      user.id,
      "updated",
      "product",
      id,
      `${user.name} updated product "${product.name}" [${changedFields.join(", ")}]`,
      data as Record<string, unknown>,
    );

    return NextResponse.json(product);
  } catch (err) {
    return handlePrismaError(err, "update product");
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { id } = await params;

  try {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    await prisma.product.delete({ where: { id } });

    await logAudit(
      user.id,
      "deleted",
      "product",
      id,
      `${user.name} deleted product "${product.name}" (was stage: ${product.stage})`,
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    return handlePrismaError(err, "delete product");
  }
}
