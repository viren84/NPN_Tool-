import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, isErrorResponse } from "@/lib/auth/guard";
import { trackActivity } from "@/lib/tracking/activity";

// GET — global search across licences, applications, ingredients, submissions
export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (isErrorResponse(user)) return user;

  const q = req.nextUrl.searchParams.get("q") || "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const [licences, applications, ingredients, submissions] = await Promise.all([
    prisma.productLicence.findMany({
      where: { OR: [{ productName: { contains: q } }, { licenceNumber: { contains: q } }] },
      select: { id: true, licenceNumber: true, productName: true, dosageForm: true, productStatus: true },
      take: 10,
    }),
    prisma.application.findMany({
      where: { OR: [{ productName: { contains: q } }, { brandName: { contains: q } }] },
      select: { id: true, productName: true, applicationClass: true, status: true },
      take: 10,
    }),
    prisma.ingredient.findMany({
      where: { OR: [{ properNameEn: { contains: q } }, { commonNameEn: { contains: q } }, { scientificName: { contains: q } }, { casNumber: { contains: q } }] },
      select: { id: true, properNameEn: true, commonNameEn: true, ingredientType: true },
      take: 10,
    }),
    prisma.ingredientSubmission.findMany({
      where: { OR: [{ ingredientName: { contains: q } }, { casNumber: { contains: q } }] },
      select: { id: true, ingredientName: true, status: true },
      take: 5,
    }),
  ]);

  const results = [
    ...licences.map(l => ({ type: "licence", id: l.id, title: l.productName, subtitle: `NPN ${l.licenceNumber} · ${l.dosageForm}`, href: "/licences", status: l.productStatus })),
    ...applications.map(a => ({ type: "application", id: a.id, title: a.productName, subtitle: `Class ${a.applicationClass} · ${a.status}`, href: `/applications/${a.id}`, status: a.status })),
    ...ingredients.map(i => ({ type: "ingredient", id: i.id, title: i.properNameEn || i.commonNameEn, subtitle: i.ingredientType, href: "/ingredients", status: "active" })),
    ...submissions.map(s => ({ type: "submission", id: s.id, title: s.ingredientName, subtitle: `NHPID Submission · ${s.status}`, href: "/ingredient-submissions", status: s.status })),
  ];

  trackActivity(user.id, "search", { details: `Query: "${q}" → ${results.length} results` });

  return NextResponse.json({ query: q, results, total: results.length });
}
