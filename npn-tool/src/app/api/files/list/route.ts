import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/auth/guard";
import { trackActivity } from "@/lib/tracking/activity";
import fs from "fs/promises";
import path from "path";

// GET — list PDF files in a folder
export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (isErrorResponse(user)) return user;

  const folderPath = req.nextUrl.searchParams.get("path") || "";
  if (!folderPath) return NextResponse.json({ error: "path required" }, { status: 400 });

  try {
    const entries = await fs.readdir(folderPath);
    const files = [];
    for (const entry of entries) {
      const fullPath = path.join(folderPath, entry);
      const stat = await fs.stat(fullPath).catch(() => null);
      if (stat && stat.isFile()) {
        files.push({
          name: entry,
          path: fullPath,
          size: stat.size,
          ext: path.extname(entry).toLowerCase().replace(".", ""),
          modified: stat.mtime.toISOString(),
        });
      }
    }

    trackActivity(user.id, "view", { entityType: "folder", details: `Listed files in ${folderPath}` });

    return NextResponse.json(files);
  } catch {
    return NextResponse.json({ error: "Cannot read folder" }, { status: 404 });
  }
}
