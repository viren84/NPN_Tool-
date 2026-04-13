import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, isErrorResponse } from "@/lib/auth/guard";

export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (isErrorResponse(user)) return user;

  const entityType = req.nextUrl.searchParams.get("entityType") || undefined;
  const action = req.nextUrl.searchParams.get("action") || undefined;

  const where: Record<string, string> = {};
  if (entityType) where.entityType = entityType;
  if (action) where.action = action;

  const entries = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      userId: true,
      changes: true,
      createdAt: true,
    },
  });

  return NextResponse.json(entries);
}
