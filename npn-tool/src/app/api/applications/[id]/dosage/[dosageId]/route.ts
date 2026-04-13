import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireEditor, isErrorResponse } from "@/lib/auth/guard";
import { whitelistFields, DOSAGE_FIELDS } from "@/lib/utils/whitelist";
import { parseJsonBody } from "@/lib/utils/parse-body";
import { handlePrismaError } from "@/lib/errors/handle-prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; dosageId: string }> }
) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { dosageId } = await params;
  const parsed = await parseJsonBody(req);
  if (parsed.error) return parsed.error;
  const data = whitelistFields(parsed.data, DOSAGE_FIELDS);

  try {
    const group = await prisma.dosageGroup.update({ where: { id: dosageId }, data });
    return NextResponse.json(group);
  } catch (err) {
    return handlePrismaError(err, "update dosage");
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; dosageId: string }> }
) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { dosageId } = await params;
  try {
    await prisma.dosageGroup.delete({ where: { id: dosageId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return handlePrismaError(err, "delete dosage");
  }
}
