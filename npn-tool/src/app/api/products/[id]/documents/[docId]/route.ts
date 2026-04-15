import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, requireEditor, isErrorResponse } from "@/lib/auth/guard";
import { logAudit } from "@/lib/db/audit";
import { handlePrismaError } from "@/lib/errors/handle-prisma";
import * as fs from "fs";

/**
 * GET /api/products/[id]/documents/[docId]
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  const user = await requireAuth();
  if (isErrorResponse(user)) return user;

  const { id, docId } = await params;

  try {
    const doc = await prisma.productDocument.findFirst({
      where: { id: docId, productId: id },
    });

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json(doc);
  } catch (err) {
    return handlePrismaError(err, "get product document");
  }
}

/**
 * DELETE /api/products/[id]/documents/[docId]
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { id, docId } = await params;

  try {
    const doc = await prisma.productDocument.findFirst({
      where: { id: docId, productId: id },
    });

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Remove file from disk
    if (doc.filePath && fs.existsSync(doc.filePath)) {
      fs.unlinkSync(doc.filePath);
    }

    await prisma.productDocument.delete({ where: { id: docId } });

    // Update product document count
    const count = await prisma.productDocument.count({ where: { productId: id } });
    await prisma.product.update({ where: { id }, data: { documentCount: count } });

    await logAudit(
      user.id,
      "deleted",
      "product_document",
      docId,
      `${user.name} deleted document "${doc.fileName}" from product`,
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    return handlePrismaError(err, "delete product document");
  }
}
