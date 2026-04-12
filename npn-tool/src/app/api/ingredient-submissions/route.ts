import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/db/audit";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const submissions = await prisma.ingredientSubmission.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      productStrategies: true,
      createdBy: { select: { name: true } },
    },
  });
  return NextResponse.json(submissions);
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "viewer") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const data = await req.json();

  const submission = await prisma.ingredientSubmission.create({
    data: {
      ingredientName: data.ingredientName || "",
      scientificName: data.scientificName || "",
      casNumber: data.casNumber || "",
      molecularFormula: data.molecularFormula || "",
      molecularWeight: data.molecularWeight || null,
      classification: data.classification || "medicinal",
      schedule: data.schedule || "",
      sourceOrganism: data.sourceOrganism || "",
      sourceOrganismLatin: data.sourceOrganismLatin || "",
      sourcePart: data.sourcePart || "",
      extractionMethod: data.extractionMethod || "",
      proposedProperName: data.proposedProperName || "",
      proposedCommonName: data.proposedCommonName || "",
      grasStatus: data.grasStatus || "",
      otherJurisdictions: typeof data.otherJurisdictions === "string" ? data.otherJurisdictions : JSON.stringify(data.otherJurisdictions || {}),
      evidencePackageJson: typeof data.evidencePackageJson === "string" ? data.evidencePackageJson : JSON.stringify(data.evidencePackageJson || []),
      precedentIngredientsJson: typeof data.precedentIngredientsJson === "string" ? data.precedentIngredientsJson : JSON.stringify(data.precedentIngredientsJson || []),
      notes: data.notes || "",
      createdById: user.id,
    },
  });

  // Create product strategies if provided
  if (data.productStrategies && Array.isArray(data.productStrategies)) {
    for (const ps of data.productStrategies) {
      await prisma.productStrategy.create({
        data: {
          submissionId: submission.id,
          productName: ps.productName || "",
          productType: ps.productType || "single",
          applicationClass: ps.applicationClass || "III",
          dosageForm: ps.dosageForm || "",
          dosageAmount: ps.dosageAmount || "",
          combinationIngredients: typeof ps.combinationIngredients === "string" ? ps.combinationIngredients : JSON.stringify(ps.combinationIngredients || []),
          proposedClaims: typeof ps.proposedClaims === "string" ? ps.proposedClaims : JSON.stringify(ps.proposedClaims || []),
          targetTimeline: ps.targetTimeline || "",
        },
      });
    }
  }

  await logAudit(user.id, "created", "ingredient_submission", submission.id,
    `${user.name} created NHPID submission for "${submission.ingredientName}"`);

  return NextResponse.json(submission, { status: 201 });
}
