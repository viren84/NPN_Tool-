import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireEditor, isErrorResponse } from "@/lib/auth/guard";
import { logAudit } from "@/lib/db/audit";
import { whitelistFields, INGREDIENT_FIELDS } from "@/lib/utils/whitelist";
import { parseJsonBody } from "@/lib/utils/parse-body";
import { handlePrismaError } from "@/lib/errors/handle-prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; ingId: string }> }
) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { ingId } = await params;
  const parsed = await parseJsonBody(req);
  if (parsed.error) return parsed.error;
  const data = whitelistFields(parsed.data, INGREDIENT_FIELDS);

  try {
    const ingredient = await prisma.medicinalIngredient.update({
      where: { id: ingId },
      data,
    });
    await logAudit(user.id, "updated", "ingredient", ingId,
      `${user.name} updated ingredient "${ingredient.properName}"`);
    return NextResponse.json(ingredient);
  } catch (err) {
    return handlePrismaError(err, "update ingredient");
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; ingId: string }> }
) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { ingId } = await params;

  try {
    const ingredient = await prisma.medicinalIngredient.findUnique({ where: { id: ingId } });
    if (!ingredient) return NextResponse.json({ error: "Ingredient not found" }, { status: 404 });
    await prisma.medicinalIngredient.delete({ where: { id: ingId } });
    await logAudit(user.id, "deleted", "ingredient", ingId,
      `${user.name} deleted ingredient "${ingredient.properName}"`);
    return NextResponse.json({ success: true });
  } catch (err) {
    return handlePrismaError(err, "delete ingredient");
  }
}
