import { NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/auth/guard";
import { syncLNHPD } from "@/lib/sync/lnhpd-sync";
import { logAudit } from "@/lib/db/audit";

// POST — trigger LNHPD sync (admin only)
export async function POST() {
  const user = await requireAdmin();
  if (isErrorResponse(user)) return user;

  const result = await syncLNHPD();

  await logAudit(user.id, "sync", "lnhpd", "all",
    `${user.name} synced LNHPD: ${result.synced} synced, ${result.skipped} skipped, ${result.errors} errors`);

  return NextResponse.json(result);
}
