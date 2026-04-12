import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, requireEditor, isErrorResponse } from "@/lib/auth/guard";
import { logAudit } from "@/lib/db/audit";

export async function GET() {
  const user = await requireAuth();
  if (isErrorResponse(user)) return user;
  const facilities = await prisma.facility.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
  return NextResponse.json(facilities);
}

export async function POST(req: NextRequest) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;
  const data = await req.json();
  const facility = await prisma.facility.create({ data: { name: data.name || "New Facility", ...data } });
  await logAudit(user.id, "created", "facility", facility.id, `${user.name} added facility "${facility.name}"`);
  return NextResponse.json(facility, { status: 201 });
}
