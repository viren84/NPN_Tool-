import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/db/audit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const ingredient = await prisma.ingredient.findUnique({
    where: { id },
    include: { monographLinks: { include: { monograph: true } } },
  });
  if (!ingredient) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(ingredient);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const data = await req.json();
  const ingredient = await prisma.ingredient.update({ where: { id }, data });
  await logAudit(user.id, "updated", "ingredient_kb", id, `${user.name} updated "${ingredient.properNameEn}"`);
  return NextResponse.json(ingredient);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { id } = await params;
  const ingredient = await prisma.ingredient.findUnique({ where: { id } });
  await prisma.ingredient.delete({ where: { id } });
  await logAudit(user.id, "deleted", "ingredient_kb", id, `${user.name} deleted "${ingredient?.properNameEn}"`);
  return NextResponse.json({ success: true });
}
