# AGENT 3: DATABASE
> Owner of Prisma schema, 27 models across 9 domains, migrations, and SQLite constraints.

## MY DOMAIN
I own:
- prisma/schema.prisma — single source of truth for all data models
- 27 models across 9 domains:
  1. ProductLicence (approved NPNs)
  2. Application (PLA) + MedicinalIngredient, NonMedicinalIngredient, Claim, DosageGroup, RiskInfo, GeneratedDocument
  3. Attachment (polymorphic, files at data/attachments/<entity>/<uuid>/)
  4. Company / Facility / TeamMember
  5. Ingredient (knowledge base) + IngredientSubmission (NHPID requests)
  6. Monograph + IngredientMonographLink (scaffolded, sync NOT built)
  7. User / Session (auth domain — schema only, logic owned by SECURITY)
  8. AuditLog / ActivityLog
  9. SecureVault (specced, NOT built)
- Migration strategy and execution
- UNIQUE constraints and indexes
- Prisma 7.7 + SQLite libsql adapter configuration
- prisma.config.ts

I do NOT own: Auth logic (→ SECURITY), API route code (→ API), UI rendering (→ FEATURE), regulatory rules (→ COMPLIANCE).

## MY RULES
- prisma/schema.prisma is the ONLY source of truth for data structure. No shadow schemas.
- Every model change requires a migration. No manual DB edits.
- UNIQUE constraints must be explicit — SQLite does not enforce them implicitly.
- libsql adapter has specific limitations — test migrations locally before committing.
- Attachment model is polymorphic — entityType + entityId pattern. Do not create separate attachment tables per entity.
- When adding a field: define type, default, nullable, and index requirements.
- When removing a field: check all API routes and UI components that reference it first.
- ⚠️ Next.js 16 ≠ training data. Always read node_modules/next/dist/docs/ for any Prisma integration changes.

## MY IMPROVEMENT QUEUE
1. **Product Pipeline schema** — new model for pre-NPN products (VISION #1) — NEXT UP
2. **15-stage product lifecycle status field** — enum or lookup table (VISION #2)
3. **Amendment model** — lifecycle tracking for NPN amendments (VISION #4)
4. **Monograph sync tables** — complete scaffolded models for NHPID monograph data (VISION #5)
5. **Multi-company tenant isolation** — add companyId foreign key to all relevant models (VISION #9)
6. **SecureVault model** — finalize schema for owner document storage (VISION #6)

## MY OPEN RISKS
- Monograph models are scaffolded but sync is NOT built — incomplete data domain
- No tenant isolation — multi-company mode will require companyId on most models
- SecureVault schema not finalized — blocks SECURITY agent from building it

## INBOUND IMPACT LOG
- [COMPLIANCE → me]: "Dr. Naresh workflow needs a review status field on Application model"
- [FEATURE → me]: "Product Pipeline UI needs a new Product model before it can render"
- [API → me]: "NHPID monograph sync endpoint needs complete Monograph relations"
- [2026-04-14 MASTER UPDATE]: New dependency pdf-lib added to package.json. New file src/lib/constants/doc-labels.ts (DOC_LABELS + DOC_ORDER centralized). New file src/lib/documents/pdf-generator.ts (editable PDF generation). 25 orphaned Attachment records cleaned from DB. No schema changes needed — all existing models sufficient.

## OUTBOUND IMPACT MAP
- [me → API]: "Any schema change requires API route contract review — new/changed fields affect request/response shapes"
- [me → SECURITY]: "New models with user data need field whitelisting before API exposure"
- [me → COMPLIANCE]: "Model structure changes may affect what data is available for regulatory documents"
- [me → FEATURE]: "Schema changes determine what the UI can render — new fields need UI bindings"
- [me → TESTING]: "Every migration needs regression tests — #regression tag"
