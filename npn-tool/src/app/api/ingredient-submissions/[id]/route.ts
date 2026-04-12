import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, requireEditor, isErrorResponse } from "@/lib/auth/guard";
import { logAudit } from "@/lib/db/audit";

const ALLOWED_FIELDS = [
  "ingredientName", "scientificName", "casNumber", "molecularFormula", "molecularWeight",
  "classification", "schedule", "sourceOrganism", "sourceOrganismLatin", "sourcePart",
  "extractionMethod", "proposedProperName", "proposedCommonName", "grasStatus",
  "otherJurisdictions", "evidencePackageJson", "precedentIngredientsJson",
  "status", "nhpidRequestDate", "nhpidExpectedDate", "nhpidApprovalDate", "nhpidId", "notes",
];

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  if (isErrorResponse(user)) return user;

  const { id } = await params;
  const submission = await prisma.ingredientSubmission.findUnique({
    where: { id },
    include: {
      productStrategies: true,
      createdBy: { select: { name: true } },
    },
  });
  if (!submission) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(submission);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { id } = await params;
  const raw = await req.json();

  // Whitelist fields
  const data: Record<string, unknown> = {};
  for (const field of ALLOWED_FIELDS) {
    if (field in raw && raw[field] !== undefined) {
      let val = raw[field];
      // Stringify JSON fields
      if (typeof val === "object" && val !== null && ["otherJurisdictions", "evidencePackageJson", "precedentIngredientsJson"].includes(field)) {
        val = JSON.stringify(val);
      }
      data[field] = val;
    }
  }

  const submission = await prisma.ingredientSubmission.update({ where: { id }, data });
  await logAudit(user.id, "updated", "ingredient_submission", id,
    `${user.name} updated NHPID submission for "${submission.ingredientName}"`);
  return NextResponse.json(submission);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { id } = await params;
  await prisma.ingredientSubmission.delete({ where: { id } });
  await logAudit(user.id, "deleted", "ingredient_submission", id, `${user.name} deleted an NHPID submission`);
  return NextResponse.json({ success: true });
}
