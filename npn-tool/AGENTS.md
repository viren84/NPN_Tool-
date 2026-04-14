<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# AGENTS.md — Routing, Caching & Orchestration Rules

## The 8-Agent Roster

| # | Agent | Domain | File | Trigger Keywords |
|---|---|---|---|---|
| 1 | **SUTRADHAAR** | Orchestration, routing, vision | agents/sutradhaar.md | "what should we build", "vision", "priority", "impact", "which agent" |
| 2 | **SECURITY** | Auth, sessions, audit, Vault | agents/security.md | "auth", "login", "session", "permission", "vault", "audit log", "role" |
| 3 | **DATABASE** | Prisma schema, migrations | agents/database.md | "schema", "model", "migration", "prisma", "field", "relation", "database" |
| 4 | **COMPLIANCE** | NHPD rules, Dr. Naresh | agents/compliance.md | "compliance", "NHPD", "class I/II/III", "claim", "monograph", "Dr. Naresh", "regulatory" |
| 5 | **API** | 53 routes, LNHPD sync | agents/api.md | "route", "endpoint", "API", "LNHPD", "sync", "upload", "fetch" |
| 6 | **FEATURE** | UI, 7-tab builder | agents/feature.md | "UI", "page", "component", "tab", "builder", "search", "view", "form" |
| 7 | **TESTING** | 110+ tests, slash commands | agents/testing.md | "test", "coverage", "green", "red", "tag", "TEST_JOURNEYS" |
| 8 | **DOCUMENTS** | 11 templates, EN/FR, exports | agents/documents.md | "template", "generate", "export", "PDF", "CSV", "Excel", "bilingual", "EN/FR" |

## Routing Rules

When a topic comes in, route to the agent whose trigger keywords match:
- If multiple agents match → SUTRADHAAR decides the primary owner and lists impacted agents
- If no agent matches → SUTRADHAAR handles it or creates a new agent
- Domain questions go to the domain owner, not Sutradhaar
- Sutradhaar only answers structural/routing/vision questions

## Cross-Agent Impact Protocol

When any agent makes a change, it must:
1. Update its own OUTBOUND IMPACT MAP section
2. Write a note in each affected agent's INBOUND IMPACT LOG
3. Format: `[AGENT_NAME → target]: "description of what changed and what target must do"`

## Master Update Cadence

After every significant change (new feature, bug fix, schema change):
1. Sutradhaar generates a master update prompt via `/master-update`
2. The prompt is pasted into each agent's context
3. Each agent re-reads its domain, updates its improvement queue, and reports back

## Caching Rules

Each agent memoizes:
- Its own domain file (agents/<name>.md) — re-read on every activation
- CLAUDE.md — re-read on every activation
- AGENTS.md — re-read on every activation

Each agent re-reads from disk (no cache):
- prisma/schema.prisma (always current)
- docs/TEST_JOURNEYS.md (always current)
- Source files in its domain (always read fresh)

## Startup Reading Order

When any agent activates, it reads in this order:
1. CLAUDE.md
2. AGENTS.md
3. Its own agents/<name>.md file
4. Domain-specific files as needed

When SUTRADHAAR activates, full reading order:
1. CLAUDE.md
2. AGENTS.md
3. /agents/ folder — all 8 files
4. docs/ARCHITECTURE.md
5. docs/REQUIREMENTS.md
6. docs/VISION.md
7. prisma/schema.prisma
8. docs/TEST_JOURNEYS.md
9. docs/CHANGELOG.md — last 10 entries only

## Impact Scoring Dimensions

Every feature is scored before building:
1. 🔴 Security risk (HIGH / MEDIUM / LOW)
2. 🔴 Database impact (migration required? Y/N)
3. 🔴 API surface change (new routes? breaking changes?)
4. 🔴 NPN compliance impact (regulatory review needed?)
5. 🔴 Test coverage gap (which TEST_JOURNEYS tags affected?)

## Vision Priority Order (from VISION.md)

| # | Item | Status | Primary Agent | Blocked By |
|---|---|---|---|---|
| 1 | Product Pipeline | Not started | FEATURE + DATABASE | DATABASE schema needed first |
| 2 | 15-stage lifecycle statuses | Not started | DATABASE + FEATURE | #1 must exist first |
| 3 | Dr. Naresh review workflow | Not started | COMPLIANCE | DATABASE fields needed |
| 4 | Amendment lifecycle | Not started | COMPLIANCE + API | #1 and #2 recommended first |
| 5 | Monthly NHPID monograph sync | Not started | API + DATABASE | Monograph models incomplete |
| 6 | Secure Vault | Not started | SECURITY + DATABASE | Schema finalization needed |
| 7 | Enhanced audit + Aman review | Not started | SECURITY + FEATURE | #6 recommended first |
| 8 | Tool 2 read-only API | Not started | API | Core flows stable first |
| 9 | Multi-company consultant mode | Not started | DATABASE + API + FEATURE | Tenant isolation schema |
| 10 | AI self-scrutiny | Not started | DOCUMENTS + COMPLIANCE | Templates stable first |
| 11 | COA parsing (Claude Vision) | Not started | DOCUMENTS | — |
| 12 | IRN response workflow | Not started | COMPLIANCE + DOCUMENTS | — |
| 13 | Onboarding checklist | Not started | FEATURE | — |
