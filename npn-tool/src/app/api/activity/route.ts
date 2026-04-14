import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, isErrorResponse } from "@/lib/auth/guard";

// GET — view activity logs
export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (isErrorResponse(user)) return user;

  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "100");
  const offset = parseInt(req.nextUrl.searchParams.get("offset") || "0");
  const userId = req.nextUrl.searchParams.get("userId") || "";
  const action = req.nextUrl.searchParams.get("action") || "";
  const from = req.nextUrl.searchParams.get("from") || "";
  const to = req.nextUrl.searchParams.get("to") || "";

  const where: Record<string, unknown> = {};
  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (from || to) {
    where.createdAt = {};
    if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from);
    if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to);
  }

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: { user: { select: { name: true, username: true, role: true } } },
    }),
    prisma.activityLog.count({ where }),
  ]);

  return NextResponse.json({ logs, total, limit, offset });
}
