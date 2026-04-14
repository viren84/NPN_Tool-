import { NextRequest, NextResponse } from "next/server";
import { requireEditor, isErrorResponse } from "@/lib/auth/guard";
import { extractLicencePDF } from "@/lib/ai/document-reader";
import { prisma } from "@/lib/db/prisma";
import { logAudit } from "@/lib/db/audit";
import { extractTextFromPDF } from "@/lib/documents/pdf-reader";
import fs from "fs/promises";
import path from "path";
import os from "os";

/**
 * Allowlist of root paths that folder scanning may access.
 * An attacker providing C:/Windows/System32 or /etc/ should get 403.
 */
function getAllowedRoots(): string[] {
  const cwd = process.cwd(); // the project working directory (npn-tool/)
  const home = os.homedir();
  const roots = [
    path.resolve(cwd, "data"),
    path.resolve(cwd, "data", "attachments"),
    // Entire user home covers Downloads, Documents, Desktop, OneDrive, SharePoint sync folders, etc.
    home,
  ];
  // Allow env-configured extra roots (comma-separated absolute paths)
  const extra = process.env.SCAN_ALLOWED_ROOTS;
  if (extra) {
    for (const p of extra.split(",").map((s) => s.trim()).filter(Boolean)) {
      try { roots.push(path.resolve(p)); } catch { /* ignore */ }
    }
  }
  return roots;
}

/** Check whether a resolved path is inside any allowed root */
function isPathAllowed(resolved: string): boolean {
  const roots = getAllowedRoots();
  for (const root of roots) {
    const rel = path.relative(root, resolved);
    // rel must not start with ".." (would mean outside root), and not be absolute
    if (rel && !rel.startsWith("..") && !path.isAbsolute(rel)) return true;
    // resolved path IS the root itself
    if (resolved === root) return true;
  }
  return false;
}

export async function POST(req: NextRequest) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { folderPath, preview } = body;
  if (!folderPath) {
    return NextResponse.json({ error: "folderPath required" }, { status: 400 });
  }
  if (typeof folderPath !== "string") {
    return NextResponse.json({ error: "folderPath must be a string" }, { status: 400 });
  }
  const isPreview = preview === true;

  // Normalize path for Windows and RESOLVE to absolute (eliminates ".." traversal)
  const normalizedPath = path.resolve(folderPath.replace(/\//g, path.sep));

  // SECURITY: Enforce allowlist — reject arbitrary filesystem scans
  if (!isPathAllowed(normalizedPath)) {
    return NextResponse.json(
      {
        error: "Path not permitted. Folder scanning is restricted to user Downloads/Documents/Desktop and the app data directory.",
        allowedRoots: getAllowedRoots(),
      },
      { status: 403 }
    );
  }

  try {
    // Verify folder exists
    const stat = await fs.stat(normalizedPath);
    if (!stat.isDirectory()) {
      return NextResponse.json({ error: "Path is not a directory" }, { status: 400 });
    }

    // Recursively find all folders that contain PDF files (product folders)
    const productFolders: Array<{ name: string; fullPath: string }> = [];
    await findProductFolders(normalizedPath, productFolders);

    console.log(`[Scan] Found ${productFolders.length} product folders with PDFs`);

    console.log(`[Scan] Found ${productFolders.length} product folders in ${normalizedPath}`);

    const results: Array<{
      folder: string;
      status: "success" | "error" | "skipped" | "duplicate_archived" | "duplicate";
      licenceNumber?: string;
      productName?: string;
      error?: string;
      extractedData?: Record<string, unknown>;
      folderPath?: string;
      pdfFiles?: string[];
      existingLicenceId?: string;
    }> = [];

    for (const folder of productFolders) {
      const folderFullPath = folder.fullPath;

      try {
        const files = await fs.readdir(folderFullPath);
        const pdfFiles = files.filter(f => f.toLowerCase().endsWith(".pdf"));

        if (pdfFiles.length === 0) {
          results.push({ folder: folder.name, status: "skipped", error: "No PDFs" });
          continue;
        }

        // Read all PDFs in folder
        let combinedText = "";
        for (const pdfFile of pdfFiles) {
          try {
            const filePath = path.join(folderFullPath, pdfFile);
            const buffer = await fs.readFile(filePath);
            const text = await extractTextFromPDF(buffer);
            const label = pdfFile.toUpperCase().startsWith("IL") ? "ISSUANCE LETTER" :
              pdfFile.toUpperCase().startsWith("PL") ? "PRODUCT LICENCE" : "DOCUMENT";
            combinedText += `\n=== ${label} (${pdfFile}) ===\n${text}\n`;
            console.log(`[Scan] Read ${pdfFile}: ${text.length} chars`);
          } catch (e) {
            console.error(`[Scan] Failed to read ${pdfFile}:`, e);
          }
        }

        if (combinedText.trim().length < 50) {
          results.push({ folder: folder.name, status: "skipped", error: "No text extracted from PDFs" });
          continue;
        }

        // AI extraction
        console.log(`[Scan] AI extracting "${folder.name}" (${combinedText.length} chars)`);
        let extracted: Record<string, unknown>;
        try {
          extracted = await extractLicencePDF(combinedText);
        } catch (aiErr) {
          const aiMsg = aiErr instanceof Error ? aiErr.message : "AI extraction failed";
          results.push({ folder: folder.name, status: "error", error: aiMsg });
          continue;
        }

        if (extracted.error) {
          results.push({ folder: folder.name, status: "error", error: String(extracted.error) });
          continue;
        }

        if (!extracted.licenceNumber && !extracted.productName) {
          results.push({ folder: folder.name, status: "error", error: "AI could not extract licence number or product name" });
          continue;
        }

        const licenceNum = (extracted.licenceNumber as string) || "";

        if (isPreview) {
          // PREVIEW MODE: return extracted data without writing to DB
          const existing = licenceNum ? await prisma.productLicence.findFirst({ where: { licenceNumber: licenceNum } }) : null;
          results.push({
            folder: folder.name,
            status: existing ? "duplicate" : "success",
            licenceNumber: licenceNum,
            productName: (extracted.productName as string) || folder.name,
            extractedData: extracted,
            folderPath: folderFullPath,
            pdfFiles: pdfFiles,
            existingLicenceId: existing?.id,
          });
          console.log(`[Scan-Preview] ${existing ? "Duplicate" : "New"} NPN ${licenceNum} — ${extracted.productName}`);
        } else {
          // LIVE MODE: write to DB (existing behavior)

          // Duplicate detection — archive old, keep latest
          if (licenceNum) {
            const existing = await prisma.productLicence.findFirst({
              where: { licenceNumber: licenceNum },
            });
            if (existing) {
              await prisma.productLicence.update({
                where: { id: existing.id },
                data: {
                  productStatus: "non_active",
                  notes: `[ARCHIVED-DUPLICATE] Replaced by newer import on ${new Date().toISOString().slice(0, 10)}. ${existing.notes}`,
                },
              });
              console.log(`[Scan] Archived duplicate NPN ${licenceNum}`);
              results.push({
                folder: folder.name,
                status: "duplicate_archived",
                licenceNumber: licenceNum,
                productName: extracted.productName as string,
              });
            }
          }

          // Create new licence record
          await prisma.productLicence.create({
            data: {
              lnhpdId: null,
              licenceNumber: licenceNum,
              productName: (extracted.productName as string) || folder.name,
              productNameFr: (extracted.productNameFr as string) || "",
              dosageForm: (extracted.dosageForm as string) || "",
              routeOfAdmin: (extracted.routeOfAdmin as string) || "",
              companyName: (extracted.companyName as string) || "",
              companyCode: (extracted.companyCode as string) || "",
              applicationClass: (extracted.applicationClass as string) || "",
              submissionType: (extracted.submissionType as string) || "",
              licenceDate: (extracted.licenceDate as string) || "",
              revisedDate: (extracted.revisedDate as string) || "",
              productStatus: "active",
              medicinalIngredientsJson: JSON.stringify(extracted.medicinalIngredients || []),
              nonMedIngredientsJson: JSON.stringify(extracted.nonMedicinalIngredients || []),
              claimsJson: JSON.stringify(extracted.claims || []),
              risksJson: JSON.stringify(extracted.risks || []),
              dosesJson: JSON.stringify(extracted.doses || []),
              licencePdfPath: folderFullPath,
              importedFrom: "folder_scan",
            },
          });

          results.push({
            folder: folder.name,
            status: "success",
            licenceNumber: licenceNum,
            productName: extracted.productName as string,
          });

          console.log(`[Scan] Imported NPN ${licenceNum} — ${extracted.productName}`);
        }
      } catch (e) {
        console.error(`[Scan] Error for "${folder.name}":`, e);
        results.push({
          folder: folder.name,
          status: "error",
          error: e instanceof Error ? e.message : "Failed",
        });
      }
    }

    const successCount = results.filter(r => r.status === "success").length;
    const dupeCount = results.filter(r => r.status === "duplicate_archived" || r.status === "duplicate").length;
    if (!isPreview) {
      await logAudit(user.id, "created", "licence", "batch_scan",
        `${user.name} scanned folder: ${successCount} imported, ${dupeCount} duplicates archived`);
    }

    return NextResponse.json({
      folderPath: normalizedPath,
      totalFolders: productFolders.length,
      results,
      summary: {
        success: successCount,
        duplicates_archived: dupeCount,
        skipped: results.filter(r => r.status === "skipped").length,
        errors: results.filter(r => r.status === "error").length,
      },
    });
  } catch (error) {
    console.error("[Scan] Fatal:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Folder scan failed",
    }, { status: 500 });
  }
}

/**
 * Recursively find all folders that contain PDF files.
 * Skips folders named "old" (case-insensitive).
 * A "product folder" is any folder that directly contains at least one .pdf file.
 */
async function findProductFolders(
  dirPath: string,
  results: Array<{ name: string; fullPath: string }>,
  maxDepth: number = 5
): Promise<void> {
  if (maxDepth <= 0) return;

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    // Check if THIS folder has PDFs
    const hasPDFs = entries.some(e => !e.isDirectory() && e.name.toLowerCase().endsWith(".pdf"));
    if (hasPDFs) {
      const folderName = path.basename(dirPath);
      if (folderName.toLowerCase() !== "old") {
        results.push({ name: folderName, fullPath: dirPath });
      }
    }

    // Recurse into subdirectories
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.toLowerCase() !== "old") {
        await findProductFolders(path.join(dirPath, entry.name), results, maxDepth - 1);
      }
    }
  } catch {
    // Permission denied or other read error — skip
  }
}
