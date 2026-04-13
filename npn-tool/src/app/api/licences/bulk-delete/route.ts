import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireEditor, isErrorResponse } from "@/lib/auth/guard";
import { logAudit } from "@/lib/db/audit";
import { parseJsonBody } from "@/lib/utils/parse-body";

type PrismaLikeError = { code?: string; message?: string };

/** Return a clean, client-safe error string — never leaks stack traces or file paths */
function safeErrorMessage(err: unknown): string {
  const e = err as PrismaLikeError;
  if (e?.code === "P2025") return "Record not found";
  if (e?.code === "P2002") return "Duplicate constraint";
  if (e?.code === "P2003") return "Foreign key constraint";
  return "Delete failed";
}

// POST — bulk delete licences by array of IDs
export async function POST(req: NextRequest) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const parsed = await parseJsonBody<{ ids: unknown }>(req);
  if (parsed.error) return parsed.error;
  const { ids } = parsed.data;

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids must be a non-empty array" }, { status: 400 });
  }

  if (ids.length > 100) {
    return NextResponse.json({ error: "Cannot delete more than 100 at once" }, { status: 400 });
  }

  const deleted: string[] = [];
  const errors: Array<{ id: string; error: string }> = [];

  for (const id of ids) {
    if (typeof id !== "string") {
      errors.push({ id: String(id), error: "Invalid ID (must be string)" });
      continue;
    }
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
      errors.push({ id, error: safeErrorMessage(e) });
    }
  }

  return NextResponse.json({
    deleted: deleted.length,
    errors,
    total: ids.length,
  });
}
