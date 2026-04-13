# NPN Filing Tool -- Architecture

> Last updated: 2026-04-12

---

## 1. System Overview

The NPN Filing Tool is a desktop regulatory platform built for UV International Traders Inc (dba Wellnessextract, Company Code 45028) to manage Natural Product Number (NPN) licences and Product Licence Applications (PLAs) for Health Canada. It imports existing licence PDFs via AI-powered extraction, enriches product data from the LNHPD public API, supports drafting new applications with AI-generated documents, and provides export capabilities for CSV, Excel, and JSON packages. The tool runs as an Electron desktop app backed by a local SQLite database, ensuring all company and regulatory data stays on-premise.

### Tech Stack

| Layer          | Technology                                                  |
|----------------|-------------------------------------------------------------|
| Framework      | Next.js 16.2 (App Router)                                  |
| UI             | React 19.2, TypeScript 5, Tailwind CSS 4                   |
| ORM / Database | Prisma 7.7 (with libsql adapter), SQLite                   |
| Desktop Shell  | Electron 41                                                 |
| AI             | Anthropic Claude API (`claude-sonnet-4-6` via `@anthropic-ai/sdk`) |
| Gov API        | Health Canada LNHPD REST API                                |
| PDF Parsing    | pdf-parse 2.x                                               |
| Spreadsheets   | SheetJS (xlsx 0.18)                                         |
| Templating     | Handlebars 4.x (document generation)                        |
| Auth           | bcryptjs 3.x (password hashing)                             |

### Deployment Model

```
+---------------------------------------------+
|  Electron Desktop App (Windows / NSIS)       |
|  +----------------------------------------+  |
|  |  Next.js Dev Server (127.0.0.1:3000)   |  |
|  |  App Router + API Routes               |  |
|  +------------------+---------------------+  |
|                     |                        |
|  +------------------v---------------------+  |
|  |  SQLite (prisma/dev.db)                |  |
|  +----------------------------------------+  |
|  |  Local Filesystem (data/attachments/)  |  |
|  +----------------------------------------+  |
+---------------------------------------------+
        |                          |
        v                          v
  Health Canada              Anthropic Claude
  LNHPD API                 API (AI extraction
  (read-only)               + doc generation)
```

- All data stored locally -- no cloud database, no cloud file storage.
- Next.js runs on `127.0.0.1:3000`, bound to localhost only.
- Electron wraps the web app in a native window via `electron:dev` / `electron:build` scripts.
- Build target: Windows NSIS installer (`com.wellnessextract.npn-tool`).

### Deployment & Installation

| Step | Detail |
|------|--------|
| Installer | Electron-builder → Windows NSIS installer |
| First run | Prisma auto-creates SQLite database (`prisma/dev.db`) |
| First user | First registration becomes admin (no invite required) |
| API key | Claude API key configured in Settings page after first login |
| Dependencies | None external — no cloud database, no Docker, no external services |
| Data location | `prisma/dev.db` (database) + `data/attachments/` (files) — both local |
| Update | Replace installer files → Prisma migrates schema automatically on next start |

---

## 2. Data Flow Diagrams

### 2.1 PDF Import --> Active Licence

```
  User uploads PDF(s) (drag-and-drop or file picker)
       |
       v
  POST /api/upload/process
       |
       +---> pdf-parse extracts raw text
       |
       +---> Claude AI analyzes text
       |     (system prompt: extract NPN, product name,
       |      ingredients, company, dates, etc.)
       |
       v
  Preview Screen (JSON result displayed)
       |
       v
  User confirms import
       |
       +---> Create ProductLicence record
       |
       +---> Save PDF to data/attachments/licence/<uuid>/
       |
       +---> Create Attachment record(s) (IL + PL PDFs)
       |
       +---> Fire-and-forget: auto-enrich from LNHPD
       |           |
       |           +---> syncSingleLicence(id)
       |           |     (fetch 6 HC endpoints)
       |           |
       |           +---> Update ProductLicence JSON fields
       |                 (ingredients, claims, risks, doses, routes)
       v
  Licence appears in table with HC-verified data
```

### 2.2 LNHPD Sync Flow

```
  Trigger: Sync button (single) or Bulk Sync (all)
       |
       v
  POST /api/sync/lnhpd/:id        POST /api/sync/lnhpd (bulk)
       |                                  |
       v                                  v
  syncSingleLicence(id)           syncLNHPD() -- loops all licences
       |                                  |
       +----------------------------------+
       |
       v
  1. Search: GET productlicence/?id={NPN}
       |
       v
  2. Extract lnhpd_id from response
       |
       v
  3. Parallel fetch 6 detail endpoints:
     +-- medicinalingredient/?id={lnhpdId}
     +-- nonmedicinalingredient/?id={lnhpdId}
     +-- productpurpose/?id={lnhpdId}
     +-- productrisk/?id={lnhpdId}
     +-- productdose/?id={lnhpdId}
     +-- productroute/?id={lnhpdId}
       |
       v
  4. normalize() -- handle mixed response formats
     (flat array vs. { metadata, data } wrapper)
       |
       v
  5. Check UNIQUE constraint on lnhpdId
     (prevent duplicate records for same NPN)
       |
       v
  6. Update ProductLicence:
     - JSON fields (ingredients, claims, risks, doses, routes)
     - Derived fields (routeOfAdmin, applicationClass)
     - Status fields (productStatus, attestedMonograph)
     - Dates (licenceDate, revisedDate, receiptDate)
       |
       v
  7. Return success/error --> UI refreshes detail panel
       |
  (Bulk only: 300ms delay between products for rate limiting)
```

### 2.3 Application Lifecycle Flow

```
  New Application (POST /api/applications)
       |
       v
  Tabbed Editor (7 tabs):
  +-------+-------+--------+--------+--------+-------+---------+
  | Basic | Ingr. | Claims | Dosage | Risk   | Docs  | Export  |
  | Info  | (MI + |        | Groups | Info   |       |         |
  |       |  NMI) |        |        |        |       |         |
  +-------+-------+--------+--------+--------+-------+---------+
       |
       v
  Add child records via sub-APIs:
    /api/applications/:id/ingredients     (MedicinalIngredient)
    /api/applications/:id/non-med-ingredients (NonMedicinalIngredient)
    /api/applications/:id/claims          (Claim)
    /api/applications/:id/dosage          (DosageGroup)
    /api/applications/:id/risk            (RiskInfo)
       |
       v
  AI Generate Documents (POST /api/applications/:id/generate)
    --> 11 document types via Claude + Handlebars templates
    --> Stored as GeneratedDocument records
       |
       v
  Review & Approve each document
    --> approvedById, approvedAt fields
       |
       v
  Export Package (GET /api/applications/:id/export)
    --> JSON package of full application data
       |
       v
  [Future] Submit to Dr. Naresh for compliance review
  [Future] HC Submission via e-post or portal
```

### 2.4 Export Flow

```
  Single Licence CSV:
    GET /api/licences/:id/export?format=csv
    --> 55 columns, one row per licence
    --> Flattens JSON fields (ingredients, claims, etc.)

  Bulk Licence CSV:
    GET /api/licences/export?ids=id1,id2,...
    --> Same 55-column format, multiple rows

  Excel Export (Amazon-style):
    GET /api/licences/export-excel
    --> 3-sheet XLSX via SheetJS:
       Sheet 1: Product summary
       Sheet 2: Ingredients detail
       Sheet 3: Claims + risks

  Application Export:
    GET /api/applications/:id/export
    --> Full JSON package (application + all child records)
```

### 2.5 Auth Flow

```
  POST /api/auth/login
    |
    +---> Lookup User by username
    +---> bcrypt.compare(password, hash)  [12 rounds]
    |
    v
  Set httpOnly cookie: npn_session = userId
  (maxAge: 30 days, sameSite: lax, secure: false)
    |
    v
  Every API request:
    getSession() --> reads npn_session cookie
                 --> looks up User in DB
                 --> returns { id, username, name, role, email }
    |
    +---> requireAuth()  -- returns user or 401
    +---> requireEditor() -- requireAuth() + deny "viewer" role (403)
    +---> requireAdmin()  -- requireAuth() + require "admin" role (403)
    |
    v
  POST /api/auth/logout
    --> clearSession() --> delete cookie
    --> Redirect to /login
```

---

## 3. State Management

```
+---------------------------------------------------+
|  No global state library (no Redux, Zustand, etc.) |
+---------------------------------------------------+
     |
     +---> Page-level state: React useState / useEffect
     |     (each page fetches its own data on mount)
     |
     +---> Server state: fetch() to /api/ routes
     |     (no SWR, no React Query, no client cache)
     |
     +---> Session: httpOnly cookie (npn_session)
     |     (server-side lookup on every API request)
     |
     +---> Implication: page navigation = fresh fetch
           (always current, no stale cache bugs)
```

- Each page component manages its own state via `useState` + `useEffect`.
- All data fetched via `fetch()` to API routes — no caching layer.
- Session is server-validated on every request (no client-side token).
- Trade-off: no stale data, but every navigation triggers a network request.
- Future: if performance becomes an issue, add SWR or React Query for client caching.

---

## 4. Directory Structure

```
npn-tool/
  main/
    electron.js               # Electron main process
  prisma/
    schema.prisma             # 27 models across 9 domains
    dev.db                    # SQLite database (gitignored)
  src/
    app/                      # Next.js App Router (pages + API)
      layout.tsx              # Root layout
      page.tsx                # Landing / redirect
      globals.css             # Tailwind CSS 4 imports
      login/                  # Login page
      dashboard/              # Stats + activity feed
      licences/
        page.tsx              # Main page -- import, table, detail panel
      applications/           # List + [id] tabbed editor
      company/                # 3 tabs: info, facilities, team
      ingredients/            # Ingredient Knowledge Base
      ingredient-submissions/ # New ingredient requests to NHPID
      products/               # Product views
      settings/               # API key config, export path
      api/
        auth/                 # login, register, logout, me
        applications/         # CRUD + 9 sub-routes:
          [id]/
            ingredients/      #   MedicinalIngredient CRUD
            non-med-ingredients/ # NonMedicinalIngredient CRUD
            claims/           #   Claim CRUD
            dosage/           #   DosageGroup CRUD
            risk/             #   RiskInfo CRUD
            documents/        #   GeneratedDocument list/manage
            generate/         #   AI document generation
            export/           #   Application package export
            research/         #   AI ingredient research
            route.ts          #   Application CRUD
          route.ts            # List + create
        licences/             # CRUD + sub-routes:
          [id]/
            export/           #   Single licence CSV
            route.ts          #   GET / PUT / DELETE
          bulk-delete/        #   Bulk delete
          export/             #   Bulk CSV
          export-excel/       #   3-sheet XLSX
          route.ts            # List + create
        attachments/          # Upload, download, view, delete
        upload/
          process/            # Single PDF extraction (Claude)
          batch/              # Multi-PDF batch import
          scan-folder/        # Scan directory for PDFs
        sync/
          lnhpd/              # Bulk + per-product LNHPD sync
        ingredients/          # Knowledge Base CRUD + import/export
        ingredient-submissions/ # NHPID submission management
        search/               # Global search
        activity/             # Activity logging endpoints
        audit-reports/        # Audit report generation
        company/              # CompanyProfile CRUD
        facilities/           # Facility CRUD
        team/                 # TeamMember CRUD
        settings/             # AppSettings CRUD
        faq/                  # FAQ cache (Claude-powered)
        files/                # File serving
    lib/
      ai/
        claude.ts             # Anthropic client (singleton, askClaude())
        document-reader.ts    # PDF text extraction via pdf-parse
        ingredient-research.ts # AI-powered ingredient lookup
      auth/
        session.ts            # Cookie-based session (get/set/clear)
        password.ts           # bcrypt hash/compare (12 rounds)
        guard.ts              # requireAuth, requireEditor, requireAdmin
      db/
        prisma.ts             # Prisma client singleton
        audit.ts              # AuditLog helpers
      documents/
        cover-letter.ts       # Cover letter template
        label-generator.ts    # Product label generation
        pdf-reader.ts         # PDF file reader utilities
        safety-efficacy.ts    # Safety & efficacy document generation
      lnhpd/
        client.ts             # HC LNHPD API client (7 endpoint wrappers)
      sync/
        lnhpd-sync.ts         # Bulk + single licence sync logic
      tracking/
        activity.ts           # ActivityLog helpers
      utils/
        sanitize.ts           # HTML/input sanitization
        whitelist.ts          # Field whitelist for PUT routes
    generated/
      prisma/                 # Generated Prisma client (gitignored)
  data/
    attachments/              # Uploaded files organized by entity
      licence/<uuid>/         #   PDFs per licence
      application/<uuid>/     #   Docs per application
  docs/
    ARCHITECTURE.md           # This file
    CHANGELOG.md              # Session-by-session changes
    REQUIREMENTS.md           # Feature inventory
    SECURITY_CHECKLIST.md     # Security audit checklist
    VISION.md                 # Product vision & lifecycle
  public/                     # Static assets
  package.json                # Dependencies + Electron build config
  tsconfig.json               # TypeScript config
  next.config.ts              # Next.js config
```

---

## 5. Database Architecture

### 4.1 Overview

- **27 models** defined in `prisma/schema.prisma`
- **SQLite** database stored at `prisma/dev.db` (gitignored)
- **Prisma 7.7** ORM with libsql adapter
- All IDs are UUIDs (`@default(uuid())`)
- JSON fields stored as `String` with `@default("[]")` or `@default("{}")`
- Timestamps: `createdAt` + `updatedAt` on all models

### 4.2 Domain Organization

```
+---------------------+------------------------------------------+
| Domain              | Models                                   |
+---------------------+------------------------------------------+
| Auth                | User                                     |
| Company             | CompanyProfile, Facility, TeamMember     |
| Knowledge Base      | Ingredient, Monograph,                   |
|                     | IngredientMonographLink                  |
| Licences (Active)   | ProductLicence, LicenceAmendment         |
| Applications (PLA)  | Application, MedicinalIngredient,        |
|                     | NonMedicinalIngredient, Claim,           |
|                     | DosageGroup, RiskInfo                    |
| Submissions         | IngredientSubmission, ProductStrategy    |
| Documents           | GeneratedDocument, SupplierCOA,          |
|                     | Attachment                               |
| Existing Products   | ExistingProduct                          |
| Precedents          | LNHPDPrecedent                           |
| Tracking            | AuditLog, ActivityLog, AuditReport       |
| System              | AppSettings, FaqCache                    |
+---------------------+------------------------------------------+
```

### 4.3 Key Relationships

```
User ---< AuditLog
User ---< ActivityLog
User ---< Attachment (uploadedBy)
User ---< Application (createdBy)
User ---< GeneratedDocument (approvedBy)
User ---< IngredientSubmission (createdBy)

Application ---< MedicinalIngredient ---< SupplierCOA
Application ---< NonMedicinalIngredient
Application ---< Claim
Application ---< DosageGroup
Application ---< RiskInfo
Application ---< GeneratedDocument
Application ---< SupplierCOA
Application ---< LNHPDPrecedent

ProductLicence ---< LicenceAmendment

Ingredient ---< IngredientMonographLink >--- Monograph

IngredientSubmission ---< ProductStrategy
```

All child-to-parent relations use `onDelete: Cascade`.

### 4.4 Unique Constraints

| Model                | Field(s)                         | Purpose                                |
|----------------------|----------------------------------|----------------------------------------|
| User                 | username                         | Login identity                         |
| ProductLicence       | lnhpdId                          | Prevent duplicate LNHPD sync           |
| ExistingProduct      | npnNumber                        | One record per NPN                     |
| Ingredient           | nhpidId                          | One record per NHPID ingredient        |
| Monograph            | nhpidId                          | One record per NHPID monograph         |
| FaqCache             | question                         | Deduplicate cached answers             |
| Attachment           | (entityType, entityId, fileName) | Prevent duplicate files per entity     |

### 4.5 JSON Field Patterns

ProductLicence and Ingredient models store denormalized data from external APIs as JSON strings. This avoids deep relational joins for read-heavy display pages while keeping the schema manageable.

```
ProductLicence:
  medicinalIngredientsJson  -- raw LNHPD MI array
  nonMedIngredientsJson     -- raw LNHPD NMI array
  claimsJson                -- raw LNHPD purposes
  risksJson                 -- raw LNHPD risks
  dosesJson                 -- raw LNHPD doses
  routesJson                -- raw LNHPD routes

Ingredient:
  synonyms, partsUsed, preparationTypes  -- string arrays
  regulatoryStatusJson   -- multi-jurisdiction object
  safetyDataJson         -- safety study summaries
  dosingDataJson         -- dose range records
  suppliersJson          -- supplier records
```

---

## 6. External Integrations

### 5.1 Health Canada LNHPD API

| Item         | Detail                                                            |
|--------------|-------------------------------------------------------------------|
| Base URL     | `https://health-products.canada.ca/api/natural-licences`          |
| Auth         | None (public API)                                                 |
| Rate Limit   | Self-imposed: 300ms between products in bulk sync                 |
| Caching      | `revalidate: 3600` on client.ts searches; `revalidate: 0` on sync|

**7 endpoints used:**

| Endpoint                 | Purpose                              | Response Format        |
|--------------------------|--------------------------------------|------------------------|
| `productlicence`         | Search / lookup by NPN               | Flat array             |
| `medicinalingredient`    | Medicinal ingredients for product    | Mixed (array or wrapped)|
| `nonmedicinalingredient` | Non-medicinal ingredients            | Mixed                  |
| `productpurpose`         | Health claims / indications          | Mixed                  |
| `productrisk`            | Cautions, warnings, contraindications| Mixed                  |
| `productdose`            | Dosage information                   | Mixed                  |
| `productroute`           | Route of administration              | Mixed                  |

**Response normalization:** The `normalize()` function in `lnhpd-sync.ts` handles both formats -- if the response is a flat array it is used directly; if it is an object with a `data` property, that property is extracted.

**Integration files:**
- `src/lib/lnhpd/client.ts` -- 7 typed wrapper functions for direct API calls
- `src/lib/sync/lnhpd-sync.ts` -- `syncLNHPD()` (bulk) and `syncSingleLicence()` (per-product)

### 5.2 Claude AI (Anthropic)

| Item         | Detail                                                  |
|--------------|---------------------------------------------------------|
| SDK          | `@anthropic-ai/sdk` v0.87                               |
| Model        | `claude-sonnet-4-6`                                     |
| Max Tokens   | Default 4096, configurable per call                     |
| Temperature  | Default 0.3 (low creativity for regulatory accuracy)    |
| API Key      | AppSettings.claudeApiKey (DB) or ANTHROPIC_API_KEY env  |

**Use cases:**
1. **PDF text extraction/analysis** -- Extract NPN, product name, ingredients, dates from licence PDFs
2. **Document generation** -- 11 document types (cover letters, safety/efficacy, labels, etc.)
3. **Ingredient research** -- Look up ingredient safety, dosing, regulatory status
4. **FAQ** -- Answer regulatory questions with cached responses

**Integration files:**
- `src/lib/ai/claude.ts` -- Singleton client, `askClaude()` helper
- `src/lib/ai/document-reader.ts` -- PDF text extraction pipeline
- `src/lib/ai/ingredient-research.ts` -- AI ingredient lookup
- `src/lib/documents/` -- Cover letter, label, safety/efficacy generators

### 5.3 NHPID (Future)

- Monthly monograph sync planned (not yet implemented)
- Schema ready: `Monograph` and `IngredientMonographLink` tables exist
- Will provide a local replica of NHPID monograph data for offline compliance checking
- `Ingredient.nhpidId` + `Monograph.nhpidId` fields are prepared for linking

---

## 7. Security Architecture

### 6.1 Authentication

```
Password Storage:  bcryptjs, 12 salt rounds
Session:           httpOnly cookie ("npn_session" = userId)
                   sameSite: lax, secure: false (localhost only)
                   maxAge: 30 days
Token Type:        No JWT -- server-side session lookup on every request
```

### 6.2 Authorization (Role-Based)

| Role   | Permissions                                          |
|--------|------------------------------------------------------|
| admin  | Full access: CRUD all entities, delete, user mgmt    |
| editor | Create, read, update -- no delete, no user mgmt      |
| viewer | Read-only access to all data                         |

**Guard functions** (`src/lib/auth/guard.ts`):

| Guard            | Returns                   | HTTP Error |
|------------------|---------------------------|------------|
| `requireAuth()`  | UserSession or 401        | 401        |
| `requireEditor()`| UserSession or 401/403    | 403 for viewer |
| `requireAdmin()` | UserSession or 401/403    | 403 for non-admin |

### 6.3 Input Protection

- **Field whitelisting:** PUT routes use `whitelist.ts` to strip unknown fields before passing to Prisma
- **HTML sanitization:** `sanitize.ts` strips dangerous HTML from user-provided text
- **SQL injection:** Prisma parameterized queries throughout (no raw SQL)

### 6.4 Audit Trail

- **AuditLog:** Records data mutations (create, update, delete) with before/after `changes` JSON
- **ActivityLog:** Records user interactions (view, click, download, search, login, logout, export) with page path and entity context
- **AuditReport:** Generated summaries (monthly/weekly) with per-user breakdowns

### 6.5 File Security

- All uploads stored locally at `data/attachments/` (gitignored)
- No cloud upload -- files never leave the machine
- Attachments linked to entities via `Attachment` model (entityType + entityId)
- Unique constraint prevents duplicate file names per entity

### 6.6 Secrets Management

- Claude API key stored in `AppSettings` table (local SQLite)
- API key masked in GET /api/settings response (only first/last 4 chars shown)
- No secrets in environment variables in production (all in local DB)

---

## 8. Error Handling and Known Limitations

### 8.1 LNHPD API

| Scenario                    | Behavior                                               |
|-----------------------------|--------------------------------------------------------|
| API down / 4xx / 5xx       | `fetchJson()` returns `[]` with `console.warn`         |
| Product not found in LNHPD | Sync reports "Not found", skips -- licence kept as-is  |
| Duplicate lnhpdId          | `syncSingleLicence` checks UNIQUE, returns clear error |
| Bulk sync rate              | 300ms delay between products (self-imposed)            |

### 8.2 AI / Claude

| Scenario                    | Behavior                                               |
|-----------------------------|--------------------------------------------------------|
| API key missing             | `getClaudeClient()` throws, import fails with message  |
| API quota exceeded          | Anthropic SDK throws, caught in route handler           |
| Auto-enrich after import    | Fire-and-forget (`.catch(() => {})`) -- never blocks import |
| Extraction accuracy         | No fallback -- if Claude misreads PDF, user edits manually |

### 8.3 General

| Scenario                    | Behavior                                               |
|-----------------------------|--------------------------------------------------------|
| Large batch import          | Sequential processing, one PDF at a time (rate safe)   |
| Offline mode                | Not explicitly handled -- LNHPD and Claude calls fail silently |
| Concurrent edits            | No optimistic locking -- last write wins               |
| Database corruption         | No automatic backup -- manual backup of dev.db required|
| File path issues            | Windows paths used throughout (backslash concerns in some contexts) |

### 8.4 Backup & Recovery

| Method | Procedure | Scope |
|--------|-----------|-------|
| **Full backup** | Copy `prisma/dev.db` + `data/attachments/` directory | All data + files |
| **DB-only backup** | Copy `prisma/dev.db` | Schema + all records (no files) |
| **Export backup** | CSV/Excel export from /licences, /ingredients | Licence + ingredient data |
| **Restore** | Replace `dev.db` with backup copy, restart app | Full restore |
| **Schema migration** | Prisma migrate runs automatically on app start | Safe schema updates |

- **No automatic backup** -- manual copy required (future: scheduled backup job)
- **Recovery procedure**: Stop app → replace `prisma/dev.db` with backup → restart
- **Attachment recovery**: Copy backup `data/attachments/` to same path → files re-linked
- **Export-based recovery**: CSV export → delete DB → re-import (partial -- licences only, not applications)
- **Important**: `dev.db` is gitignored; backup copies should be stored separately

---

## 9. Future Architecture Considerations

### 9.1 Planned Features

| Feature                         | Impact on Architecture                                     |
|---------------------------------|------------------------------------------------------------|
| Dr. Naresh review workflow      | New `compliance` role, submission queue table, change tracking, approval chain |
| Secure Vault                    | Owner-only documents, per-person sharing ACL, access logging on file reads |
| Multi-company support           | Company switcher, data isolation (companyId FK on all entities), tenant context |
| NHPID monthly sync              | Scheduled job, monograph local replica, bulk upsert into Monograph table |
| Tool 2 API                      | Read-only REST endpoints for production/marketing/sales systems, API key auth |
| Notification system             | Status change events, review completion alerts, HC response tracking |

### 9.2 Scaling Notes

- SQLite is sufficient for single-company desktop use (100s of licences, 10s of applications).
- If multi-company or server deployment is needed, migrate to PostgreSQL (Prisma makes this a config change).
- If concurrent users increase beyond a small team, add optimistic locking (version column + conflict detection).
- Consider background job queue (e.g., BullMQ) if batch operations grow beyond the current sequential model.

---

## Appendix: API Route Map

A summary of all REST API endpoints and their primary guard level.

```
Auth
  POST   /api/auth/login              -- public
  POST   /api/auth/register           -- public (or admin-only in production)
  POST   /api/auth/logout             -- requireAuth
  GET    /api/auth/me                 -- requireAuth

Licences
  GET    /api/licences                -- requireAuth
  POST   /api/licences                -- requireEditor
  GET    /api/licences/:id            -- requireAuth
  PUT    /api/licences/:id            -- requireEditor
  DELETE /api/licences/:id            -- requireAdmin
  POST   /api/licences/bulk-delete    -- requireAdmin
  GET    /api/licences/:id/export     -- requireAuth
  GET    /api/licences/export         -- requireAuth
  GET    /api/licences/export-excel   -- requireAuth

Applications
  GET    /api/applications            -- requireAuth
  POST   /api/applications            -- requireEditor
  GET    /api/applications/:id        -- requireAuth
  PUT    /api/applications/:id        -- requireEditor
  DELETE /api/applications/:id        -- requireAdmin
  *      /api/applications/:id/ingredients         -- requireEditor (CRUD)
  *      /api/applications/:id/non-med-ingredients -- requireEditor (CRUD)
  *      /api/applications/:id/claims              -- requireEditor (CRUD)
  *      /api/applications/:id/dosage              -- requireEditor (CRUD)
  *      /api/applications/:id/risk                -- requireEditor (CRUD)
  GET    /api/applications/:id/documents           -- requireAuth
  POST   /api/applications/:id/generate            -- requireEditor
  GET    /api/applications/:id/export              -- requireAuth
  POST   /api/applications/:id/research            -- requireEditor

Upload / Import
  POST   /api/upload/process          -- requireEditor
  POST   /api/upload/batch            -- requireEditor
  POST   /api/upload/scan-folder      -- requireEditor

Attachments
  GET    /api/attachments             -- requireAuth
  POST   /api/attachments             -- requireEditor
  DELETE /api/attachments             -- requireAdmin

Sync
  POST   /api/sync/lnhpd             -- requireEditor (bulk)
  POST   /api/sync/lnhpd/:id         -- requireEditor (single)

Knowledge Base
  *      /api/ingredients             -- requireAuth (GET), requireEditor (POST/PUT/DELETE)
  *      /api/ingredient-submissions  -- requireEditor

Company
  *      /api/company                 -- requireAuth (GET), requireEditor (PUT)
  *      /api/facilities              -- requireAuth (GET), requireEditor (CRUD)
  *      /api/team                    -- requireAuth (GET), requireEditor (CRUD)

System
  *      /api/settings                -- requireAdmin
  *      /api/search                  -- requireAuth
  *      /api/activity                -- requireAuth
  *      /api/audit-reports           -- requireAdmin
  *      /api/faq                     -- requireAuth
  *      /api/files                   -- requireAuth
```
