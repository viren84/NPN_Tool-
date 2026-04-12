import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireEditor, isErrorResponse } from "@/lib/auth/guard";
import { logAudit } from "@/lib/db/audit";
import { whitelistFields, INGREDIENT_FIELDS } from "@/lib/utils/whitelist";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; ingId: string }> }
) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { ingId } = await params;
  const raw = await req.json();
  const data = whitelistFields(raw, INGREDIENT_FIELDS);

  const ingredient = await prisma.medicinalIngredient.update({
    where: { id: ingId },
    data,
  });

  await logAudit(user.id, "updated", "ingredient", ingId,
    `${user.name} updated ingredient "${ingredient.properName}"`);

  return NextResponse.json(ingredient);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; ingId: string }> }
) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { ingId } = await params;
  const ingredient = await prisma.medicinalIngredient.findUnique({ where: { id: ingId } });

  await prisma.medicinalIngredient.delete({ where: { id: ingId } });

  await logAudit(user.id, "deleted", "ingredient", ingId,
    `${user.name} deleted ingredient "${ingredient?.properName}"`);

  return NextResponse.json({ success: true });
}
