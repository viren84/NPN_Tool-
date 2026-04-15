import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";

/**
 * GET /api/ingredients/{id}/usage
 * Returns everywhere this ingredient is used:
 * - ProductLicences (matches by name in medicinalIngredientsJson)
 * - Applications (matches via MedicinalIngredient table)
 * - Products (pipeline — matches via ProductIngredientSpec)
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const ingredient = await prisma.ingredient.findUnique({ where: { id } });
    if (!ingredient) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Build name match candidates (lowercase for comparison)
    const names = [
      ingredient.properNameEn, ingredient.commonNameEn, ingredient.nhpidName,
      ingredient.scientificName,
    ].filter(Boolean).map(n => n!.toLowerCase().trim());

    // Licences — search by substring in medicinalIngredientsJson + nonMedIngredientsJson
    const licences = await prisma.productLicence.findMany({
      select: { id: true, licenceNumber: true, productName: true, productStatus: true, medicinalIngredientsJson: true, nonMedIngredientsJson: true },
    });

    const matchingLicences = licences.filter(lic => {
      const combined = ((lic.medicinalIngredientsJson || "") + (lic.nonMedIngredientsJson || "")).toLowerCase();
      return names.some(name => combined.includes(name));
    }).map(l => ({ id: l.id, licenceNumber: l.licenceNumber, productName: l.productName, productStatus: l.productStatus }));

    // Applications — match via MedicinalIngredient table
    const appIngredients = await prisma.medicinalIngredient.findMany({
      where: {
        OR: [
          ingredient.nhpidName ? { nhpidName: { contains: ingredient.nhpidName } } : {},
          ingredient.properNameEn ? { properName: { contains: ingredient.properNameEn } } : {},
          ingredient.commonNameEn ? { commonName: { contains: ingredient.commonNameEn } } : {},
        ].filter(o => Object.keys(o).length > 0),
      },
      select: { applicationId: true, application: { select: { id: true, productName: true, status: true, applicationClass: true } } },
    });
    const applicationMap = new Map<string, { id: string; productName: string; status: string; applicationClass: string }>();
    for (const ai of appIngredients) if (ai.application) applicationMap.set(ai.application.id, ai.application);
    const applications = Array.from(applicationMap.values());

    // Products (pipeline) — match via ProductIngredientSpec
    const productSpecs = await prisma.productIngredientSpec.findMany({
      where: {
        OR: [
          ingredient.properNameEn ? { properName: { contains: ingredient.properNameEn } } : {},
          ingredient.commonNameEn ? { commonName: { contains: ingredient.commonNameEn } } : {},
          ingredient.nhpidName ? { ingredientName: { contains: ingredient.nhpidName } } : {},
        ].filter(o => Object.keys(o).length > 0),
      },
      select: { productId: true, product: { select: { id: true, name: true, stage: true } } },
    });
    const productMap = new Map<string, { id: string; name: string; stage: string }>();
    for (const ps of productSpecs) if (ps.product) productMap.set(ps.product.id, ps.product);
    const products = Array.from(productMap.values());

    return NextResponse.json({
      licences: matchingLicences,
      applications,
      products,
      totals: {
        licences: matchingLicences.length,
        applications: applications.length,
        products: products.length,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Usage query failed" }, { status: 500 });
  }
}
