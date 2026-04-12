import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/auth/guard";
import { trackActivity } from "@/lib/tracking/activity";
import fs from "fs/promises";
import path from "path";

// GET — download a file by path
export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (isErrorResponse(user)) return user;

  const filePath = req.nextUrl.searchParams.get("path") || "";
  if (!filePath) return NextResponse.json({ error: "path required" }, { status: 400 });

  try {
    const buffer = await fs.readFile(filePath);
    const fileName = path.basename(filePath);
    const ext = path.extname(fileName).toLowerCase().replace(".", "");

    const contentTypes: Record<string, string> = {
      pdf: "application/pdf", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      jpg: "image/jpeg", png: "image/png", csv: "text/csv", txt: "text/plain",
    };

    trackActivity(user.id, "download", {
      entityType: "file", entityName: fileName,
      details: `Downloaded ${fileName} (${Math.round(buffer.length / 1024)}KB)`,
    });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentTypes[ext] || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
