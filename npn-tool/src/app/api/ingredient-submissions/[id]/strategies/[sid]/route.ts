import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireEditor, isErrorResponse } from "@/lib/auth/guard";
import { logAudit } from "@/lib/db/audit";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; sid: string }> }) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { sid } = await params;
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const FIELDS = ["productName", "productType", "applicationClass", "dosageForm", "dosageAmount",
    "combinationIngredients", "proposedClaims", "targetTimeline", "status", "notes", "applicationId"];

  const data: Record<string, unknown> = {};
  for (const f of FIELDS) {
    if (f in body) {
      const v = body[f];
      if ((f === "combinationIngredients" || f === "proposedClaims") && typeof v !== "string") {
        data[f] = JSON.stringify(v || []);
      } else {
        data[f] = v;
      }
    }
  }

  const strategy = await prisma.productStrategy.update({ where: { id: sid }, data });
  await logAudit(user.id, "updated", "product_strategy", sid,
    `${user.name} updated product strategy "${strategy.productName}"`);
  return NextResponse.json(strategy);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; sid: string }> }) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { sid } = await params;
  await prisma.productStrategy.delete({ where: { id: sid } });
  await logAudit(user.id, "deleted", "product_strategy", sid, `${user.name} deleted a product strategy`);
  return NextResponse.json({ success: true });
}
