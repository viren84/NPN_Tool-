import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/db/audit";
import { sanitizeHtml } from "@/lib/utils/sanitize";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const claims = await prisma.claim.findMany({
    where: { applicationId: id },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(claims);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "viewer") return NextResponse.json({ error: "Viewers cannot edit" }, { status: 403 });

  const { id } = await params;
  const data = await req.json();

  // Handle bulk add from monograph
  if (Array.isArray(data)) {
    const existing = await prisma.claim.count({ where: { applicationId: id } });
    let order = existing;
    const created = [];
    for (const claim of data) {
      const item = await prisma.claim.create({
        data: {
          applicationId: id,
          sortOrder: order++,
          claimTextEn: sanitizeHtml(claim.claimTextEn),
          claimTextFr: claim.claimTextFr || "",
          fromMonograph: claim.fromMonograph || false,
          monographName: claim.monographName || "",
          linkedIngredientIds: JSON.stringify(claim.linkedIngredientIds || []),
          claimType: claim.claimType || "health",
          selected: claim.selected !== false,
        },
      });
      created.push(item);
    }
    await logAudit(user.id, "created", "claim", id, `${user.name} added ${created.length} claims`);
    return NextResponse.json(created, { status: 201 });
  }

  // Single claim
  const count = await prisma.claim.count({ where: { applicationId: id } });
  const claim = await prisma.claim.create({
    data: {
      applicationId: id,
      sortOrder: count,
      claimTextEn: sanitizeHtml(data.claimTextEn),
      claimTextFr: data.claimTextFr || "",
      fromMonograph: data.fromMonograph || false,
      monographName: data.monographName || "",
      linkedIngredientIds: JSON.stringify(data.linkedIngredientIds || []),
      claimType: data.claimType || "health",
      selected: data.selected !== false,
    },
  });

  await logAudit(user.id, "created", "claim", claim.id, `${user.name} added claim`);
  return NextResponse.json(claim, { status: 201 });
}
