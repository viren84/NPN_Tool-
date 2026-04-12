import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireEditor, isErrorResponse } from "@/lib/auth/guard";
import { whitelistFields, CLAIM_FIELDS } from "@/lib/utils/whitelist";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; claimId: string }> }
) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { claimId } = await params;
  const raw = await req.json();
  const data = whitelistFields(raw, CLAIM_FIELDS);

  const claim = await prisma.claim.update({ where: { id: claimId }, data });
  return NextResponse.json(claim);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; claimId: string }> }
) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { claimId } = await params;
  await prisma.claim.delete({ where: { id: claimId } });
  return NextResponse.json({ success: true });
}
