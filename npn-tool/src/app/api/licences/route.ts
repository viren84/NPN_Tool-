import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/db/audit";

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q") || "";
  const status = req.nextUrl.searchParams.get("status") || "";

  const where: Record<string, unknown> = {};
  if (status) where.productStatus = status;
  if (q) {
    where.OR = [
      { productName: { contains: q } },
      { licenceNumber: { contains: q } },
    ];
  }

  const licences = await prisma.productLicence.findMany({
    where,
    orderBy: [{ productStatus: "asc" }, { productName: "asc" }], // active first, then alphabetical
    include: { amendments: { orderBy: { createdAt: "desc" }, take: 3 } },
  });

  return NextResponse.json(licences);
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "viewer") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const data = await req.json();

  // Bulk import
  if (Array.isArray(data)) {
    let created = 0, skipped = 0;
    for (const item of data) {
      try {
        await prisma.productLicence.create({
          data: {
            lnhpdId: item.lnhpdId || null,
            licenceNumber: item.licenceNumber,
            productName: item.productName,
            productNameFr: item.productNameFr || "",
            dosageForm: item.dosageForm || "",
            routeOfAdmin: item.routeOfAdmin || "",
            companyCode: item.companyCode || "",
            companyName: item.companyName || "",
            applicationClass: item.applicationClass || "",
            submissionType: item.submissionType || "",
            licenceDate: item.licenceDate || "",
            productStatus: item.productStatus || "active",
            medicinalIngredientsJson: typeof item.medicinalIngredientsJson === "string" ? item.medicinalIngredientsJson : JSON.stringify(item.medicinalIngredients || []),
            nonMedIngredientsJson: typeof item.nonMedIngredientsJson === "string" ? item.nonMedIngredientsJson : JSON.stringify(item.nonMedIngredients || []),
            claimsJson: typeof item.claimsJson === "string" ? item.claimsJson : JSON.stringify(item.claims || []),
            risksJson: typeof item.risksJson === "string" ? item.risksJson : JSON.stringify(item.risks || []),
            dosesJson: typeof item.dosesJson === "string" ? item.dosesJson : JSON.stringify(item.doses || []),
            importedFrom: item.importedFrom || "manual",
            notes: item.notes || "",
          },
        });
        created++;
      } catch {
        skipped++;
      }
    }
    await logAudit(user.id, "created", "licence", "bulk", `${user.name} imported ${created} licences`);
    return NextResponse.json({ created, skipped }, { status: 201 });
  }

  // Single
  const licence = await prisma.productLicence.create({
    data: {
      licenceNumber: data.licenceNumber,
      productName: data.productName,
      productNameFr: data.productNameFr || "",
      dosageForm: data.dosageForm || "",
      routeOfAdmin: data.routeOfAdmin || "",
      companyCode: data.companyCode || "",
      applicationClass: data.applicationClass || "",
      licenceDate: data.licenceDate || "",
      productStatus: data.productStatus || "active",
      licencePdfPath: data.licencePdfPath || "",
      importedFrom: data.importedFrom || "manual",
      notes: data.notes || "",
    },
  });

  await logAudit(user.id, "created", "licence", licence.id, `${user.name} added licence NPN ${licence.licenceNumber}`);
  return NextResponse.json(licence, { status: 201 });
}
