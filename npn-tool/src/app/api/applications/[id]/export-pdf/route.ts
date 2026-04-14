import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { generateSingleDocPdf, generateCombinedPdf } from "@/lib/documents/pdf-generator";
import { DOC_LABELS, DOC_ORDER, numberedLabel } from "@/lib/constants/doc-labels";

/**
 * GET /api/applications/{id}/export-pdf
 *   → Combined PDF with all documents
 *
 * GET /api/applications/{id}/export-pdf?docType=cover_letter
 *   → Single-document PDF
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const docType = req.nextUrl.searchParams.get("docType");

  try {
    const application = await prisma.application.findUnique({
      where: { id },
      include: { documents: true },
    });

    if (!application) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const safeName = application.productName.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_");

    // ── Single document ──
    if (docType) {
      const doc = application.documents.find((d) => d.documentType === docType);
      if (!doc) return NextResponse.json({ error: `Document type "${docType}" not found` }, { status: 404 });

      const pdfBytes = await generateSingleDocPdf(
        numberedLabel(docType),
        doc.content,
        { productName: application.productName, date: new Date().toISOString().slice(0, 10) }
      );

      return new NextResponse(pdfBytes, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${safeName}_${docType}.pdf"`,
          "Content-Length": String(pdfBytes.length),
        },
      });
    }

    // ── Combined PDF ──
    const docs = application.documents
      .filter((d) => d.content)
      .sort((a, b) => DOC_ORDER.indexOf(a.documentType) - DOC_ORDER.indexOf(b.documentType))
      .map((d) => ({
        documentType: d.documentType,
        label: numberedLabel(d.documentType),
        content: d.content,
      }));

    const pdfBytes = await generateCombinedPdf(docs, {
      productName: application.productName,
      applicationClass: application.applicationClass,
    });

    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="PLA_${safeName}_Complete.pdf"`,
        "Content-Length": String(pdfBytes.length),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "PDF generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
