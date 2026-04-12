import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, requireEditor, isErrorResponse } from "@/lib/auth/guard";
import { logAudit } from "@/lib/db/audit";

export async function GET() {
  const user = await requireAuth();
  if (isErrorResponse(user)) return user;
  const members = await prisma.teamMember.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
  return NextResponse.json(members);
}

export async function POST(req: NextRequest) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;
  const data = await req.json();
  const member = await prisma.teamMember.create({ data: { name: data.name || "New Member", ...data } });
  await logAudit(user.id, "created", "team_member", member.id, `${user.name} added team member "${member.name}"`);
  return NextResponse.json(member, { status: 201 });
}
