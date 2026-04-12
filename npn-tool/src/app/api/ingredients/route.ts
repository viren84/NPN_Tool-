import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/db/audit";

// GET — search/list ingredients in knowledge base
export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q") || "";
  const type = req.nextUrl.searchParams.get("type") || ""; // medicinal, non_medicinal
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50");
  const offset = parseInt(req.nextUrl.searchParams.get("offset") || "0");

  const where: Record<string, unknown> = {};
  if (type) where.ingredientType = type;
  if (q) {
    where.OR = [
      { properNameEn: { contains: q } },
      { commonNameEn: { contains: q } },
      { scientificName: { contains: q } },
      { nhpidName: { contains: q } },
      { casNumber: { contains: q } },
    ];
  }

  const [ingredients, total] = await Promise.all([
    prisma.ingredient.findMany({ where, take: limit, skip: offset, orderBy: { properNameEn: "asc" } }),
    prisma.ingredient.count({ where }),
  ]);

  return NextResponse.json({ ingredients, total, limit, offset });
}

// POST — add ingredient to knowledge base (single or bulk)
export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "viewer") return NextResponse.json({ error: "Viewers cannot create" }, { status: 403 });

  const data = await req.json();

  // Bulk import
  if (Array.isArray(data)) {
    let created = 0, skipped = 0;
    for (const item of data) {
      try {
        await prisma.ingredient.create({ data: mapIngredientData(item) });
        created++;
      } catch {
        skipped++; // likely duplicate nhpidId
      }
    }
    await logAudit(user.id, "created", "ingredient_kb", "bulk", `${user.name} imported ${created} ingredients (${skipped} skipped)`);
    return NextResponse.json({ created, skipped }, { status: 201 });
  }

  // Single
  const ingredient = await prisma.ingredient.create({ data: mapIngredientData(data) });
  await logAudit(user.id, "created", "ingredient_kb", ingredient.id, `${user.name} added "${ingredient.properNameEn}" to knowledge base`);
  return NextResponse.json(ingredient, { status: 201 });
}

function mapIngredientData(data: Record<string, unknown>) {
  return {
    nhpidId: (data.nhpidId as string) || null,
    nhpidName: (data.nhpidName as string) || "",
    ingredientType: (data.ingredientType as string) || "medicinal",
    category: (data.category as string) || "",
    subCategory: (data.subCategory as string) || "",
    casNumber: (data.casNumber as string) || "",
    unii: (data.unii as string) || "",
    schedule1: (data.schedule1 as boolean) || false,
    status: (data.status as string) || "active",
    properNameEn: (data.properNameEn as string) || "",
    properNameFr: (data.properNameFr as string) || "",
    commonNameEn: (data.commonNameEn as string) || "",
    commonNameFr: (data.commonNameFr as string) || "",
    scientificName: (data.scientificName as string) || "",
    synonyms: typeof data.synonyms === "string" ? data.synonyms : JSON.stringify(data.synonyms || []),
    molecularFormula: (data.molecularFormula as string) || "",
    molecularWeight: (data.molecularWeight as number) || null,
    chemicalClass: (data.chemicalClass as string) || "",
    chemicalSubclass: (data.chemicalSubclass as string) || "",
    organismType: (data.organismType as string) || "",
    genus: (data.genus as string) || "",
    species: (data.species as string) || "",
    family: (data.family as string) || "",
    partsUsed: typeof data.partsUsed === "string" ? data.partsUsed : JSON.stringify(data.partsUsed || []),
    preparationTypes: typeof data.preparationTypes === "string" ? data.preparationTypes : JSON.stringify(data.preparationTypes || []),
    regulatoryStatusJson: typeof data.regulatoryStatusJson === "string" ? data.regulatoryStatusJson : JSON.stringify(data.regulatoryStatusJson || {}),
    grasStatus: (data.grasStatus as string) || "",
    safetyDataJson: typeof data.safetyDataJson === "string" ? data.safetyDataJson : JSON.stringify(data.safetyDataJson || []),
    dosingDataJson: typeof data.dosingDataJson === "string" ? data.dosingDataJson : JSON.stringify(data.dosingDataJson || []),
    nmiPurposes: typeof data.nmiPurposes === "string" ? data.nmiPurposes : JSON.stringify(data.nmiPurposes || []),
    importedFrom: (data.importedFrom as string) || "manual",
    notes: (data.notes as string) || "",
  };
}
