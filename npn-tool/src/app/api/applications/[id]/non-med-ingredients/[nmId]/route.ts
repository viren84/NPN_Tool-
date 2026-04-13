import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireEditor, isErrorResponse } from "@/lib/auth/guard";
import { logAudit } from "@/lib/db/audit";
import { whitelistFields, NON_MED_FIELDS } from "@/lib/utils/whitelist";
import { parseJsonBody } from "@/lib/utils/parse-body";
import { handlePrismaError } from "@/lib/errors/handle-prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; nmId: string }> }
) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { nmId } = await params;
  const parsed = await parseJsonBody(req);
  if (parsed.error) return parsed.error;
  const data = whitelistFields(parsed.data, NON_MED_FIELDS);

  try {
    const item = await prisma.nonMedicinalIngredient.update({
      where: { id: nmId },
      data,
    });
    await logAudit(user.id, "updated", "non_med_ingredient", nmId,
      `${user.name} updated non-med ingredient "${item.ingredientName}"`);
    return NextResponse.json(item);
  } catch (err) {
    return handlePrismaError(err, "update non-med");
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; nmId: string }> }
) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { nmId } = await params;
  try {
    const item = await prisma.nonMedicinalIngredient.findUnique({ where: { id: nmId } });
    if (!item) return NextResponse.json({ error: "Non-med ingredient not found" }, { status: 404 });
    await prisma.nonMedicinalIngredient.delete({ where: { id: nmId } });
    await logAudit(user.id, "deleted", "non_med_ingredient", nmId,
      `${user.name} deleted non-med ingredient "${item.ingredientName}"`);
    return NextResponse.json({ success: true });
  } catch (err) {
    return handlePrismaError(err, "delete non-med");
  }
}
