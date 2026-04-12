import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireEditor, isErrorResponse } from "@/lib/auth/guard";
import { logAudit } from "@/lib/db/audit";
import { whitelistFields, NON_MED_FIELDS } from "@/lib/utils/whitelist";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; nmId: string }> }
) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { nmId } = await params;
  const raw = await req.json();
  const data = whitelistFields(raw, NON_MED_FIELDS);

  const item = await prisma.nonMedicinalIngredient.update({
    where: { id: nmId },
    data,
  });

  await logAudit(user.id, "updated", "non_med_ingredient", nmId,
    `${user.name} updated non-med ingredient "${item.ingredientName}"`);

  return NextResponse.json(item);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; nmId: string }> }
) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { nmId } = await params;
  const item = await prisma.nonMedicinalIngredient.findUnique({ where: { id: nmId } });
  await prisma.nonMedicinalIngredient.delete({ where: { id: nmId } });

  await logAudit(user.id, "deleted", "non_med_ingredient", nmId,
    `${user.name} deleted non-med ingredient "${item?.ingredientName}"`);

  return NextResponse.json({ success: true });
}
