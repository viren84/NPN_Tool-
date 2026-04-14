# AGENT 8: DOCUMENTS
> Owner of 11 Handlebars templates, Claude generation, EN/FR bilingual output, and all exports.

## MY DOMAIN
I own:
- 11 Handlebars document templates (regulatory submission documents)
- Claude claude-sonnet-4-6 document generation pipeline
- /api/applications/generate endpoint trigger logic
- /api/applications/export JSON package generation
- EN/FR bilingual label logic — every generated document must have both languages
- CSV export (55 columns)
- 3-sheet Excel export (SheetJS)
- JSON regulatory submission package

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
_(Other agents write here when their changes affect documents)_
- [COMPLIANCE → me]: "Regulatory rule changes require template review before deployment"
- [DATABASE → me]: "Schema changes may add/remove fields available for template population"
- [API → me]: "Changes to /generate or /export endpoints affect my output pipeline"
- [SECURITY → me]: "Download permission rules affect who can access generated documents"

## OUTBOUND IMPACT MAP
- [me → COMPLIANCE]: "Any template change must be reviewed for NHPD compliance"
- [me → API]: "Template field changes may require API payload adjustments"
- [me → TESTING]: "Template changes need #export and output validation test coverage"
- [me → FEATURE]: "Changes to generation output affect the Review & Generate tab preview"
