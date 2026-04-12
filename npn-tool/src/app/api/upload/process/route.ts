import { NextRequest, NextResponse } from "next/server";
import { requireEditor, isErrorResponse } from "@/lib/auth/guard";
import { extractFromDocument, extractLicencePDF, extractCOA, extractStudy } from "@/lib/ai/document-reader";
import { extractTextFromPDF } from "@/lib/documents/pdf-reader";

export async function POST(req: NextRequest) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const context = formData.get("context") as string || "";

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Size limit: 20MB
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: `File too large (${Math.round(file.size / 1024 / 1024)}MB). Maximum is 20MB.` }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let textContent = "";

    // Extract text based on file type
    if (file.name.toLowerCase().endsWith(".pdf")) {
      try {
        textContent = await extractTextFromPDF(buffer);
      } catch (pdfError) {
        const pdfMsg = pdfError instanceof Error ? pdfError.message : "PDF could not be read";
        return NextResponse.json({
          error: pdfMsg,
          details: `File: ${file.name} (${Math.round(file.size / 1024)}KB)`,
        }, { status: 422 });
      }
    } else if (file.name.toLowerCase().endsWith(".csv")) {
      textContent = buffer.toString("utf-8");
    } else if (file.name.toLowerCase().endsWith(".txt")) {
      textContent = buffer.toString("utf-8");
    } else {
      textContent = buffer.toString("utf-8");
    }

    if (!textContent || textContent.trim().length < 10) {
      return NextResponse.json({
        error: "No readable text found in this PDF. It may be a scanned image.",
        suggestion: "Try a text-based PDF, or ensure it is not a scanned document.",
        details: `File: ${file.name}, extracted ${textContent.trim().length} chars`,
      }, { status: 422 });
    }

    // Route to type-specific extractor
    let result;
    try {
      switch (context) {
        case "licence_pdf": {
          const extracted = await extractLicencePDF(textContent);
          // Check if AI returned an error
          if (extracted.error) {
            return NextResponse.json({
              error: String(extracted.error),
              details: `AI could not extract data from ${file.name}`,
            }, { status: 422 });
          }
          result = { documentType: "licence_pdf", confidence: 0.9, extractedData: extracted, warnings: [] };
          break;
        }
        case "coa":
          result = { documentType: "coa", confidence: 0.9, extractedData: await extractCOA(textContent), warnings: [] };
          break;
        case "study":
          result = { documentType: "study", confidence: 0.9, extractedData: await extractStudy(textContent), warnings: [] };
          break;
        default:
          result = await extractFromDocument(textContent, file.name, context);
      }
    } catch (aiError) {
      const aiMsg = aiError instanceof Error ? aiError.message : "AI extraction failed";
      return NextResponse.json({
        error: aiMsg,
        details: `PDF text was extracted (${textContent.length} chars) but AI processing failed for ${file.name}`,
      }, { status: 422 });
    }

    return NextResponse.json({
      fileName: file.name,
      fileSize: file.size,
      textLength: textContent.length,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload processing failed";
    return NextResponse.json({ error: message, details: "Unexpected server error" }, { status: 500 });
  }
}
