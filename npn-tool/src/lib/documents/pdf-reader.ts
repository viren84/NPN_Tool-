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

    // Write error details to a separate file so we can detect specific failure types
    const errFile = tmpFile + ".err";
    const errPath = errFile.replace(/\\/g, "/");
    const script = `const{PDFParse}=require('pdf-parse');const fs=require('fs');const d=fs.readFileSync('${inFile}');new PDFParse({data:new Uint8Array(d)}).getText().then(r=>{fs.writeFileSync('${outFile}',r.text||'')}).catch(e=>{fs.writeFileSync('${errPath}',e.message||'Unknown PDF parse error')})`;

    execSync(`node -e "${script}"`, { timeout: 30000, stdio: "pipe" });

    // Check if parsing produced an error
    if (fs.existsSync(errFile)) {
      const errMsg = fs.readFileSync(errFile, "utf-8").trim();
      try { fs.unlinkSync(errFile); } catch { /* cleanup */ }
      if (errMsg.toLowerCase().includes("encrypt") || errMsg.toLowerCase().includes("password")) {
        throw new Error("This PDF is password-protected or encrypted");
      }
      throw new Error(`PDF could not be parsed: ${errMsg.slice(0, 150)}`);
    }

    if (fs.existsSync(tmpOut)) {
      const text = fs.readFileSync(tmpOut, "utf-8");
      if (text.trim().length === 0) {
        // PDF parsed but has no text — likely scanned/image-based
        return "";
      }
      return text;
    }
    return "";
  } catch (e) {
    // Re-throw our custom errors (from above)
    if (e instanceof Error && (e.message.includes("password-protected") || e.message.includes("PDF could not be parsed"))) {
      throw e;
    }
    // Detect timeout
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("TIMEOUT") || msg.includes("timed out") || msg.includes("ETIMEDOUT")) {
      throw new Error("PDF reading timed out (30s) — file may be too large or complex");
    }
    // Generic parse failure
    console.error("[PDF Reader] Failed:", msg.slice(0, 200));
    throw new Error(`PDF extraction failed: ${msg.slice(0, 100)}`);
  } finally {
    try { fs.unlinkSync(tmpFile); } catch { /* cleanup */ }
    try { fs.unlinkSync(tmpOut); } catch { /* cleanup */ }
  }
}

/**
 * Extract text from a PDF file path directly.
 */
export async function extractTextFromPDFFile(filePath: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);
  return extractTextFromPDF(buffer);
}
