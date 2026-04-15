<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

@AGENTS.md

---

## CURRENT SPRINT
_Gap fix session in progress._

VISION #1 (Product Pipeline) — BUILT: Schema (27 fields, 15 stages), CRUD API, list page with stage filters + search, detail page with timeline, create modal.
VISION #2 (15-stage lifecycle) — BUILT: Stages defined, stage transitions in UI, stage filter bar.
VISION #3 (Review workflow) — BUILT: Review request/decision API, reviewer picker (team member selector), approve/reject/needs_changes UI.
VISION #8 (Tool 2 API) — BUILT: v2 read-only endpoints with X-API-Key auth.

Next up: VISION #4 (Amendment lifecycle), VISION #6 (Secure Vault access logic), VISION #5 (Monograph sync).

---

## OPEN RISKS

| # | Risk | Severity | Owner Agent | Vision # | Status |
|---|---|---|---|---|---|
| 1 | Secure Vault access logic not built — schema ready, guards missing | HIGH | SECURITY | #6 | Not started |
| 2 | No rate limiting on mutating routes | MEDIUM | API | — | Not started |
| 3 | No AI self-scrutiny — Claude doesn't check its own output | MEDIUM | DOCUMENTS | #10 | Not started |
| 4 | No tenant isolation — multi-company blocked | MEDIUM | DATABASE | #9 | Not started |
| 5 | ~~Product Pipeline has no schema~~ | ~~MEDIUM~~ | ~~DATABASE~~ | ~~#1~~ | RESOLVED |
| 6 | ~~Dr. Naresh review workflow unowned~~ | ~~HIGH~~ | ~~COMPLIANCE~~ | ~~#3~~ | RESOLVED — reviewer picker + decision flow built |

---

## API SCHEMA SUMMARY

**~67 API routes** across src/app/api/

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
- Dr. Naresh review: BUILT — reviewer picker, request/approve/reject/needs_changes flow (VISION #3)
- AI self-scrutiny: NOT BUILT (VISION #10)
- Amendment handling: NOT BUILT (VISION #4)
- IRN response: NOT BUILT (VISION #12)

---

## WHO IS WORKING ON WHAT

| Agent | Domain | Status | Top Priority |
|---|---|---|---|
| SUTRADHAAR | Orchestration | Active | Agent doc accuracy sweep |
| SECURITY | Auth, Vault | Waiting | Build Secure Vault access logic (VISION #6) |
| DATABASE | Schema, Migrations | Done (V#1-3) | Tenant isolation schema (VISION #9) |
| COMPLIANCE | NHPD Rules | V#3 built | Server-side claim validation |
| API | ~67 Routes, LNHPD Sync | V#8 built | Rate limiting middleware |
| FEATURE | UI, Pipeline, Wizard | V#1-2 built | Amendment UI (VISION #4) |
| TESTING | 136 Tests | GREEN | Add #pipeline, #review tags |
| DOCUMENTS | 13 Templates, PDF/CSV/Excel | Waiting | AI self-scrutiny (VISION #10) |
