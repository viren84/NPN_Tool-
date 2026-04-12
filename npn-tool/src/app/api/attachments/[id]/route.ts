import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, requireEditor, isErrorResponse } from "@/lib/auth/guard";
import { logAudit } from "@/lib/db/audit";
import { trackActivity } from "@/lib/tracking/activity";
import fs from "fs/promises";

// GET — download or inline-view a file (?inline=true for browser preview)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  if (isErrorResponse(user)) return user;

  const { id } = await params;
  const inline = req.nextUrl.searchParams.get("inline") === "true";
  const attachment = await prisma.attachment.findUnique({ where: { id } });

  if (!attachment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Track view vs download
  trackActivity(user.id, inline ? "view" : "download", {
    entityType: "attachment",
    entityId: attachment.id,
    entityName: attachment.fileName,
    details: `${inline ? "Viewed" : "Downloaded"} ${attachment.fileName} (${Math.round(attachment.fileSize / 1024)}KB)`,
  });

  try {
    const buffer = await fs.readFile(attachment.filePath);
    const contentType = getContentType(attachment.fileType);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${attachment.fileName}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
  }
}

// DELETE — remove attachment
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { id } = await params;
  const attachment = await prisma.attachment.findUnique({ where: { id } });
  if (!attachment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Delete file from disk
  try { await fs.unlink(attachment.filePath); } catch { /* file may already be gone */ }

  await prisma.attachment.delete({ where: { id } });

  await logAudit(user.id, "deleted", "attachment", id,
    `${user.name} deleted attachment "${attachment.fileName}"`);

  return NextResponse.json({ success: true });
}

function getContentType(ext: string): string {
  const types: Record<string, string> = {
    pdf: "application/pdf", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    xls: "application/vnd.ms-excel", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    doc: "application/msword", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
    csv: "text/csv", txt: "text/plain", html: "text/html",
  };
  return types[ext] || "application/octet-stream";
}
