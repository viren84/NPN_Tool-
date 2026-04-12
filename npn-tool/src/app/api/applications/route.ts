import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/db/audit";
import { sanitizeHtml } from "@/lib/utils/sanitize";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const applications = await prisma.application.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      createdBy: { select: { name: true } },
      medicinalIngredients: true,
      documents: { select: { id: true, documentType: true, status: true } },
    },
  });

  return NextResponse.json(applications);
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "viewer") return NextResponse.json({ error: "Viewers cannot create" }, { status: 403 });

  const { productName, productConcept, applicationClass, dosageForm, routeOfAdmin } = await req.json();

  if (!productName) {
    return NextResponse.json({ error: "Product name required" }, { status: 400 });
  }

  const application = await prisma.application.create({
    data: {
      productName: sanitizeHtml(productName),
      productConcept: sanitizeHtml(productConcept || ""),
      applicationClass: applicationClass || "I",
      dosageForm: sanitizeHtml(dosageForm || ""),
      routeOfAdmin: sanitizeHtml(routeOfAdmin || ""),
      createdById: user.id,
    },
  });

  await logAudit(
    user.id,
    "created",
    "application",
    application.id,
    `${user.name} created PLA for "${productName}" (Class ${application.applicationClass})`
  );

  return NextResponse.json(application, { status: 201 });
}
