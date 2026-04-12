import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";

// GET — export ingredients as JSON (filterable)
export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const type = req.nextUrl.searchParams.get("type") || "";
  const format = req.nextUrl.searchParams.get("format") || "json";

  const where: Record<string, unknown> = {};
  if (type) where.ingredientType = type;

  const ingredients = await prisma.ingredient.findMany({ where, orderBy: { properNameEn: "asc" } });

  if (format === "csv") {
    const headers = "nhpidId,nhpidName,ingredientType,properNameEn,properNameFr,commonNameEn,commonNameFr,scientificName,casNumber,molecularFormula,category,organismType,genus,species,family,grasStatus";
    const rows = ingredients.map(i =>
      [i.nhpidId, i.nhpidName, i.ingredientType, i.properNameEn, i.properNameFr, i.commonNameEn, i.commonNameFr, i.scientificName, i.casNumber, i.molecularFormula, i.category, i.organismType, i.genus, i.species, i.family, i.grasStatus]
        .map(v => `"${(v || "").toString().replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [headers, ...rows].join("\n");
    return new NextResponse(csv, {
      headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=ingredients_export.csv" },
    });
  }

  return NextResponse.json({ ingredients, total: ingredients.length });
}
