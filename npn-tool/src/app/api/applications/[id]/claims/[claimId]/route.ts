import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireEditor, isErrorResponse } from "@/lib/auth/guard";
import { whitelistFields, CLAIM_FIELDS } from "@/lib/utils/whitelist";
import { parseJsonBody } from "@/lib/utils/parse-body";
import { handlePrismaError } from "@/lib/errors/handle-prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; claimId: string }> }
) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { claimId } = await params;
  const parsed = await parseJsonBody(req);
  if (parsed.error) return parsed.error;
  const data = whitelistFields(parsed.data, CLAIM_FIELDS);

  try {
    const claim = await prisma.claim.update({ where: { id: claimId }, data });
    return NextResponse.json(claim);
  } catch (err) {
    return handlePrismaError(err, "update claim");
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; claimId: string }> }
) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { claimId } = await params;
  try {
    await prisma.claim.delete({ where: { id: claimId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return handlePrismaError(err, "delete claim");
  }
}
