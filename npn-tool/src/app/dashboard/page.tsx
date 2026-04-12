import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const [applications, recentLogs, activeLicences, ingredientCount, submissionCount] = await Promise.all([
    prisma.application.findMany({
      orderBy: { updatedAt: "desc" },
      take: 10,
      include: { createdBy: { select: { name: true } } },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { user: { select: { name: true } } },
    }),
    prisma.productLicence.count({ where: { productStatus: "active" } }),
    prisma.ingredient.count(),
    prisma.ingredientSubmission.count(),
  ]);

  // Filter out repetitive/noisy log entries for cleaner activity feed
  const cleanLogs = recentLogs.filter(log =>
    !log.details.includes("0 imported, 0 duplicates") &&
    !log.details.includes("0 imported")
  );

  const stats = {
    totalApplications: applications.length,
    drafts: applications.filter((a) => a.status === "draft").length,
    submitted: applications.filter((a) => a.status === "submitted").length,
    activeLicences,
    ingredientCount,
    submissionCount,
  };

  return (
    <DashboardClient
      user={user}
      applications={applications as never}
      recentLogs={cleanLogs as never}
      stats={stats}
    />
  );
}
