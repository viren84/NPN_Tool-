import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { setSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/db/audit";
import { trackActivity } from "@/lib/tracking/activity";
import { parseJsonBody } from "@/lib/utils/parse-body";

export async function POST(req: NextRequest) {
  const parsed = await parseJsonBody<{ username: unknown; password: unknown }>(req);
  if (parsed.error) return parsed.error;
  const { username, password } = parsed.data;

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password required" }, { status: 400 });
  }
  if (typeof username !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Username and password must be strings" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const valid = await verifyPassword(password, user.password);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  await setSession(user.id);
  await logAudit(user.id, "login", "user", user.id, `${user.name} logged in`);
  trackActivity(user.id, "login", {
    entityType: "user", entityId: user.id, entityName: user.name,
    ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "",
    userAgent: req.headers.get("user-agent") || "",
  });

  return NextResponse.json({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
  });
}
