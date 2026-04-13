import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, requireEditor, isErrorResponse } from "@/lib/auth/guard";
import { logAudit } from "@/lib/db/audit";
import { whitelistFields, COMPANY_FIELDS } from "@/lib/utils/whitelist";
import { parseJsonBody } from "@/lib/utils/parse-body";
import { handlePrismaError } from "@/lib/errors/handle-prisma";

/** Strip HTML angle brackets from a string (defense-in-depth XSS prevention) */
function sanitize(value: string): string {
  return value.replace(/[<>]/g, "");
}

/** Recursively sanitize all string values in an object */
function sanitizeStrings(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "string") out[key] = sanitize(value);
    else out[key] = value;
  }
  return out;
}

export async function GET() {
  const user = await requireAuth();
  if (isErrorResponse(user)) return user;

  let profile = await prisma.companyProfile.findFirst();
  if (!profile) {
    profile = await prisma.companyProfile.create({ data: {} });
  }
  return NextResponse.json(profile);
}

export async function PUT(req: NextRequest) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const parsed = await parseJsonBody(req);
  if (parsed.error) return parsed.error;

  const data = sanitizeStrings(whitelistFields(parsed.data, COMPANY_FIELDS));

  try {
    let profile = await prisma.companyProfile.findFirst();
    if (!profile) {
      profile = await prisma.companyProfile.create({ data });
    } else {
      profile = await prisma.companyProfile.update({
        where: { id: profile.id },
        data,
      });
    }
    await logAudit(user.id, "updated", "company_profile", profile.id, `${user.name} updated company profile`);
    return NextResponse.json(profile);
  } catch (err) {
    return handlePrismaError(err, "update company");
  }
}
