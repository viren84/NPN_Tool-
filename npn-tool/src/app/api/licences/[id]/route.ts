import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, requireEditor, isErrorResponse } from "@/lib/auth/guard";
import { logAudit } from "@/lib/db/audit";
import { whitelistFields, LICENCE_FIELDS } from "@/lib/utils/whitelist";
import { parseJsonBody } from "@/lib/utils/parse-body";
import { handlePrismaError } from "@/lib/errors/handle-prisma";

/** Strip HTML angle brackets from a string (defense-in-depth XSS prevention) */
function sanitize(value: string): string {
  return value.replace(/[<>]/g, "");
}

/** Sanitize known text fields on a licence data object */
function sanitiseLicenceFields(data: Record<string, unknown>): Record<string, unknown> {
  const textFields = [
    "licenceNumber", "productName", "productNameFr", "notes",
    "companyName", "companyCode", "dosageForm", "routeOfAdmin",
    "applicationClass", "submissionType",
  ];
  const out = { ...data };
  for (const key of textFields) {
    if (typeof out[key] === "string") {
      out[key] = sanitize(out[key] as string);
    }
  }
  return out;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  if (isErrorResponse(user)) return user;

  const { id } = await params;
  const licence = await prisma.productLicence.findUnique({
    where: { id },
    include: { amendments: { orderBy: { createdAt: "desc" } } },
  });
  if (!licence) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(licence);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { id } = await params;

  const parsed = await parseJsonBody(req);
  if (parsed.error) return parsed.error;

  const data = sanitiseLicenceFields(whitelistFields(parsed.data, LICENCE_FIELDS));

  try {
    const licence = await prisma.productLicence.update({ where: { id }, data });
    await logAudit(user.id, "updated", "licence", id, `${user.name} updated NPN ${licence.licenceNumber}`);
    return NextResponse.json(licence);
  } catch (err) {
    return handlePrismaError(err, "update licence");
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { id } = await params;
  try {
    await prisma.productLicence.delete({ where: { id } });
    await logAudit(user.id, "deleted", "licence", id, `${user.name} deleted a licence`);
    return NextResponse.json({ success: true });
  } catch (err) {
    return handlePrismaError(err, "delete licence");
  }
}
