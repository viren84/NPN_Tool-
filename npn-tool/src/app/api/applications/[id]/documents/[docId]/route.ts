import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireEditor, isErrorResponse } from "@/lib/auth/guard";
import { logAudit } from "@/lib/db/audit";
import { whitelistFields, DOCUMENT_FIELDS } from "@/lib/utils/whitelist";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { id, docId } = await params;
  const raw = await req.json();
  const data = whitelistFields(raw, DOCUMENT_FIELDS);

  // Handle approval
  if (data.status === "approved") {
    data.approvedById = user.id;
    data.approvedAt = new Date().toISOString();
  }

  const doc = await prisma.generatedDocument.update({
    where: { id: docId },
    data,
  });

  const action = data.status === "approved" ? "approved" : "updated";
  await logAudit(user.id, action, "document", docId, `${user.name} ${action} ${doc.documentType} for application ${id}`);

  return NextResponse.json(doc);
}
