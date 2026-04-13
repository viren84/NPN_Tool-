import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, requireEditor, isErrorResponse } from "@/lib/auth/guard";
import { logAudit } from "@/lib/db/audit";
import { trackActivity } from "@/lib/tracking/activity";
import fs from "fs/promises";
import path from "path";

// GET — list attachments for an entity
export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (isErrorResponse(user)) return user;

  const entityType = req.nextUrl.searchParams.get("entityType") || "";
  const entityId = req.nextUrl.searchParams.get("entityId") || "";

  if (!entityType || !entityId) {
    return NextResponse.json({ error: "entityType and entityId required" }, { status: 400 });
  }

  const attachments = await prisma.attachment.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: "desc" },
    include: { uploadedBy: { select: { name: true } } },
  });

  trackActivity(user.id, "view", { entityType: "attachments", entityId, details: `Viewed ${attachments.length} attachments` });

  return NextResponse.json(attachments);
}

// POST — upload and attach a file
export async function POST(req: NextRequest) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const entityType = formData.get("entityType") as string;
    const entityId = formData.get("entityId") as string;
    const docCategory = (formData.get("docCategory") as string) || "other";
    const description = (formData.get("description") as string) || "";

    if (!file || !entityType || !entityId) {
      return NextResponse.json({ error: "file, entityType, and entityId required" }, { status: 400 });
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Max 50MB." }, { status: 400 });
    }

    // Duplicate attachment check — skip if same file already attached to THIS entity
    const existingAttachment = await prisma.attachment.findFirst({
      where: { entityType, entityId, fileName: file.name },
    });
    if (existingAttachment) {
      return NextResponse.json({
        ...existingAttachment,
        _deduplicated: true,
        message: "Attachment already exists — skipped duplicate",
      }, { status: 200 });
    }

    // Cross-entity duplicate check — warn if same filename exists on a DIFFERENT entity
    const crossEntityDup = await prisma.attachment.findFirst({
      where: { entityType, fileName: file.name, entityId: { not: entityId } },
      select: { entityId: true, entityType: true },
    });

    // Save file to attachments directory
    const attachmentsDir = path.join(process.cwd(), "data", "attachments", entityType, entityId);
    await fs.mkdir(attachmentsDir, { recursive: true });

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = path.join(attachmentsDir, `${Date.now()}_${safeName}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    // Get file extension
    const ext = path.extname(file.name).toLowerCase().replace(".", "");

    const attachment = await prisma.attachment.create({
      data: {
        entityType,
        entityId,
        fileName: file.name,
        fileType: ext,
        fileSize: file.size,
        filePath,
        docCategory,
        description,
        uploadedById: user.id,
      },
    });

    await logAudit(user.id, "uploaded", "attachment", attachment.id,
      `${user.name} uploaded "${file.name}" (${docCategory}) to ${entityType}/${entityId}`);

    trackActivity(user.id, "upload", {
      entityType: "attachment",
      entityId: attachment.id,
      entityName: file.name,
    });

    return NextResponse.json({
      ...attachment,
      ...(crossEntityDup ? { _crossEntityWarning: `Same file also attached to ${crossEntityDup.entityType}/${crossEntityDup.entityId}` } : {}),
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Upload failed",
    }, { status: 500 });
  }
}
