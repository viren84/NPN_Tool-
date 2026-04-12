import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/db/audit";

// POST — bulk import from CSV/JSON
export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "viewer") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { format, data } = await req.json();

  if (format === "csv_rows") {
    // data is array of {properNameEn, commonNameEn, scientificName, casNumber, ingredientType, ...}
    let created = 0, skipped = 0, errors: string[] = [];
    for (const row of data) {
      if (!row.properNameEn && !row.nhpidName && !row.commonNameEn) {
        errors.push(`Row skipped: no name provided`);
        skipped++;
        continue;
      }
      try {
        await prisma.ingredient.create({
          data: {
            nhpidId: row.nhpidId || null,
            nhpidName: row.nhpidName || "",
            ingredientType: row.ingredientType || "medicinal",
            category: row.category || "",
            casNumber: row.casNumber || "",
            properNameEn: row.properNameEn || "",
            properNameFr: row.properNameFr || "",
            commonNameEn: row.commonNameEn || "",
            commonNameFr: row.commonNameFr || "",
            scientificName: row.scientificName || "",
            molecularFormula: row.molecularFormula || "",
            molecularWeight: row.molecularWeight ? parseFloat(row.molecularWeight) : null,
            organismType: row.organismType || "",
            genus: row.genus || "",
            species: row.species || "",
            family: row.family || "",
            grasStatus: row.grasStatus || "",
            importedFrom: "csv",
          },
        });
        created++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "unknown";
        if (msg.includes("Unique")) skipped++;
        else errors.push(`${row.properNameEn || row.nhpidName}: ${msg.slice(0, 80)}`);
      }
    }

    await logAudit(user.id, "created", "ingredient_kb", "import",
      `${user.name} imported ${created} ingredients from CSV (${skipped} skipped, ${errors.length} errors)`);

    return NextResponse.json({ created, skipped, errors: errors.slice(0, 20) });
  }

  return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
}
