import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/db/audit";
import fs from "fs/promises";
import path from "path";

const DOC_FILENAMES: Record<string, string> = {
  pla_form: "01_PLA_Form.html",
  cover_letter: "02_Cover_Letter.html",
  fps_form: "03_FPS_Form.html",
  label_en: "04_Label_English.html",
  label_fr: "05_Label_French.html",
  monograph_attestation: "06_Monograph_Attestation.html",
  safety_report: "07_Safety_Summary_Report.html",
  efficacy_report: "08_Efficacy_Summary_Report.html",
  animal_tissue_form: "09_Animal_Tissue_Form.html",
  senior_attestation: "10_Senior_Official_Attestation.html",
  ingredient_specs: "11_Ingredient_Specifications.html",
  non_med_list: "12_Non_Medicinal_Ingredients.html",
  quality_chemistry_report: "13_Quality_Chemistry_Report.html",
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const application = await prisma.application.findUnique({
    where: { id },
    include: { documents: true },
  });

  if (!application) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const settings = await prisma.appSettings.findUnique({ where: { id: "default" } });
  const basePath = settings?.exportPath || path.join(process.cwd(), "output");
  const safeName = application.productName.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_");
  const folderName = `PLA_${safeName}_Class${application.applicationClass}_${new Date().toISOString().slice(0, 10)}`;
  const exportDir = path.join(basePath, folderName);

  await fs.mkdir(exportDir, { recursive: true });

  // Write each document
  for (const doc of application.documents) {
    if (!doc.content) continue;
    const filename = DOC_FILENAMES[doc.documentType] || `${doc.documentType}.html`;
    const fullHtml = wrapInHtml(doc.content, filename.replace(".html", ""));
    await fs.writeFile(path.join(exportDir, filename), fullHtml, "utf-8");
  }

  // Write index/manifest
  const manifest = generateManifest(application, exportDir);
  await fs.writeFile(path.join(exportDir, "00_Submission_Index.html"), manifest, "utf-8");

  // Update application status
  await prisma.application.update({
    where: { id },
    data: { status: "finalized" },
  });

  await logAudit(user.id, "exported", "application", id, `${user.name} exported submission package for "${application.productName}" to ${exportDir}`);

  return NextResponse.json({ success: true, exportPath: exportDir });
}

function wrapInHtml(content: string, title: string): string {
  if (content.trim().toLowerCase().startsWith("<!doctype") || content.trim().toLowerCase().startsWith("<html")) {
    return content;
  }
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title>
<style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;color:#333;line-height:1.6}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:8px;text-align:left}th{background:#f5f5f5}</style>
</head><body>${content}</body></html>`;
}

function generateManifest(
  application: { productName: string; applicationClass: string; documents: Array<{ documentType: string; status: string }> },
  exportPath: string
): string {
  const rows = application.documents
    .map((doc) => {
      const filename = DOC_FILENAMES[doc.documentType] || `${doc.documentType}.html`;
      return `<tr><td><a href="${filename}">${filename}</a></td><td>${doc.status}</td></tr>`;
    })
    .join("");

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Submission Index</title>
<style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;padding:0 20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:8px;text-align:left}th{background:#f5f5f5}</style>
</head><body>
<h1>PLA Submission Package</h1>
<p><strong>Product:</strong> ${application.productName}</p>
<p><strong>Class:</strong> ${application.applicationClass}</p>
<p><strong>Date:</strong> ${new Date().toISOString().slice(0, 10)}</p>
<p><strong>Export Path:</strong> ${exportPath}</p>
<h2>Documents</h2>
<table><tr><th>File</th><th>Status</th></tr>${rows}</table>
</body></html>`;
}
