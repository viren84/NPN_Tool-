import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/db/audit";
import { resetClient } from "@/lib/ai/claude";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let settings = await prisma.appSettings.findUnique({ where: { id: "default" } });
  if (!settings) {
    settings = await prisma.appSettings.create({ data: { id: "default" } });
  }

  return NextResponse.json({
    ...settings,
    claudeApiKey: settings.claudeApiKey ? "••••••••" + settings.claudeApiKey.slice(-4) : "",
  });
}

export async function PUT(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const data = await req.json();

  const settings = await prisma.appSettings.upsert({
    where: { id: "default" },
    update: data,
    create: { id: "default", ...data },
  });

  if (data.claudeApiKey) resetClient();

  await logAudit(user.id, "updated", "settings", "default", `${user.name} updated app settings`);
  return NextResponse.json({ success: true, nhpidLastRefresh: settings.nhpidLastRefresh });
}
