import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/db/audit";
import { sanitizeHtml } from "@/lib/utils/sanitize";

// GET — list all medicinal ingredients for an application
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const ingredients = await prisma.medicinalIngredient.findMany({
    where: { applicationId: id },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(ingredients);
}

// POST — add a SINGLE new ingredient (not replace all)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "viewer") return NextResponse.json({ error: "Viewers cannot edit" }, { status: 403 });

  const { id } = await params;
  const data = await req.json();

  // Get current max sortOrder
  const existing = await prisma.medicinalIngredient.findMany({
    where: { applicationId: id },
    orderBy: { sortOrder: "desc" },
    take: 1,
  });
  const nextOrder = existing.length > 0 ? existing[0].sortOrder + 1 : 0;

  const ingredient = await prisma.medicinalIngredient.create({
    data: {
      applicationId: id,
      sortOrder: nextOrder,
      properName: sanitizeHtml(data.properName || ""),
      commonName: sanitizeHtml(data.commonName || ""),
      scientificName: sanitizeHtml(data.scientificName || ""),
      nhpidName: sanitizeHtml(data.nhpidName || data.properName || ""),
      casNumber: data.casNumber || "",
      quantity: data.quantity || 0,
      quantityUnit: data.quantityUnit || "mg",
      potency: data.potency || null,
      potencyUnit: data.potencyUnit || "",
      standardization: data.standardization || "",
      sourceMaterial: sanitizeHtml(data.sourceMaterial || ""),
      organismPart: data.organismPart || "",
      extractType: data.extractType || "",
      extractSolvent: data.extractSolvent || "",
      extractRatio: data.extractRatio || "",
      driedHerbEquiv: data.driedHerbEquiv || "",
      syntheticFlag: data.syntheticFlag || false,
      nanomaterialFlag: data.nanomaterialFlag || false,
      animalTissueFlag: data.animalTissueFlag || false,
      animalSource: data.animalSource || "",
      monographName: data.monographName || "",
      monographCompliant: data.monographCompliant || false,
      supplierName: data.supplierName || "",
      coaReference: data.coaReference || "",
    },
  });

  // Update application animal tissue flag
  await updateAnimalTissueFlag(id);

  await logAudit(user.id, "created", "ingredient", ingredient.id,
    `${user.name} added ingredient "${ingredient.properName}" to application`);

  return NextResponse.json(ingredient, { status: 201 });
}

async function updateAnimalTissueFlag(applicationId: string) {
  const medIngredients = await prisma.medicinalIngredient.findMany({
    where: { applicationId, animalTissueFlag: true },
  });
  const nonMedIngredients = await prisma.nonMedicinalIngredient.findMany({
    where: { applicationId, animalTissueFlag: true },
  });
  const hasAnimal = medIngredients.length > 0 || nonMedIngredients.length > 0;
  await prisma.application.update({
    where: { id: applicationId },
    data: { animalTissue: hasAnimal },
  });
}
