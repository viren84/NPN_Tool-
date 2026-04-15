import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/db/audit";
import fs from "fs/promises";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "viewer") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, docId } = await params;

  try {
    const doc = await prisma.productDocument.findFirst({
      where: { id: docId, productId: id },
    });

    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    if (doc.filePath) {
      try { await fs.unlink(doc.filePath); } catch { /* file may already be gone */ }
    }

    await prisma.productDocument.delete({ where: { id: docId } });
    await logAudit(user.id, "deleted", "product_document", docId, `${user.name} deleted "${doc.fileName}" from product ${id}`);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Delete failed" }, { status: 500 });
  }
}
