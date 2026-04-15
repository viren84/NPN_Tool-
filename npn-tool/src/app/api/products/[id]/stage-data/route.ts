import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, requireEditor, isErrorResponse } from "@/lib/auth/guard";
import { logAudit } from "@/lib/db/audit";
import { parseJsonBody } from "@/lib/utils/parse-body";
import { handlePrismaError } from "@/lib/errors/handle-prisma";

/**
 * GET /api/products/[id]/stage-data?stage=research
 * Get all stage data sections for a product, optionally filtered by stage.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth();
  if (isErrorResponse(user)) return user;

  const { id } = await params;
  const stage = req.nextUrl.searchParams.get("stage") || undefined;

  try {
    const where: Record<string, string> = { productId: id };
    if (stage) where.stage = stage;

    const data = await prisma.productStageData.findMany({
      where,
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(data);
  } catch (err) {
    return handlePrismaError(err, "list stage data");
  }
}

/**
 * PUT /api/products/[id]/stage-data
 * Upsert a stage data section.
 * Body: { stage, sectionKey, dataJson, notes?, manualOverride? }
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { id } = await params;

  const parsed = await parseJsonBody(req);
  if (parsed.error) return parsed.error;
  const body = parsed.data as Record<string, unknown>;

  const stage = ((body.stage as string) || "").trim();
  const sectionKey = ((body.sectionKey as string) || "").trim();

  if (!stage || !sectionKey) {
    return NextResponse.json({ error: "stage and sectionKey are required" }, { status: 400 });
  }

  // Serialize dataJson if passed as object
  let dataJson = "{}";
  if (body.dataJson !== undefined) {
    dataJson = typeof body.dataJson === "string" ? body.dataJson : JSON.stringify(body.dataJson);
  }

  try {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const result = await prisma.productStageData.upsert({
      where: {
        productId_stage_sectionKey: { productId: id, stage, sectionKey },
      },
      create: {
        productId: id,
        stage,
        sectionKey,
        dataJson,
        notes: ((body.notes as string) || "").trim(),
        manualOverride: body.manualOverride === true,
      },
      update: {
        dataJson,
        notes: body.notes !== undefined ? ((body.notes as string) || "").trim() : undefined,
        manualOverride: body.manualOverride !== undefined ? body.manualOverride === true : undefined,
      },
    });

    await logAudit(
      user.id,
      "updated",
      "product_stage_data",
      result.id,
      `${user.name} updated stage data "${sectionKey}" for "${product.name}" at stage ${stage}`,
    );

    return NextResponse.json(result);
  } catch (err) {
    return handlePrismaError(err, "upsert stage data");
  }
}
