import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireEditor, isErrorResponse } from "@/lib/auth/guard";
import { whitelistFields, RISK_FIELDS } from "@/lib/utils/whitelist";
import { parseJsonBody } from "@/lib/utils/parse-body";
import { handlePrismaError } from "@/lib/errors/handle-prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; riskId: string }> }
) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { riskId } = await params;
  const parsed = await parseJsonBody(req);
  if (parsed.error) return parsed.error;
  const data = whitelistFields(parsed.data, RISK_FIELDS);

  try {
    const risk = await prisma.riskInfo.update({ where: { id: riskId }, data });
    return NextResponse.json(risk);
  } catch (err) {
    return handlePrismaError(err, "update risk");
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; riskId: string }> }
) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { riskId } = await params;
  try {
    await prisma.riskInfo.delete({ where: { id: riskId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return handlePrismaError(err, "delete risk");
  }
}
