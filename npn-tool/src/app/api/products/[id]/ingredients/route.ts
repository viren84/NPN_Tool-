import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, requireEditor, isErrorResponse } from "@/lib/auth/guard";
import { logAudit } from "@/lib/db/audit";
import { parseJsonBody } from "@/lib/utils/parse-body";
import { handlePrismaError } from "@/lib/errors/handle-prisma";

/**
 * GET /api/products/[id]/ingredients
 * List all ingredient specs for a product.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth();
  if (isErrorResponse(user)) return user;

  const { id } = await params;

  try {
    const specs = await prisma.productIngredientSpec.findMany({
      where: { productId: id },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(specs);
  } catch (err) {
    return handlePrismaError(err, "list product ingredient specs");
  }
}

/**
 * POST /api/products/[id]/ingredients
 * Add an ingredient spec to the product formulation.
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

    const ingredientName = ((body.ingredientName as string) || "").trim();
    if (!ingredientName) {
      return NextResponse.json({ error: "ingredientName is required" }, { status: 400 });
    }

    // Auto-assign sort order
    const maxOrder = await prisma.productIngredientSpec.aggregate({
      where: { productId: id },
      _max: { sortOrder: true },
    });
    const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    const spec = await prisma.productIngredientSpec.create({
      data: {
        productId: id,
        sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : nextOrder,
        ingredientName,
        properName: ((body.properName as string) || "").trim(),
        commonName: ((body.commonName as string) || "").trim(),
        scientificName: ((body.scientificName as string) || "").trim(),
        ingredientType: ((body.ingredientType as string) || "medicinal").trim(),
        supplierName: ((body.supplierName as string) || "").trim(),
        supplierCountry: ((body.supplierCountry as string) || "").trim(),
        coaDocumentId: ((body.coaDocumentId as string) || "").trim(),
        targetDose: typeof body.targetDose === "number" ? body.targetDose : 0,
        targetUnit: ((body.targetUnit as string) || "mg").trim(),
        doseRangeMin: typeof body.doseRangeMin === "number" ? body.doseRangeMin : 0,
        doseRangeMax: typeof body.doseRangeMax === "number" ? body.doseRangeMax : 0,
        standardization: ((body.standardization as string) || "").trim(),
        extractRatio: ((body.extractRatio as string) || "").trim(),
        sourceOrganism: ((body.sourceOrganism as string) || "").trim(),
        partUsed: ((body.partUsed as string) || "").trim(),
        monographName: ((body.monographName as string) || "").trim(),
        monographCompliant: body.monographCompliant === true,
        status: "draft",
        notes: ((body.notes as string) || "").trim(),
      },
    });

    // Update product ingredient count
    const count = await prisma.productIngredientSpec.count({ where: { productId: id } });
    await prisma.product.update({ where: { id }, data: { ingredientCount: count } });

    await logAudit(
      user.id,
      "created",
      "product_ingredient_spec",
      spec.id,
      `${user.name} added ingredient "${ingredientName}" to product "${product.name}"`,
    );

    return NextResponse.json(spec, { status: 201 });
  } catch (err) {
    return handlePrismaError(err, "create product ingredient spec");
  }
}
