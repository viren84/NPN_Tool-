import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin, isErrorResponse } from "@/lib/auth/guard";

// GET — list audit reports (ADMIN ONLY)
export async function GET() {
  const user = await requireAdmin();
  if (isErrorResponse(user)) return user;

  const reports = await prisma.auditReport.findMany({
    orderBy: { periodEnd: "desc" },
    take: 12,
  });

  return NextResponse.json(reports);
}

// POST — generate audit report for a period (ADMIN ONLY)
export async function POST(req: NextRequest) {
  const user = await requireAdmin();
  if (isErrorResponse(user)) return user;

  const { periodStart, periodEnd } = await req.json();

  const start = new Date(periodStart || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const end = new Date(periodEnd || new Date());

  // Gather activity data
  const activities = await prisma.activityLog.findMany({
    where: { createdAt: { gte: start, lte: end } },
    include: { user: { select: { name: true, username: true, role: true } } },
  });

  // Gather audit data (data changes)
  const audits = await prisma.auditLog.findMany({
    where: { createdAt: { gte: start, lte: end } },
    include: { user: { select: { name: true, username: true } } },
  });

  // Build summary
  const summary = {
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    totalActivities: activities.length,
    totalDataChanges: audits.length,
    totalLogins: activities.filter(a => a.action === "login").length,
    totalViews: activities.filter(a => a.action === "view").length,
    totalDownloads: activities.filter(a => a.action === "download").length,
    totalUploads: activities.filter(a => a.action === "upload").length,
    totalSearches: activities.filter(a => a.action === "search").length,
    totalExports: activities.filter(a => a.action === "export").length,
    uniqueUsers: [...new Set(activities.map(a => a.userId))].length,
  };

  // Per-user breakdown
  const userMap: Record<string, {
    name: string; role: string; logins: number; views: number;
    downloads: number; uploads: number; changes: number;
  }> = {};

  for (const a of activities) {
    const key = a.userId;
    if (!userMap[key]) {
      userMap[key] = { name: a.user.name, role: a.user.role, logins: 0, views: 0, downloads: 0, uploads: 0, changes: 0 };
    }
    if (a.action === "login") userMap[key].logins++;
    if (a.action === "view") userMap[key].views++;
    if (a.action === "download") userMap[key].downloads++;
    if (a.action === "upload") userMap[key].uploads++;
  }

  for (const a of audits) {
    const key = a.userId;
    if (!userMap[key]) {
      userMap[key] = { name: a.user.name, role: "unknown", logins: 0, views: 0, downloads: 0, uploads: 0, changes: 0 };
    }
    userMap[key].changes++;
  }

  // Recent significant actions (downloads, exports, uploads — security relevant)
  const securityRelevant = activities
    .filter(a => ["download", "export", "upload", "login"].includes(a.action))
    .slice(0, 50)
    .map(a => ({
      user: a.user.name,
      action: a.action,
      entity: a.entityName || a.entityType,
      details: a.details,
      timestamp: a.createdAt,
    }));

  // Save report
  const report = await prisma.auditReport.create({
    data: {
      reportType: "monthly",
      periodStart: start,
      periodEnd: end,
      summaryJson: JSON.stringify(summary),
      detailsJson: JSON.stringify(securityRelevant),
      userBreakdown: JSON.stringify(userMap),
      status: "generated",
    },
  });

  return NextResponse.json(report, { status: 201 });
}
