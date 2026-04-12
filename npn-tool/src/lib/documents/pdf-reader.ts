import { execSync } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";

/**
 * Extract text from a PDF buffer using a subprocess.
 * Uses inline Node command to avoid Turbopack module resolution issues.
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const tmpFile = path.join(os.tmpdir(), `pdf_${Date.now()}_${Math.random().toString(36).slice(2)}.pdf`);
  const tmpOut = tmpFile + ".txt";

  try {
    fs.writeFileSync(tmpFile, buffer);

    const inFile = tmpFile.replace(/\\/g, "/");
    const outFile = tmpOut.replace(/\\/g, "/");

    const script = `const{PDFParse}=require('pdf-parse');const fs=require('fs');const d=fs.readFileSync('${inFile}');new PDFParse({data:new Uint8Array(d)}).getText().then(r=>{fs.writeFileSync('${outFile}',r.text||'')}).catch(()=>{fs.writeFileSync('${outFile}','')})`;

    execSync(`node -e "${script}"`, { timeout: 30000, stdio: "pipe" });

    if (fs.existsSync(tmpOut)) {
      return fs.readFileSync(tmpOut, "utf-8");
    }
    return "";
  } catch (e) {
    console.error("[PDF Reader] Failed:", e instanceof Error ? e.message.slice(0, 200) : e);
    return "";
  } finally {
    try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
    try { fs.unlinkSync(tmpOut); } catch { /* ignore */ }
  }
}

/**
 * Extract text from a PDF file path directly.
 */
export async function extractTextFromPDFFile(filePath: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);
  return extractTextFromPDF(buffer);
}
