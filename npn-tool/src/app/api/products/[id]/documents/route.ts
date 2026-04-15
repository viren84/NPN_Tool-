import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, requireEditor, isErrorResponse } from "@/lib/auth/guard";
import { logAudit } from "@/lib/db/audit";
import { handlePrismaError } from "@/lib/errors/handle-prisma";
import { extractTextFromPDF } from "@/lib/documents/pdf-reader";
import { extractCOA, extractStudy, extractFromDocument } from "@/lib/ai/document-reader";
import * as fs from "fs";
import * as path from "path";

/**
 * GET /api/products/[id]/documents?stage=research
 * List all documents for a product, optionally filtered by stage.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth();
  if (isErrorResponse(user)) return user;

  const { id } = await params;
  const stage = req.nextUrl.searchParams.get("stage") || undefined;

  try {
    const where: Record<string, string> = { productId: id };
    if (stage) where.stage = stage;

    const docs = await prisma.productDocument.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(docs);
  } catch (err) {
    return handlePrismaError(err, "list product documents");
  }
}

/**
 * POST /api/products/[id]/documents
 * Upload a document with stage + docType metadata.
 * Accepts multipart/form-data: file, stage, docType, title, notes
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireEditor();
  if (isErrorResponse(user)) return user;

  const { id } = await params;

  try {
    // Verify product exists
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const stage = (formData.get("stage") as string) || product.stage;
    const docType = (formData.get("docType") as string) || "other";
    const title = (formData.get("title") as string) || "";
    const notes = (formData.get("notes") as string) || "";

    if (!file) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    // Size check (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Max 50MB." }, { status: 400 });
    }

    // Save file to disk
    const dir = path.join(process.cwd(), "data", "attachments", "product", id);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const timestamp = Date.now();
    const diskName = `${timestamp}_${safeName}`;
    const filePath = path.join(dir, diskName);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    // Determine file type
    const ext = path.extname(file.name).replace(".", "").toLowerCase();

    // Create DB record
    const doc = await prisma.productDocument.create({
      data: {
        productId: id,
        stage,
        docType,
        title: title || file.name,
        fileName: file.name,
        fileType: ext,
        fileSize: file.size,
        filePath,
        extractionStatus: "pending",
        uploadedById: user.id,
        notes,
      },
    });

    // Update product document count
    const count = await prisma.productDocument.count({ where: { productId: id } });
    await prisma.product.update({ where: { id }, data: { documentCount: count } });

    await logAudit(
      user.id,
      "uploaded",
      "product_document",
      doc.id,
      `${user.name} uploaded "${file.name}" (${docType}) to product "${product.name}" at stage ${stage}`,
    );

    // AI extraction (non-blocking — runs after response)
    const extractableTypes = ["coa", "supplier_spec", "study", "marketing_material", "competitor_label", "market_report"];
    if (ext === "pdf" && extractableTypes.includes(docType)) {
      // Fire and forget — extraction runs in background
      (async () => {
        try {
          await prisma.productDocument.update({
            where: { id: doc.id },
            data: { extractionStatus: "processing" },
          });

          const text = await extractTextFromPDF(buffer);
          if (!text || text.trim().length < 50) {
            await prisma.productDocument.update({
              where: { id: doc.id },
              data: { extractionStatus: "failed", extractionError: "PDF has no extractable text (may be image-based)" },
            });
            return;
          }

          let extracted: Record<string, unknown>;
          if (docType === "coa") {
            extracted = await extractCOA(text);
          } else if (docType === "study") {
            extracted = await extractStudy(text);
          } else {
            const result = await extractFromDocument(text, file.name, docType);
            extracted = { ...result.extractedData, documentType: result.documentType, confidence: result.confidence, warnings: result.warnings };
          }

          await prisma.productDocument.update({
            where: { id: doc.id },
            data: {
              extractedDataJson: JSON.stringify(extracted),
              extractionStatus: (extracted as Record<string, unknown>).error ? "failed" : "completed",
              extractionError: ((extracted as Record<string, unknown>).error as string) || "",
            },
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Extraction failed";
          await prisma.productDocument.update({
            where: { id: doc.id },
            data: { extractionStatus: "failed", extractionError: msg.slice(0, 500) },
          }).catch(() => {});
        }
      })();
    }

    return NextResponse.json(doc, { status: 201 });
  } catch (err) {
    return handlePrismaError(err, "upload product document");
  }
}
