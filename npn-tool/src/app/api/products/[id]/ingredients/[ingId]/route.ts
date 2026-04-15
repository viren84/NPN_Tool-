import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, requireEditor, isErrorResponse } from "@/lib/auth/guard";
import { logAudit } from "@/lib/db/audit";
import { parseJsonBody } from "@/lib/utils/parse-body";
import { whitelistFields, PRODUCT_INGREDIENT_SPEC_FIELDS } from "@/lib/utils/whitelist";
import { handlePrismaError } from "@/lib/errors/handle-prisma";

/**
 * GET /api/products/[id]/ingredients/[ingId]
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; ingId: string }> },
) {
  const user = await requireAuth();
  if (isErrorResponse(user)) return user;

  const { id, ingId } = await params;

  try {
    const spec = await prisma.productIngredientSpec.findFirst({
      where: { id: ingId, productId: id },
    });

    if (!spec) {
      return NextResponse.json({ error: "Ingredient spec not found" }, { status: 404 });
    }

    return NextResponse.json(spec);
  } catch (err) {
    return handlePrismaError(err, "get product ingredient spec");
  }
}

/**
 * PUT /api/products/[id]/ingredients/[ingId]
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; ingId: string }> },
) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { id, ingId } = await params;

  const parsed = await parseJsonBody(req);
  if (parsed.error) return parsed.error;
  const raw = parsed.data as Record<string, unknown>;

  const data = whitelistFields(raw, PRODUCT_INGREDIENT_SPEC_FIELDS);

  try {
    const existing = await prisma.productIngredientSpec.findFirst({
      where: { id: ingId, productId: id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Ingredient spec not found" }, { status: 404 });
    }

    const updated = await prisma.productIngredientSpec.update({
      where: { id: ingId },
      data: data as Record<string, unknown>,
    });

    await logAudit(
      user.id,
      "updated",
      "product_ingredient_spec",
      ingId,
      `${user.name} updated ingredient "${updated.ingredientName}"`,
      data as Record<string, unknown>,
    );

    return NextResponse.json(updated);
  } catch (err) {
    return handlePrismaError(err, "update product ingredient spec");
  }
}

/**
 * DELETE /api/products/[id]/ingredients/[ingId]
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; ingId: string }> },
) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { id, ingId } = await params;

  try {
    const spec = await prisma.productIngredientSpec.findFirst({
      where: { id: ingId, productId: id },
    });

    if (!spec) {
      return NextResponse.json({ error: "Ingredient spec not found" }, { status: 404 });
    }

    await prisma.productIngredientSpec.delete({ where: { id: ingId } });

    // Update product ingredient count
    const count = await prisma.productIngredientSpec.count({ where: { productId: id } });
    await prisma.product.update({ where: { id }, data: { ingredientCount: count } });

    await logAudit(
      user.id,
      "deleted",
      "product_ingredient_spec",
      ingId,
      `${user.name} deleted ingredient "${spec.ingredientName}"`,
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    return handlePrismaError(err, "delete product ingredient spec");
  }
}
