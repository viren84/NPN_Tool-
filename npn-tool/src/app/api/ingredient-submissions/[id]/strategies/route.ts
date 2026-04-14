import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireEditor, isErrorResponse } from "@/lib/auth/guard";
import { logAudit } from "@/lib/db/audit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { id } = await params;
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const submission = await prisma.ingredientSubmission.findUnique({ where: { id } });
  if (!submission) return NextResponse.json({ error: "Submission not found" }, { status: 404 });

  const strategy = await prisma.productStrategy.create({
    data: {
      submissionId: id,
      productName: (body.productName as string) || "New Product",
      productType: (body.productType as string) || "single",
      applicationClass: (body.applicationClass as string) || "III",
      dosageForm: (body.dosageForm as string) || "",
      dosageAmount: (body.dosageAmount as string) || "",
      combinationIngredients: typeof body.combinationIngredients === "string"
        ? body.combinationIngredients
        : JSON.stringify(body.combinationIngredients || []),
      proposedClaims: typeof body.proposedClaims === "string"
        ? body.proposedClaims
        : JSON.stringify(body.proposedClaims || []),
      targetTimeline: (body.targetTimeline as string) || "",
      status: (body.status as string) || "planned",
      notes: (body.notes as string) || "",
    },
  });

  await logAudit(user.id, "created", "product_strategy", strategy.id,
    `${user.name} added product strategy "${strategy.productName}" to submission ${id}`);

  return NextResponse.json(strategy, { status: 201 });
}
