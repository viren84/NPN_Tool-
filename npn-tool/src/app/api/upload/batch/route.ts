import { NextRequest, NextResponse } from "next/server";
import { requireEditor, isErrorResponse } from "@/lib/auth/guard";
import { extractLicencePDF } from "@/lib/ai/document-reader";
import { extractTextFromPDF } from "@/lib/documents/pdf-reader";

interface FileGroup {
  folderName: string;
  files: Array<{ name: string; text: string; type: "IL" | "PL" | "other" }>;
}

export async function POST(req: NextRequest) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  try {
    const formData = await req.formData();
    const allFiles: Array<{ file: File; path: string }> = [];

    // Collect indexed files (file_0, file_1, etc.)
    let idx = 0;
    while (formData.has(`file_${idx}`)) {
      const file = formData.get(`file_${idx}`) as File;
      const path = (formData.get(`path_${idx}`) as string) || file.name;
      allFiles.push({ file, path });
      idx++;
    }

    // Also collect files named "file"
    const genericFiles = formData.getAll("file");
    for (const f of genericFiles) {
      if (f instanceof File) allFiles.push({ file: f, path: f.name });
    }

    if (allFiles.length === 0) {
      return NextResponse.json({ error: "No files uploaded", totalFiles: 0, totalGroups: 0, results: [] }, { status: 400 });
    }

    console.log(`[Batch] Received ${allFiles.length} files`);

    // Group files by folder
    const groups: Map<string, FileGroup> = new Map();

    for (const { file, path } of allFiles) {
      if (!file.name.toLowerCase().endsWith(".pdf")) continue;

      const buffer = Buffer.from(await file.arrayBuffer());
      console.log(`[Batch] Reading ${file.name} (${buffer.length} bytes)`);
      const text = await extractTextFromPDF(buffer);
      console.log(`[Batch] Extracted ${text.length} chars from ${file.name}`);

      if (!text || text.trim().length < 20) continue;

      // Group by folder from path
      const pathParts = path.replace(/\\/g, "/").split("/");
      let folderName = "ungrouped";
      if (pathParts.length >= 3) folderName = pathParts[pathParts.length - 2];
      else if (pathParts.length === 2) folderName = pathParts[0];

      if (folderName.toLowerCase() === "old") continue;

      const fileName = file.name.toUpperCase();
      const fileType: "IL" | "PL" | "other" =
        fileName.startsWith("IL") ? "IL" :
        (fileName.startsWith("PL") || fileName.startsWith("NAN")) ? "PL" : "other";

      if (!groups.has(folderName)) groups.set(folderName, { folderName, files: [] });
      groups.get(folderName)!.files.push({ name: file.name, text, type: fileType });
    }

    console.log(`[Batch] ${groups.size} product groups`);

    const results: Array<{
      folderName: string; fileCount: number;
      extractedData: Record<string, unknown>;
      status: "success" | "error"; error?: string;
    }> = [];

    for (const [, group] of groups) {
      try {
        const ilTexts = group.files.filter(f => f.type === "IL").map(f => `=== ISSUANCE LETTER (${f.name}) ===\n${f.text}`);
        const plTexts = group.files.filter(f => f.type === "PL").map(f => `=== PRODUCT LICENCE (${f.name}) ===\n${f.text}`);
        const otherTexts = group.files.filter(f => f.type === "other").map(f => `=== ${f.name} ===\n${f.text}`);
        const combinedText = [...ilTexts, ...plTexts, ...otherTexts].join("\n\n");

        console.log(`[Batch] AI extracting "${group.folderName}" (${combinedText.length} chars)`);
        const extracted = await extractLicencePDF(combinedText);

        results.push({ folderName: group.folderName, fileCount: group.files.length, extractedData: extracted, status: "success" });
      } catch (e) {
        console.error(`[Batch] Error for "${group.folderName}":`, e);
        results.push({ folderName: group.folderName, fileCount: group.files.length, extractedData: {}, status: "error", error: e instanceof Error ? e.message : "Failed" });
      }
    }

    return NextResponse.json({ totalFiles: allFiles.length, totalGroups: groups.size, results });
  } catch (error) {
    console.error("[Batch] Fatal:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
