import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireEditor, isErrorResponse } from "@/lib/auth/guard";
import { logAudit } from "@/lib/db/audit";

// POST — bulk delete licences by array of IDs
export async function POST(req: NextRequest) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { ids } = await req.json();

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids must be a non-empty array" }, { status: 400 });
  }

  if (ids.length > 100) {
    return NextResponse.json({ error: "Cannot delete more than 100 at once" }, { status: 400 });
  }

  const deleted: string[] = [];
  const errors: Array<{ id: string; error: string }> = [];

  for (const id of ids) {
    try {
      // Delete related attachments from disk + DB
      const attachments = await prisma.attachment.findMany({
        where: { entityType: "licence", entityId: id },
      });
      for (const att of attachments) {
        try {
          const fs = await import("fs/promises");
          await fs.unlink(att.filePath);
        } catch { /* file may already be gone */ }
      }
      await prisma.attachment.deleteMany({
        where: { entityType: "licence", entityId: id },
      });

      // Delete related amendments
      await prisma.licenceAmendment.deleteMany({ where: { licenceId: id } });

      // Delete the licence
      await prisma.productLicence.delete({ where: { id } });
      await logAudit(user.id, "deleted", "licence", id, `${user.name} bulk-deleted licence`);
      deleted.push(id);
    } catch (e) {
      errors.push({ id, error: e instanceof Error ? e.message : "Delete failed" });
    }
  }

  return NextResponse.json({
    deleted: deleted.length,
    errors,
    total: ids.length,
  });
}
