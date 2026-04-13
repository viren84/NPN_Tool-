import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, requireEditor, isErrorResponse } from "@/lib/auth/guard";
import { logAudit } from "@/lib/db/audit";
import { whitelistFields, APPLICATION_FIELDS, validateApplicationClass } from "@/lib/utils/whitelist";
import { parseJsonBody } from "@/lib/utils/parse-body";
import { handlePrismaError } from "@/lib/errors/handle-prisma";

const VALID_APP_STATUSES = ["draft", "in_review", "submitted", "approved", "rejected", "cancelled", "amendment", "irn_response"];

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

  const parsed = await parseJsonBody(req);
  if (parsed.error) return parsed.error;
  const raw = parsed.data;

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

  // Validate status if provided
  if (data.status !== undefined && !VALID_APP_STATUSES.includes(data.status as string)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${VALID_APP_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const application = await prisma.application.update({
      where: { id },
      data: { ...data, version: { increment: 1 } },
    });
    await logAudit(user.id, "updated", "application", id, `${user.name} updated PLA "${application.productName}"`);
    return NextResponse.json(application);
  } catch (err) {
    return handlePrismaError(err, "update application");
  }
}
