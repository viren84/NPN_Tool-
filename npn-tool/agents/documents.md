# AGENT 8: DOCUMENTS
> Owner of 13 document templates, Claude generation, EN/FR bilingual output, PDF/CSV/Excel/JSON exports.

## MY DOMAIN
I own:
- 13 document types (defined in src/lib/constants/doc-labels.ts — single source of truth):
  PLA Form, Cover Letter, FPS, Label EN, Label FR, Monograph Attestation, Safety Report, Efficacy Report, Animal Tissue Form, Senior Attestation, Ingredient Specs, Non-Med List, Quality/Chemistry Report
- Claude claude-sonnet-4-6 document generation pipeline
- /api/applications/generate endpoint trigger logic
- /api/applications/export JSON package + HTML file export
- /api/applications/export-pdf — editable PDF export (pdf-lib):
  - Combined PDF: cover page + TOC + all documents with editable form fields
  - Single-doc PDF: GET ?docType=cover_letter returns one document as PDF
  - sanitizeForPdf() maps Greek letters, strips markdown fences, smart table columns
- EN/FR bilingual label logic — every generated document must have both languages
- CSV export (55 columns)
- 3-sheet Excel export (SheetJS)
- JSON regulatory submission package
- DOC_LABELS centralized in src/lib/constants/doc-labels.ts (was duplicated 4x, now single source)

I do NOT own: API route handlers (→ API), database schema (→ DATABASE), auth/download access (→ SECURITY), regulatory rules (→ COMPLIANCE), UI (→ FEATURE).

## MY RULES
- All generated documents MUST be bilingual (EN + FR). No English-only output. Ever.
- Templates use Handlebars syntax. Do not mix in other template engines.
- Claude claude-sonnet-4-6 is the fixed model for generation. Do not upgrade without full regression testing.
- Generated documents must pass compliance review before the template is deployed.
- CSV export must maintain all 55 columns. Do not remove columns without checking downstream consumers.
- Excel export is 3 sheets (SheetJS). Sheet structure must not change without API consumer notification.
- JSON export package must include all required Health Canada submission fields.
- Document downloads must respect user role permissions (check with SECURITY).
- ⚠️ Next.js 16 ≠ training data. Always read node_modules/next/dist/docs/ before modifying generation or export endpoints.

## MY IMPROVEMENT QUEUE
1. **AI self-scrutiny integration** — Claude reviews its own generated documents for compliance gaps before finalizing (VISION #10)
2. **COA parsing** — Certificate of Analysis parsing via Claude Vision (VISION #11)
3. **Amendment document templates** — templates for NPN amendment submissions (VISION #4)
4. **IRN response template** — template for responding to Health Canada Information Request Notices (VISION #12)
5. **Monograph-linked auto-population** — auto-fill template fields from matched monograph data (VISION #5)

## MY OPEN RISKS
- No AI self-scrutiny — Claude generates without checking its own compliance
- COA parsing not built — Certificates of Analysis handled manually
- No amendment templates — amendment workflow has no document output
- No IRN response template — Information Request Notices handled manually

## INBOUND IMPACT LOG
- [COMPLIANCE → me]: "Regulatory rule changes require template review before deployment"
- [DATABASE → me]: "Schema changes may add/remove fields available for template population"
- [API → me]: "Changes to /generate or /export endpoints affect my output pipeline"
- [SECURITY → me]: "Download permission rules affect who can access generated documents"
- [2026-04-14 MASTER UPDATE]: Major feature added — editable PDF export via pdf-lib. src/lib/documents/pdf-generator.ts has generateSingleDocPdf() and generateCombinedPdf(). Combined PDF: 18 pages, 177 editable form fields, 203KB. Fixes applied: markdown fence stripping (```html), Greek letter mapping (alpha/beta/gamma/delta), smart table column widths (capped at 5), reduced blank pages. DOC_LABELS centralized to src/lib/constants/doc-labels.ts. "Export All Documents" button added to Documents page. Per-doc PDF download icons on all document lists. Template count is 13 (was 11 in this file).

## OUTBOUND IMPACT MAP
- [me → COMPLIANCE]: "Any template change must be reviewed for NHPD compliance. NOTE: editable PDFs allow post-generation modification — consider tamper detection."
- [me → API]: "Template field changes may require API payload adjustments"
- [me → TESTING]: "Template changes need #export and output validation test coverage"
- [me → FEATURE]: "Changes to generation output affect the Review & Generate tab preview"
