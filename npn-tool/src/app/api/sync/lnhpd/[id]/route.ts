import { NextRequest, NextResponse } from "next/server";
import { requireEditor, isErrorResponse } from "@/lib/auth/guard";
import { syncSingleLicence } from "@/lib/sync/lnhpd-sync";
import { logAudit } from "@/lib/db/audit";

// POST — sync LNHPD data for a single licence (editor+)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Licence ID required" }, { status: 400 });
  }

  const result = await syncSingleLicence(id);

  if (result.success) {
    await logAudit(user.id, "sync", "licence", id,
      `${user.name} synced licence from LNHPD: ${result.message}`);
  }

  return NextResponse.json(result, { status: result.success ? 200 : 404 });
}
