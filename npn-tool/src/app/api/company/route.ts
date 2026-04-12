import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, requireEditor, isErrorResponse } from "@/lib/auth/guard";
import { logAudit } from "@/lib/db/audit";
import { whitelistFields, COMPANY_FIELDS } from "@/lib/utils/whitelist";

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

  const raw = await req.json();
  const data = whitelistFields(raw, COMPANY_FIELDS);

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
}
