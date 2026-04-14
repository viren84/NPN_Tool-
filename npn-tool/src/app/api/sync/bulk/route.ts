import { NextRequest, NextResponse } from "next/server";
import { requireEditor, isErrorResponse } from "@/lib/auth/guard";
import { syncSingleLicence } from "@/lib/sync/lnhpd-sync";
import { prisma } from "@/lib/db/prisma";
import { logAudit } from "@/lib/db/audit";

// POST — bulk sync multiple licences from LNHPD (editor+)
// Body: { ids?: string[] }  — omit ids to sync ALL licences
export async function POST(req: NextRequest) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  let ids: string[] | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    if (body.ids !== undefined) {
      if (!Array.isArray(body.ids) || body.ids.length === 0) {
        return NextResponse.json({ error: "ids must be a non-empty array when provided" }, { status: 400 });
      }
      ids = body.ids as string[];
    }
  } catch {
    // no body — sync all
  }

  // Resolve which licences to sync
  const licences = await prisma.productLicence.findMany({
    where: ids ? { id: { in: ids } } : undefined,
    select: { id: true, licenceNumber: true },
  });

  if (licences.length === 0) {
    return NextResponse.json({ error: "No licences found to sync" }, { status: 404 });
  }

  const results: Array<{ id: string; licenceNumber: string; success: boolean; message: string }> = [];

  for (const lic of licences) {
    const result = await syncSingleLicence(lic.id);
    results.push({ id: lic.id, licenceNumber: lic.licenceNumber, success: result.success, message: result.message });
  }

  const synced = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  await logAudit(
    user.id,
    "sync",
    "licence",
    "bulk",
    `${user.name} bulk synced ${synced}/${licences.length} licences from LNHPD (${failed} failed)`
  );

  return NextResponse.json({ synced, failed, total: licences.length, results });
}
