import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";

// ── Layout constants ──
const MARGIN = 50;
const PAGE_WIDTH = 612; // Letter size
const PAGE_HEIGHT = 792;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const LINE_HEIGHT = 14;
const HEADING_SIZE = 16;
const SUBHEADING_SIZE = 12;
const BODY_SIZE = 10;
const SMALL_SIZE = 8;
const MAX_TABLE_COLS = 5; // Cap table columns to avoid squeezing

interface PdfSection {
  type: "heading" | "subheading" | "paragraph" | "list" | "table" | "spacer";
  text?: string;
  items?: string[];
  rows?: string[][];
  headers?: string[];
}

interface RenderCtx {
  doc: Awaited<ReturnType<typeof PDFDocument.create>>;
  font: PDFFont;
  fontBold: PDFFont;
  fontItalic: PDFFont;
  page: PDFPage;
  y: number;
  fieldIdx: number;
  fieldPrefix: string;
}

// ────────────────────────────────────────────────────────
// HTML → Sections parser
// ────────────────────────────────────────────────────────

function cleanHtml(raw: string): string {
  let html = raw;

  // FIX #1: Strip markdown code fences (```html ... ```)
  html = html.replace(/```\w*\s*/g, "");

  // FIX #2: Strip <head>...</head> (contains <title> that overlaps content)
  html = html.replace(/<head[\s\S]*?<\/head>/gi, "");

  // Extract body if present
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) html = bodyMatch[1];

  // Strip style/script blocks
  html = html.replace(/<style[\s\S]*?<\/style>/gi, "");
  html = html.replace(/<script[\s\S]*?<\/script>/gi, "");

  // Strip <noscript>, <meta>, <link> tags that leak through
  html = html.replace(/<(?:noscript|meta|link)[^>]*(?:\/>|>(?:[\s\S]*?<\/(?:noscript|meta|link)>)?)/gi, "");

  // Strip HTML comments
  html = html.replace(/<!--[\s\S]*?-->/g, "");

  return html;
}

function parseHtmlToSections(raw: string): PdfSection[] {
  const sections: PdfSection[] = [];
  const body = cleanHtml(raw);

  const blocks = body.split(/(?=<(?:h[1-6]|p|ul|ol|table|div|hr|br\s*\/?)[\s>])/i);

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    const h1 = trimmed.match(/<h[1-2][^>]*>([\s\S]*?)<\/h[1-2]>/i);
    if (h1) { sections.push({ type: "heading", text: stripTags(h1[1]) }); continue; }

    const h3 = trimmed.match(/<h[3-6][^>]*>([\s\S]*?)<\/h[3-6]>/i);
    if (h3) { sections.push({ type: "subheading", text: stripTags(h3[1]) }); continue; }

    const ul = trimmed.match(/<[uo]l[^>]*>([\s\S]*?)<\/[uo]l>/i);
    if (ul) {
      const items = [...ul[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map((m) => stripTags(m[1]));
      if (items.length) sections.push({ type: "list", items });
      continue;
    }

    const table = trimmed.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
    if (table) {
      const headerCells = [...table[1].matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map((m) => stripTags(m[1]));
      const rowMatches = [...table[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
      const rows: string[][] = [];
      for (const rm of rowMatches) {
        const cells = [...rm[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => stripTags(m[1]));
        if (cells.length) rows.push(cells);
      }
      if (rows.length || headerCells.length) {
        sections.push({ type: "table", headers: headerCells.length ? headerCells : undefined, rows });
      }
      continue;
    }

    if (/<hr/i.test(trimmed)) { sections.push({ type: "spacer" }); continue; }

    const pMatch = trimmed.match(/<(?:p|div)[^>]*>([\s\S]*?)<\/(?:p|div)>/i);
    if (pMatch) { const text = stripTags(pMatch[1]).trim(); if (text) sections.push({ type: "paragraph", text }); continue; }

    const plain = stripTags(trimmed).trim();
    if (plain && plain.length > 2) sections.push({ type: "paragraph", text: plain });
  }

  return sections;
}

// ────────────────────────────────────────────────────────
// Text helpers
// ────────────────────────────────────────────────────────

function stripTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&[a-z]+;/gi, " ")   // catch remaining HTML entities
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// FIX #3: Map Greek letters + common scientific symbols explicitly
function sanitizeForPdf(text: string): string {
  return text
    // Greek letters (common in scientific/NHP documents)
    .replace(/\u03B1/g, "alpha-")
    .replace(/\u03B2/g, "beta-")
    .replace(/\u03B3/g, "gamma-")
    .replace(/\u03B4/g, "delta-")
    .replace(/\u03B5/g, "epsilon-")
    .replace(/\u03B6/g, "zeta-")
    .replace(/\u03B7/g, "eta-")
    .replace(/\u03B8/g, "theta-")
    .replace(/\u03BC/g, "mu-")
    .replace(/\u03C0/g, "pi")
    .replace(/\u03C3/g, "sigma-")
    .replace(/\u03C9/g, "omega-")
    // Math / comparison
    .replace(/\u2265/g, ">=")
    .replace(/\u2264/g, "<=")
    .replace(/\u2260/g, "!=")
    .replace(/\u00B1/g, "+/-")
    .replace(/\u2248/g, "~=")
    // Punctuation
    .replace(/\u2013/g, "-")
    .replace(/\u2014/g, "--")
    .replace(/\u2018/g, "'")
    .replace(/\u2019/g, "'")
    .replace(/\u201C/g, '"')
    .replace(/\u201D/g, '"')
    .replace(/\u2022/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00B7/g, "-")
    // Symbols
    .replace(/\u00AE/g, "(R)")
    .replace(/\u2122/g, "(TM)")
    .replace(/\u00A9/g, "(C)")
    .replace(/\u00B0/g, " deg")
    .replace(/\u00B5/g, "u")      // micro sign → u (ug = microgram)
    // Subscript/superscript digits (common in chemical formulas)
    .replace(/[\u2080-\u2089]/g, (ch) => String(ch.charCodeAt(0) - 0x2080))
    .replace(/[\u00B2\u00B3\u00B9]/g, (ch) => {
      if (ch === "\u00B2") return "2";
      if (ch === "\u00B3") return "3";
      return "1";
    })
    // Catch-all: keep Latin-1 supplement, replace everything else
    .replace(/[^\x00-\x7F]/g, (ch) => {
      const code = ch.charCodeAt(0);
      if (code >= 0x80 && code <= 0xFF) return ch;
      return "";  // silently drop instead of showing "?"
    });
}

// ────────────────────────────────────────────────────────
// Shared section renderer
// ────────────────────────────────────────────────────────

// FIX #6: Reduced from 40 to 20 to avoid unnecessary blank pages
function ensurePage(ctx: RenderCtx, needed: number) {
  if (ctx.y - needed < MARGIN) {
    ctx.page = ctx.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    ctx.y = PAGE_HEIGHT - MARGIN;
  }
}

// FIX #4: Smart column width calculation based on content
function calcColWidths(headers: string[], rows: string[][], colCount: number): number[] {
  const capped = Math.min(colCount, MAX_TABLE_COLS);
  const widths: number[] = new Array(capped).fill(0);

  // Measure max content length per column
  for (let c = 0; c < capped; c++) {
    const hLen = headers[c] ? headers[c].length : 0;
    let maxDataLen = 0;
    for (const row of rows) {
      if (row[c]) maxDataLen = Math.max(maxDataLen, row[c].length);
    }
    widths[c] = Math.max(hLen, maxDataLen, 5); // minimum 5 chars
  }

  // Normalize to available width
  const total = widths.reduce((s, w) => s + w, 0);
  const minColW = 60; // minimum column width in points
  return widths.map((w) => Math.max((w / total) * CONTENT_WIDTH, minColW));
}

function renderSections(ctx: RenderCtx, sections: PdfSection[]) {
  const form = ctx.doc.getForm();

  for (const section of sections) {
    ensurePage(ctx, 20);

    switch (section.type) {
      case "heading": {
        ctx.y -= 8;
        const t = sanitizeForPdf(section.text || "").slice(0, 90);
        ctx.page.drawText(t, { x: MARGIN, y: ctx.y, size: HEADING_SIZE, font: ctx.fontBold });
        ctx.y -= HEADING_SIZE + 4;
        break;
      }

      case "subheading": {
        ctx.y -= 4;
        const t = sanitizeForPdf(section.text || "").slice(0, 110);
        ctx.page.drawText(t, { x: MARGIN, y: ctx.y, size: SUBHEADING_SIZE, font: ctx.fontBold, color: rgb(0.2, 0.2, 0.2) });
        ctx.y -= SUBHEADING_SIZE + 3;
        break;
      }

      case "paragraph": {
        const text = sanitizeForPdf(section.text || "");
        if (!text) break;
        if (text.length > 80) {
          const lines = Math.ceil(text.length / 75);
          const fH = Math.min(Math.max(lines * LINE_HEIGHT, 28), 140);
          ensurePage(ctx, fH + 4);
          const tf = form.createTextField(`${ctx.fieldPrefix}f_${ctx.fieldIdx++}`);
          tf.setText(text);
          tf.enableMultiline();
          tf.addToPage(ctx.page, { x: MARGIN, y: ctx.y - fH, width: CONTENT_WIDTH, height: fH, borderWidth: 0.5, borderColor: rgb(0.8, 0.8, 0.8) });
          tf.setFontSize(BODY_SIZE);
          ctx.y -= fH + 4;
        } else {
          ctx.page.drawText(text, { x: MARGIN, y: ctx.y, size: BODY_SIZE, font: ctx.font });
          ctx.y -= LINE_HEIGHT;
        }
        break;
      }

      case "list": {
        for (const item of section.items || []) {
          ensurePage(ctx, LINE_HEIGHT + 2);
          const t = sanitizeForPdf(item).slice(0, 110);
          ctx.page.drawText(`- ${t}`, { x: MARGIN + 8, y: ctx.y, size: BODY_SIZE, font: ctx.font, color: rgb(0.2, 0.2, 0.2) });
          ctx.y -= LINE_HEIGHT;
        }
        ctx.y -= 2;
        break;
      }

      case "table": {
        const headers = section.headers || [];
        const rows = section.rows || [];
        const rawColCount = Math.max(headers.length, rows[0]?.length || 1);
        const colCount = Math.min(rawColCount, MAX_TABLE_COLS);
        const colWidths = calcColWidths(headers, rows, rawColCount);
        const rowH = LINE_HEIGHT + 6;

        // Headers
        if (headers.length) {
          ensurePage(ctx, rowH + 2);
          ctx.page.drawRectangle({ x: MARGIN, y: ctx.y - rowH, width: CONTENT_WIDTH, height: rowH, color: rgb(0.93, 0.93, 0.93) });
          let xOff = MARGIN;
          for (let c = 0; c < colCount && c < headers.length; c++) {
            const maxChars = Math.floor(colWidths[c] / (SMALL_SIZE * 0.45));
            const ht = sanitizeForPdf(headers[c]).slice(0, maxChars);
            ctx.page.drawText(ht, { x: xOff + 3, y: ctx.y - rowH + 5, size: SMALL_SIZE, font: ctx.fontBold });
            xOff += colWidths[c];
          }
          ctx.y -= rowH;
        }

        // Data rows
        for (const row of rows) {
          ensurePage(ctx, rowH + 2);
          ctx.page.drawLine({ start: { x: MARGIN, y: ctx.y }, end: { x: PAGE_WIDTH - MARGIN, y: ctx.y }, thickness: 0.2, color: rgb(0.9, 0.9, 0.9) });
          let xOff = MARGIN;
          for (let c = 0; c < colCount && c < row.length; c++) {
            const tf = form.createTextField(`${ctx.fieldPrefix}t_${ctx.fieldIdx++}`);
            tf.setText(sanitizeForPdf(row[c]));
            tf.addToPage(ctx.page, { x: xOff + 1, y: ctx.y - rowH + 1, width: colWidths[c] - 2, height: rowH - 2, borderWidth: 0 });
            tf.setFontSize(SMALL_SIZE);
            xOff += colWidths[c];
          }
          ctx.y -= rowH;
        }
        ctx.y -= 4;
        break;
      }

      case "spacer": {
        ctx.y -= 8;
        ensurePage(ctx, 2);
        ctx.page.drawLine({ start: { x: MARGIN, y: ctx.y }, end: { x: PAGE_WIDTH - MARGIN, y: ctx.y }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
        ctx.y -= 8;
        break;
      }
    }
  }
}

function renderDocHeader(ctx: RenderCtx, title: string, productName?: string) {
  ctx.page.drawText(sanitizeForPdf(title), { x: MARGIN, y: ctx.y, size: HEADING_SIZE, font: ctx.fontBold, color: rgb(0.6, 0.1, 0.1) });
  ctx.y -= 18;
  if (productName) {
    ctx.page.drawText(sanitizeForPdf(productName), { x: MARGIN, y: ctx.y, size: SMALL_SIZE, font: ctx.fontItalic, color: rgb(0.4, 0.4, 0.4) });
    ctx.y -= 10;
  }
  ctx.page.drawText(`Date: ${new Date().toISOString().slice(0, 10)}`, { x: MARGIN, y: ctx.y, size: SMALL_SIZE, font: ctx.fontItalic, color: rgb(0.4, 0.4, 0.4) });
  ctx.y -= 8;
  ctx.page.drawLine({ start: { x: MARGIN, y: ctx.y }, end: { x: PAGE_WIDTH - MARGIN, y: ctx.y }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
  ctx.y -= 12;
}

function renderFooter(ctx: RenderCtx) {
  ctx.y -= 12;
  ensurePage(ctx, 20);
  ctx.page.drawLine({ start: { x: MARGIN, y: ctx.y }, end: { x: PAGE_WIDTH - MARGIN, y: ctx.y }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
  ctx.y -= 10;
  ctx.page.drawText("Generated by NPN Filing Tool - Wellnessextract", { x: MARGIN, y: ctx.y, size: SMALL_SIZE, font: ctx.fontItalic, color: rgb(0.5, 0.5, 0.5) });
  ctx.y -= 10;
  ctx.page.drawText("This PDF contains editable form fields. Open in Adobe Acrobat or compatible reader to edit.", { x: MARGIN, y: ctx.y, size: SMALL_SIZE, font: ctx.fontItalic, color: rgb(0.5, 0.5, 0.5) });
}

// ────────────────────────────────────────────────────────
// Context factory
// ────────────────────────────────────────────────────────

async function createCtx(doc: Awaited<ReturnType<typeof PDFDocument.create>>, prefix: string): Promise<RenderCtx> {
  return {
    doc,
    font: await doc.embedFont(StandardFonts.Helvetica),
    fontBold: await doc.embedFont(StandardFonts.HelveticaBold),
    fontItalic: await doc.embedFont(StandardFonts.HelveticaOblique),
    page: doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]),
    y: PAGE_HEIGHT - MARGIN,
    fieldIdx: 0,
    fieldPrefix: prefix,
  };
}

// ────────────────────────────────────────────────────────
// Public API: single-document PDF
// ────────────────────────────────────────────────────────

export async function generateSingleDocPdf(
  title: string,
  htmlContent: string,
  metadata?: { productName?: string; date?: string }
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(title);
  doc.setAuthor("NPN Filing Tool - Wellnessextract");
  doc.setCreator("NPN Filing Tool");

  const ctx = await createCtx(doc, "s_");
  renderDocHeader(ctx, title, metadata?.productName);
  renderSections(ctx, parseHtmlToSections(htmlContent));
  renderFooter(ctx);

  return doc.save();
}

// ────────────────────────────────────────────────────────
// Public API: combined multi-document PDF
// ────────────────────────────────────────────────────────

export async function generateCombinedPdf(
  documents: { documentType: string; label: string; content: string }[],
  metadata: { productName: string; applicationClass: string }
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`PLA Package - ${metadata.productName}`);
  doc.setAuthor("NPN Filing Tool - Wellnessextract");
  doc.setCreator("NPN Filing Tool");

  const ctx = await createCtx(doc, "");

  // Cover page
  const centerX = PAGE_WIDTH / 2;
  ctx.page.drawText("Product Licence Application", {
    x: centerX - ctx.fontBold.widthOfTextAtSize("Product Licence Application", 22) / 2,
    y: 550, size: 22, font: ctx.fontBold, color: rgb(0.6, 0.1, 0.1),
  });
  ctx.page.drawText("Submission Package", {
    x: centerX - ctx.font.widthOfTextAtSize("Submission Package", 16) / 2,
    y: 520, size: 16, font: ctx.font, color: rgb(0.3, 0.3, 0.3),
  });
  ctx.page.drawText(sanitizeForPdf(metadata.productName), {
    x: centerX - ctx.fontBold.widthOfTextAtSize(sanitizeForPdf(metadata.productName), 18) / 2,
    y: 470, size: 18, font: ctx.fontBold,
  });
  ctx.page.drawText(`Application Class: ${metadata.applicationClass}`, {
    x: centerX - ctx.font.widthOfTextAtSize(`Application Class: ${metadata.applicationClass}`, 12) / 2,
    y: 440, size: 12, font: ctx.font, color: rgb(0.4, 0.4, 0.4),
  });
  ctx.page.drawText(`Date: ${new Date().toISOString().slice(0, 10)}`, {
    x: centerX - ctx.font.widthOfTextAtSize(`Date: ${new Date().toISOString().slice(0, 10)}`, 12) / 2,
    y: 415, size: 12, font: ctx.font, color: rgb(0.4, 0.4, 0.4),
  });

  let tocY = 340;
  ctx.page.drawText("Documents Included:", { x: MARGIN, y: tocY, size: 12, font: ctx.fontBold });
  tocY -= 20;
  for (let i = 0; i < documents.length; i++) {
    ctx.page.drawText(`${i + 1}. ${sanitizeForPdf(documents[i].label)}`, { x: MARGIN + 10, y: tocY, size: 10, font: ctx.font, color: rgb(0.3, 0.3, 0.3) });
    tocY -= 16;
  }

  // Each document
  for (const docItem of documents) {
    if (!docItem.content) continue;

    ctx.page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    ctx.y = PAGE_HEIGHT - MARGIN;
    ctx.fieldPrefix = `${docItem.documentType}_`;

    renderDocHeader(ctx, docItem.label, metadata.productName);
    renderSections(ctx, parseHtmlToSections(docItem.content));
  }

  renderFooter(ctx);
  return doc.save();
}
