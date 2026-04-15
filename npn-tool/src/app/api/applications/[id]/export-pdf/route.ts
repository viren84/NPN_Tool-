import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { generateSingleDocPdf, generateCombinedPdf } from "@/lib/documents/pdf-generator";
import { DOC_LABELS, DOC_ORDER, numberedLabel } from "@/lib/constants/doc-labels";

/**
 * GET /api/applications/{id}/export-pdf
 *   → Combined PDF with ALL documents
 *
 * GET /api/applications/{id}/export-pdf?docType=cover_letter
 *   → Single-document PDF
 *
 * GET /api/applications/{id}/export-pdf?docTypes=cover_letter,fps_form,label_en
 *   → Selective bundle: combined PDF with only the selected document types
 *
 * GET /api/applications/{id}/export-pdf?list=true
 *   → Returns JSON list of available documents (for UI selection)
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const docType = req.nextUrl.searchParams.get("docType");
  const docTypes = req.nextUrl.searchParams.get("docTypes");
  const listMode = req.nextUrl.searchParams.get("list");

  try {
    const application = await prisma.application.findUnique({
      where: { id },
      include: { documents: true },
    });

    if (!application) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const safeName = application.productName.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_");

    // ── List mode: return available documents for UI selection ──
    if (listMode === "true") {
      const available = application.documents
        .filter((d) => d.content)
        .sort((a, b) => DOC_ORDER.indexOf(a.documentType) - DOC_ORDER.indexOf(b.documentType))
        .map((d) => ({
          documentType: d.documentType,
          label: DOC_LABELS[d.documentType] || d.documentType,
          numberedLabel: numberedLabel(d.documentType),
          status: d.status,
          hasContent: !!d.content,
        }));
      return NextResponse.json({ productName: application.productName, documents: available });
    }

    // ── Single document ──
    if (docType) {
      const doc = application.documents.find((d) => d.documentType === docType);
      if (!doc) return NextResponse.json({ error: `Document type "${docType}" not found` }, { status: 404 });

      const pdfBytes = await generateSingleDocPdf(
        numberedLabel(docType),
        doc.content,
        { productName: application.productName, date: new Date().toISOString().slice(0, 10) }
      );

      return new NextResponse(Buffer.from(pdfBytes), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${safeName}_${docType}.pdf"`,
          "Content-Length": String(pdfBytes.length),
        },
      });
    }

    // ── Selective bundle: specific document types ──
    if (docTypes) {
      const selectedTypes = docTypes.split(",").map((t) => t.trim()).filter(Boolean);
      const selectedDocs = application.documents
        .filter((d) => d.content && selectedTypes.includes(d.documentType))
        .sort((a, b) => DOC_ORDER.indexOf(a.documentType) - DOC_ORDER.indexOf(b.documentType))
        .map((d) => ({
          documentType: d.documentType,
          label: numberedLabel(d.documentType),
          content: d.content,
        }));

      if (selectedDocs.length === 0) {
        return NextResponse.json({ error: "No matching documents found for the selected types" }, { status: 404 });
      }

      // If only 1 selected, return as single doc PDF
      if (selectedDocs.length === 1) {
        const pdfBytes = await generateSingleDocPdf(
          selectedDocs[0].label,
          selectedDocs[0].content,
          { productName: application.productName, date: new Date().toISOString().slice(0, 10) }
        );
        return new NextResponse(Buffer.from(pdfBytes), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${safeName}_${selectedDocs[0].documentType}.pdf"`,
            "Content-Length": String(pdfBytes.length),
          },
        });
      }

      // Multiple selected → combined PDF
      const pdfBytes = await generateCombinedPdf(selectedDocs, {
        productName: application.productName,
        applicationClass: application.applicationClass,
      });

      return new NextResponse(Buffer.from(pdfBytes), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="PLA_${safeName}_Selected_${selectedDocs.length}docs.pdf"`,
          "Content-Length": String(pdfBytes.length),
        },
      });
    }

    // ── Combined PDF (ALL documents) ──
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

    return new NextResponse(Buffer.from(pdfBytes), {
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
