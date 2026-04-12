import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireEditor, isErrorResponse } from "@/lib/auth/guard";
import { whitelistFields, DOSAGE_FIELDS } from "@/lib/utils/whitelist";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; dosageId: string }> }
) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { dosageId } = await params;
  const raw = await req.json();
  const data = whitelistFields(raw, DOSAGE_FIELDS);

  const group = await prisma.dosageGroup.update({ where: { id: dosageId }, data });
  return NextResponse.json(group);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; dosageId: string }> }
) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { dosageId } = await params;
  await prisma.dosageGroup.delete({ where: { id: dosageId } });
  return NextResponse.json({ success: true });
}
