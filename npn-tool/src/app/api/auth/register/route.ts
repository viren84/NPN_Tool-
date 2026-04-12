import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { setSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/db/audit";

export async function POST(req: NextRequest) {
  const { username, password, name, email, role } = await req.json();

  if (!username || !password || !name) {
    return NextResponse.json({ error: "Username, password, and name required" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json({ error: "Username already taken" }, { status: 409 });
  }

  // First user becomes admin. Subsequent users are always "editor" — only admins can promote via user management.
  const userCount = await prisma.user.count();
  const assignedRole = userCount === 0 ? "admin" : "editor"; // NEVER trust client-supplied role

  const hashedPw = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      username,
      password: hashedPw,
      name,
      email: email || null,
      role: assignedRole,
    },
  });

  // If first user, also seed the company profile
  if (userCount === 0) {
    await prisma.companyProfile.create({ data: {} });
  }

  await setSession(user.id);
  await logAudit(user.id, "created", "user", user.id, `User ${user.name} registered as ${assignedRole}`);

  return NextResponse.json({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    isFirstUser: userCount === 0,
  });
}
