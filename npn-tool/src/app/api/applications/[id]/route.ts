import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, requireEditor, isErrorResponse } from "@/lib/auth/guard";
import { logAudit } from "@/lib/db/audit";
import { whitelistFields, APPLICATION_FIELDS, validateApplicationClass } from "@/lib/utils/whitelist";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  if (isErrorResponse(user)) return user;

  const { id } = await params;
  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true, role: true } },
      medicinalIngredients: { orderBy: { sortOrder: "asc" } },
      nonMedicinalIngredients: { orderBy: { sortOrder: "asc" } },
      claims: { orderBy: { sortOrder: "asc" } },
      dosageGroups: { orderBy: { sortOrder: "asc" } },
      riskInfos: { orderBy: [{ riskType: "asc" }, { sortOrder: "asc" }] },
      documents: { orderBy: { documentType: "asc" } },
      supplierCOAs: true,
      lnhpdPrecedents: true,
    },
  });

  if (!application) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(application);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { id } = await params;
  const raw = await req.json();

  // Optimistic locking
  if (raw.version !== undefined) {
    const current = await prisma.application.findUnique({ where: { id } });
    if (current && current.version !== raw.version) {
      return NextResponse.json({ error: "Conflict: record was modified by another user. Refresh and try again." }, { status: 409 });
    }
  }

  const data = whitelistFields(raw, APPLICATION_FIELDS);

  // Validate applicationClass if provided
  if (data.applicationClass && !validateApplicationClass(data.applicationClass as string)) {
    return NextResponse.json({ error: "Invalid application class. Must be I, II, or III." }, { status: 400 });
  }

  const application = await prisma.application.update({
    where: { id },
    data: { ...data, version: { increment: 1 } },
  });

  await logAudit(user.id, "updated", "application", id, `${user.name} updated PLA "${application.productName}"`);
  return NextResponse.json(application);
}
