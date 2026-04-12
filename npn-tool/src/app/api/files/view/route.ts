import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/auth/guard";
import { trackActivity } from "@/lib/tracking/activity";
import fs from "fs/promises";
import path from "path";

// GET — serve file for in-browser viewing (inline, not download)
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
      pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
      xml: "text/xml", txt: "text/plain", html: "text/html", csv: "text/csv",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      zip: "application/zip",
    };

    trackActivity(user.id, "view", {
      entityType: "file", entityName: fileName,
      details: `Viewed ${fileName} (${Math.round(buffer.length / 1024)}KB)`,
    });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentTypes[ext] || "application/octet-stream",
        "Content-Disposition": `inline; filename="${fileName}"`, // inline = view in browser
        "Content-Length": String(buffer.length),
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
