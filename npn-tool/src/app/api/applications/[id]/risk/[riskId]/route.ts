import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireEditor, isErrorResponse } from "@/lib/auth/guard";
import { whitelistFields, RISK_FIELDS } from "@/lib/utils/whitelist";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; riskId: string }> }
) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { riskId } = await params;
  const raw = await req.json();
  const data = whitelistFields(raw, RISK_FIELDS);

  const risk = await prisma.riskInfo.update({ where: { id: riskId }, data });
  return NextResponse.json(risk);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; riskId: string }> }
) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { riskId } = await params;
  await prisma.riskInfo.delete({ where: { id: riskId } });
  return NextResponse.json({ success: true });
}
