<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

@AGENTS.md

---

## CURRENT SPRINT
_No active sprint. Ready for next vision item._

Next up: VISION #1 — Product Pipeline (pre-NPN products by name)
Blocked by: DATABASE agent must design Product model first.

---

## OPEN RISKS

| # | Risk | Severity | Owner Agent | Vision # |
|---|---|---|---|---|
| 1 | Secure Vault not built — sensitive docs unprotected | HIGH | SECURITY | #6 |
| 2 | Dr. Naresh review workflow unowned — informal reviews only | HIGH | COMPLIANCE | #3 |
| 3 | No rate limiting on mutating routes | MEDIUM | API | — |
| 4 | No AI self-scrutiny — Claude doesn't check its own output | MEDIUM | DOCUMENTS | #10 |
| 5 | No tenant isolation — multi-company blocked | MEDIUM | DATABASE | #9 |
| 6 | Product Pipeline has no schema — FEATURE blocked | MEDIUM | DATABASE | #1 |

---

## API SCHEMA SUMMARY

**~60 API routes** across src/app/api/

Core endpoints:
- POST /api/upload/process — PDF import (Claude extraction → dedup → enrich)
- GET/POST /api/licences — ProductLicence CRUD
- GET/POST /api/applications — Application (PLA) CRUD
- POST /api/applications/generate — Document generation (13 templates)
- GET /api/applications/export — JSON package export
- POST /api/applications/export — HTML file package export
- GET /api/applications/export-pdf — Editable PDF export (combined or ?docType= single)
- POST /api/sync/lnhpd/{id} — Single licence LNHPD sync
- POST /api/sync/bulk — Bulk LNHPD sync
- GET/POST /api/ingredients — Ingredient knowledge base
- GET/POST /api/company — Company/Facility management
- POST /api/auth/login — Authentication
- POST /api/auth/logout — Session end
- GET /api/activity — Activity feed (requireAuth)
- GET /api/search — Global search (XSS sanitized)
- GET /api/dashboard/stats — Dashboard statistics

Auth levels: requireAuth (all read + activity), requireEditor (create/update), requireAdmin (delete/config)

---

## NPN COMPLIANCE STATUS

**Framework:** Health Canada NHPD (Natural Health Products Directorate)
**Company code:** 45028 (UV International Traders Inc)

Classification system:
- **Class I** — lowest risk, compendial monograph ingredients, standard claims
- **Class II** — moderate risk, traditional evidence, broader claims
- **Class III** — highest risk, non-traditional, requires full safety/efficacy data

Current state:
- Class I/II/III derivation: BUILT and working in LNHPD sync
- Claim validation: BUILT in Application builder (client-side only — no server-side enforcement yet)
- EN/FR bilingual output: BUILT in all 13 templates
- Editable PDF export: BUILT (pdf-lib, form fields, single + combined)
- Dr. Naresh review: NOT BUILT (VISION #3)
- AI self-scrutiny: NOT BUILT (VISION #10)
- Amendment handling: NOT BUILT (VISION #4)
- IRN response: NOT BUILT (VISION #12)

---

## WHO IS WORKING ON WHAT

| Agent | Domain | Status | Top Priority |
|---|---|---|---|
| SUTRADHAAR | Orchestration | Active | Vision dependency mapping |
| SECURITY | Auth, Vault | Waiting | Build Secure Vault (VISION #6) |
| DATABASE | Schema, Migrations | Waiting | Product Pipeline schema (VISION #1) |
| COMPLIANCE | NHPD Rules | Waiting | Dr. Naresh workflow (VISION #3) |
| API | ~60 Routes, LNHPD Sync | Waiting | Tool 2 read-only API (VISION #8) |
| FEATURE | UI, 8-Tab Builder, Wizard | Waiting | Product Pipeline view (VISION #1) |
| TESTING | 136 Tests | GREEN | Add #pipeline tag (VISION #1) |
| DOCUMENTS | 13 Templates, PDF/CSV/Excel | Waiting | AI self-scrutiny (VISION #10) |
