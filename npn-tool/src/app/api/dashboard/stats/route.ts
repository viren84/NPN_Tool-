import { NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/auth/guard";
import { prisma } from "@/lib/db/prisma";

// GET — dashboard stats for all stat cards
export async function GET() {
  const user = await requireAuth();
  if (isErrorResponse(user)) return user;

  const [
    totalLicences,
    activeLicences,
    totalApplications,
    totalIngredients,
    totalDocuments,
  ] = await Promise.all([
    prisma.productLicence.count(),
    prisma.productLicence.count({ where: { productStatus: "active" } }),
    prisma.application.count(),
    prisma.ingredient.count(),
    prisma.generatedDocument.count(),
  ]);

  return NextResponse.json({
    totalLicences,
    activeLicences,
    totalApplications,
    totalIngredients,
    totalDocuments,
  });
}
