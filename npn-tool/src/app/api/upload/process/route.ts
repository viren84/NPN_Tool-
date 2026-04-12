import { NextRequest, NextResponse } from "next/server";
import { requireEditor, isErrorResponse } from "@/lib/auth/guard";
import { extractFromDocument, extractLicencePDF, extractCOA, extractStudy } from "@/lib/ai/document-reader";
import { PDFParse } from "pdf-parse";

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
      return NextResponse.json({ error: "File too large. Max 20MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let textContent = "";

    // Extract text based on file type
    if (file.name.toLowerCase().endsWith(".pdf")) {
      const parser = new PDFParse({ data: buffer });
      const pdfResult = await parser.getText();
      textContent = pdfResult.text || "";
    } else if (file.name.toLowerCase().endsWith(".csv")) {
      textContent = buffer.toString("utf-8");
    } else if (file.name.toLowerCase().endsWith(".txt")) {
      textContent = buffer.toString("utf-8");
    } else {
      // Try as text
      textContent = buffer.toString("utf-8");
    }

    if (!textContent || textContent.trim().length < 10) {
      return NextResponse.json({
        error: "Could not extract text from file. The file may be scanned/image-based.",
        suggestion: "Try a text-based PDF or contact support for image-based document processing."
      }, { status: 422 });
    }

    // Route to type-specific extractor if context is provided
    let result;
    switch (context) {
      case "licence_pdf":
        result = {
          documentType: "licence_pdf",
          confidence: 0.9,
          extractedData: await extractLicencePDF(textContent),
          warnings: [],
        };
        break;
      case "coa":
        result = {
          documentType: "coa",
          confidence: 0.9,
          extractedData: await extractCOA(textContent),
          warnings: [],
        };
        break;
      case "study":
        result = {
          documentType: "study",
          confidence: 0.9,
          extractedData: await extractStudy(textContent),
          warnings: [],
        };
        break;
      default:
        // Auto-classify and extract
        result = await extractFromDocument(textContent, file.name, context);
    }

    return NextResponse.json({
      fileName: file.name,
      fileSize: file.size,
      textLength: textContent.length,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
