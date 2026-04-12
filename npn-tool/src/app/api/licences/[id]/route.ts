import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, requireEditor, requireAdmin, isErrorResponse } from "@/lib/auth/guard";
import { logAudit } from "@/lib/db/audit";
import { whitelistFields, LICENCE_FIELDS } from "@/lib/utils/whitelist";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  if (isErrorResponse(user)) return user;

  const { id } = await params;
  const licence = await prisma.productLicence.findUnique({
    where: { id },
    include: { amendments: { orderBy: { createdAt: "desc" } } },
  });
  if (!licence) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(licence);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { id } = await params;
  const raw = await req.json();
  const data = whitelistFields(raw, LICENCE_FIELDS);

  const licence = await prisma.productLicence.update({ where: { id }, data });
  await logAudit(user.id, "updated", "licence", id, `${user.name} updated NPN ${licence.licenceNumber}`);
  return NextResponse.json(licence);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { id } = await params;
  try {
    await prisma.productLicence.delete({ where: { id } });
    await logAudit(user.id, "deleted", "licence", id, `${user.name} deleted a licence`);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Delete failed" }, { status: 500 });
  }
}
