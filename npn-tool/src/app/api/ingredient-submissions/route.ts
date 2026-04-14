import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/db/audit";
import { parseJsonBody } from "@/lib/utils/parse-body";
import { handlePrismaError } from "@/lib/errors/handle-prisma";

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

  const parsed = await parseJsonBody<Record<string, unknown>>(req);
  if (parsed.error) return parsed.error;
  const data = parsed.data;

  // ingredientName must be a non-empty string
  if (!data.ingredientName || typeof data.ingredientName !== "string" || !data.ingredientName.trim()) {
    return NextResponse.json({ error: "ingredientName is required and must not be empty" }, { status: 400 });
  }

  try {
  const s = (k: string, fb = "") => typeof data[k] === "string" ? (data[k] as string) : fb;
  const submission = await prisma.ingredientSubmission.create({
    data: {
      ingredientName: s("ingredientName", "New Ingredient"),
      scientificName: s("scientificName"),
      casNumber: s("casNumber"),
      molecularFormula: s("molecularFormula"),
      molecularWeight: typeof data.molecularWeight === "number" ? data.molecularWeight : null,
      classification: s("classification", "medicinal"),
      schedule: s("schedule"),
      sourceOrganism: s("sourceOrganism"),
      sourceOrganismLatin: s("sourceOrganismLatin"),
      sourcePart: s("sourcePart"),
      extractionMethod: s("extractionMethod"),
      proposedProperName: s("proposedProperName"),
      proposedCommonName: s("proposedCommonName"),
      grasStatus: s("grasStatus"),
      otherJurisdictions: typeof data.otherJurisdictions === "string" ? data.otherJurisdictions : JSON.stringify(data.otherJurisdictions || {}),
      evidencePackageJson: typeof data.evidencePackageJson === "string" ? data.evidencePackageJson : JSON.stringify(data.evidencePackageJson || []),
      precedentIngredientsJson: typeof data.precedentIngredientsJson === "string" ? data.precedentIngredientsJson : JSON.stringify(data.precedentIngredientsJson || []),
      notes: s("notes"),
      createdById: user.id,
    },
  });

  // Create product strategies if provided
  if (data.productStrategies && Array.isArray(data.productStrategies)) {
    for (const ps of data.productStrategies) {
      const sp = (k: string, fb = "") => typeof ps[k] === "string" ? (ps[k] as string) : fb;
      await prisma.productStrategy.create({
        data: {
          submissionId: submission.id,
          productName: sp("productName", "New Product"),
          productType: sp("productType", "single"),
          applicationClass: sp("applicationClass", "III"),
          dosageForm: sp("dosageForm"),
          dosageAmount: sp("dosageAmount"),
          combinationIngredients: typeof ps.combinationIngredients === "string" ? ps.combinationIngredients : JSON.stringify(ps.combinationIngredients || []),
          proposedClaims: typeof ps.proposedClaims === "string" ? ps.proposedClaims : JSON.stringify(ps.proposedClaims || []),
          targetTimeline: sp("targetTimeline"),
        },
      });
    }
  }

  await logAudit(user.id, "created", "ingredient_submission", submission.id,
    `${user.name} created NHPID submission for "${submission.ingredientName}"`);

  return NextResponse.json(submission, { status: 201 });
  } catch (err) {
    return handlePrismaError(err, "create submission");
  }
}
