# Changelog — NPN Filing Tool

## 2026-04-12 — Documentation: Architecture, Test Journeys, Vision Update

### Added
- **docs/ARCHITECTURE.md** — Full system architecture (30KB): tech stack, deployment model, 5 data flow diagrams, state management, directory structure, 27-model DB architecture, LNHPD/Claude/NHPID integration details, security model, backup & recovery, API route map
- **docs/TEST_JOURNEYS.md** — Command-based test system: 110+ `@command:name #tag` test commands, 16 tags (#import, #sync, #security, #edge, #performance, #data-flow, #regression, #electron, #backup, #api, etc.). Run one / run tag / run all. Covers every page, every button, cross-system regression, error recovery, edge cases, performance, security, Electron, backup
- **.gitignore** — Added `/data/attachments/` (user data) and `cookie.txt` (temp)

### Changed
- **docs/VISION.md** — Refreshed "What's Built" with LNHPD sync, auto-enrich, smart import, NPN consolidation, info grid, global search, Excel export. Updated "Next Priorities" to 12 items (removed completed: responsive UI, global search)
- **docs/REQUIREMENTS.md** — Marked completed: LNHPD sync, global search, multi-file consolidation, info grid enrichment, cross-entity dedup. Added 8 new pending features: Product Pipeline, Dr. Naresh workflow, Secure Vault, amendments, Tool 2 API, multi-company, AI self-scrutiny
- **docs/ARCHITECTURE.md** — Added: Deployment & Installation table, State Management section with diagram, Backup & Recovery section. Renumbered sections 3→9

### Files Modified
- `docs/ARCHITECTURE.md`, `docs/TEST_JOURNEYS.md` (NEW), `docs/VISION.md`, `docs/REQUIREMENTS.md`, `docs/CHANGELOG.md`, `.gitignore`

---

## 2026-04-12 — Info Grid Redesign: Fill Missing Fields from LNHPD

### Fixed
- **Route always empty** — sync now fetches `/productroute/` endpoint (6th endpoint). All products now show "Oral" etc.
- **Class always empty** — derived from submission type during sync (Compendial→I, Traditional→II, Non-traditional→III)
- **Revised Date always empty** — sync now saves `revised_date` from LNHPD productlicence response
- **Receipt Date never shown** — sync now saves `time_receipt` (date HC received the application)
- **Company Code empty** — sync now saves `company_id` from LNHPD

### Added
- **One-line dosage summary** — top of info grid shows "Capsule, soft • Oral • 1 capsule • 1x/Day(s) • Adults (19+)"
- **Status badge with dot** — active/inactive status in grid with green/red indicator
- **LNHPD link** — "View on HC" link opens the product on Health Canada's website
- **Receipt Date field** — new field in dates row

### Changed
- Info grid reorganized: Row 1 = summary, Row 2 = form/route/class/type, Row 3 = dates + status, Row 4 = company + HC link
- Bulk sync (`syncLNHPD`) now also fetches routes and saves all new fields (parity with single sync)

### Files Modified
- `src/lib/sync/lnhpd-sync.ts` — both `syncLNHPD()` and `syncSingleLicence()` now fetch routes, save revisedDate/receiptDate/applicationClass/routeOfAdmin/companyCode/routesJson
- `src/app/licences/page.tsx` — Licence interface updated, info grid redesigned with 4 rows
- `docs/CHANGELOG.md` — this entry

---

## 2026-04-12 — Import Fix: Multi-File Same-NPN Consolidation + Attachment Dedup

### Fixed
- **2 PDFs for same NPN creating 2 products** — `processMultiplePdfs()` now consolidates PreviewItems by NPN before showing preview. 2 files with same NPN → 1 preview item with "2 files" → 1 ProductLicence with 2 attachments
- **Same-batch duplicate guard** — `executeImport()` now tracks NPNs created in the current batch. If a second item with the same NPN somehow reaches the import loop, files are attached to the existing record instead of creating a duplicate

### Added
- **Cross-product attachment warning** — `POST /api/attachments` now checks if the same filename exists on a different entity. Returns `_crossEntityWarning` in response (non-blocking, informational)

### Files Modified
- `src/app/licences/page.tsx` — NPN consolidation in `processMultiplePdfs()`, batch guard in `executeImport()`
- `src/app/api/attachments/route.ts` — cross-entity duplicate warning
- `docs/CHANGELOG.md` — this entry

---

## 2026-04-12 — Sync Button Fix: Duplicate Guard + Error Feedback

### Fixed
- **Sync button silent failure** — root cause was `lnhpdId` UNIQUE constraint collision when duplicate NPN records existed. `syncSingleLicence()` now checks for existing owner before updating, returns clear error message
- **No user feedback on sync failure** — sync button now shows `alert()` with the error message instead of silently doing nothing
- **Duplicate EAnnatto record deleted** — second record (no lnhpdId) caused UNIQUE constraint collision on sync

### Changed
- `fetchJson()` now logs warnings on non-200 API responses instead of silently returning `[]`
- Sync error messages surface to the user via alert dialog

### Files Modified
- `src/lib/sync/lnhpd-sync.ts` — duplicate guard in `syncSingleLicence()`, `fetchJson()` warning logs
- `src/app/licences/page.tsx` — sync button error feedback (alert on failure)
- `docs/CHANGELOG.md` — this entry

---

## 2026-04-12 — Full LNHPD Integration: Auto-Sync, Per-Product Refresh, Non-Med Ingredients

### Added
- **Per-product LNHPD sync** — new `syncSingleLicence()` function fetches all data from Health Canada for a single NPN
- **Per-product sync API** — `POST /api/sync/lnhpd/:id` (editor+ role, not admin-only)
- **"Sync" button in detail panel** — purple button next to NPN badge, refreshes data from Health Canada on click
- **Auto-enrich on import** — every newly imported licence automatically syncs from LNHPD after creation
- **Non-medicinal ingredients section** — new section in detail panel showing gray tags for inactive ingredients
- **Non-medicinal ingredients in sync** — `syncLNHPD()` and `syncSingleLicence()` now fetch non-med ingredients from HC API

### Fixed
- **Empty detail panel sections** — root cause was JSON fields never populated from LNHPD; now auto-populated on import and manual sync
- **LNHPD field name mapping** — detail panel now handles HC API field names (`ingredient_name`, `quantity_unit_of_measure`, `risk_text`, `risk_type_desc`, `population_type_desc`, `purpose`)
- **Post-import sync auth** — old bulk sync required admin role (silently failed for editors); new per-product sync works for editors

### Changed
- Ingredient tags now show source material on hover (title tooltip)
- Claims section renamed "Approved Claims" to reflect HC-approved wording
- Dosage section now shows structured cards per population group
- Risk section now shows risk type labels (Cautions & Warnings, Contraindications)

### Files Modified
- `src/lib/sync/lnhpd-sync.ts` — added non-med fetch, `syncSingleLicence()` export
- `src/app/api/sync/lnhpd/[id]/route.ts` — NEW: per-product sync endpoint
- `src/app/licences/page.tsx` — non-med section, sync button, LNHPD field mapping, auto-enrich after import
- `docs/CHANGELOG.md` — this entry

---

## 2026-04-12 — Responsive Layout Fix + Upload Button Fix

### Fixed
- **Detail panel no longer overlays table** — changed from `position: fixed` to flex sibling with `sticky top-0`. Table columns now shrink naturally when panel opens, no hidden data
- **Upload button in detail panel now works** — extracted inline async handler to stable `handleDetailUpload()` function. Fixes stale closure bug where `sl.id` reference broke on re-render. Added try/catch for error handling
- **Panel independent scroll** — detail panel now scrolls independently with `overflow-y-auto` instead of being locked to viewport height

### Changed
- Main content uses `flex-1 min-w-0` instead of conditional `mr-[540px]` margin — proper flex shrink behavior
- Detail panel z-index reduced from `z-50` to `z-30` — still above content but below modals (`z-[60]`)

### Files Modified
- `src/app/licences/page.tsx` — layout fix (line 536), panel fix (line 680), `handleDetailUpload` function added, inline handler replaced
- `docs/CHANGELOG.md` — this entry

---

## 2026-04-12 — Import Confirmation Flow: Preview Before Import + Duplicate Options

### Added
- **Pre-import confirmation screen** — ALL import paths (Tab 1, 2, 3) now show a preview of found products before importing
- **Duplicate detection with user choice** — duplicates show per-item buttons: Replace / Skip / Attach
- **Batch duplicate actions** — "Replace All", "Skip All", "Attach All" buttons for bulk duplicate handling
- **Preview item cards** — color-coded cards: green (NEW), yellow (DUPLICATE), red (ERROR) with NPN, product name, file count
- **Import progress bar** — shows "Importing X of Y..." during the save phase
- **scan-folder preview mode** — API accepts `preview: true` to extract without writing to DB
- **Phase-based modal** — import modal transitions: Select -> Scanning -> Preview -> Importing -> Done
- **Back button** — return from preview to file selection without losing context

### Changed
- `processMultiplePdfs()` now extracts only — builds preview items instead of auto-saving
- `handleFolderUpload()` now extracts only — builds preview items instead of auto-saving
- `doScan()` now calls scan-folder API with `preview: true` — builds preview items
- New `executeImport()` function handles confirmed imports with Replace/Skip/Attach logic
- Tab 3 button text changed from "Scan & Import" to "Scan & Preview"
- Tabs hide during preview/importing/done phases

### Files Modified
- `src/app/licences/page.tsx` — PreviewItem type, importPhase state, refactored 3 extraction functions, executeImport, confirmation UI
- `src/app/api/upload/scan-folder/route.ts` — preview mode (extract without DB writes)
- `docs/CHANGELOG.md` — this entry

---

## 2026-04-12 — IL+PL Dual-PDF Fix: Consistent Attach, Dedup, Race Condition

### Fixed
- **Folder upload (Tab 2) now attaches to existing NPN** — was silently skipping with "Already exists"; now attaches IL+PL files to the existing licence (matches Tab 1 behavior)
- **Race condition eliminated** — attachment loop now uses licence ID directly from the create response instead of searching by NPN after creation
- **Duplicate attachment prevention** — `/api/attachments` POST now checks for existing attachment with same `entityType + entityId + fileName` before creating; returns existing record if duplicate
- **Database-level dedup constraint** — `@@unique([entityType, entityId, fileName])` added to Attachment model in Prisma schema; prevents duplicates even under concurrent requests
- **Removed error-prone post-loop** — old attachment loop searched by NPN after all licences were created (fragile); replaced with inline attachment during licence creation

### Files Modified
- `src/app/licences/page.tsx` — `handleFolderUpload()` attach-to-existing logic + inline attachment after create
- `src/app/api/attachments/route.ts` — duplicate check before file save
- `prisma/schema.prisma` — `@@unique([entityType, entityId, fileName])` on Attachment model
- `docs/CHANGELOG.md` — this entry

---

## 2026-04-12 — Table Overhaul: Multi-Select, Bulk Actions, Design Polish

### Added
- **Row checkboxes** — select individual licences or "Select All" with header checkbox
- **Bulk action toolbar** — appears when 1+ rows selected: "Delete Selected", "Export Selected CSV", "Deselect All"
- **Bulk delete confirmation modal** — shows count, progress bar, cancel option
- **Bulk delete API** — `POST /api/licences/bulk-delete` accepts `{ids: []}`, cleans up attachments + amendments
- **Filtered CSV export** — `?ids=id1,id2` param on export API for selected-only export
- **Status badge dots** — colored dot indicator (green/red/yellow/gray) before status text
- **Improved empty state** — document icon + styled import CTA button instead of plain text
- **Sticky table header** — stays visible when scrolling long lists
- **Select-all indeterminate state** — checkbox shows dash when partially selected

### Changed
- Table padding tightened (`px-3 py-2.5`) for denser, more professional look
- Per-row Delete button hides when any checkboxes are selected (bulk toolbar takes over)
- Selected rows highlighted with subtle red tint (`bg-red-50/50`)
- ColSpan updated from 7 to 8 to account for new checkbox column
- Selection clears automatically when search query changes

### Files Modified
- `src/app/licences/page.tsx` — checkboxes, bulk toolbar, confirmation modal, design polish
- `src/app/api/licences/bulk-delete/route.ts` — NEW: batch delete endpoint with cascade cleanup
- `src/app/api/licences/export/route.ts` — added `?ids=` filter for selected-only export
- `docs/CHANGELOG.md` — this entry

---

## 2026-04-12 — Multi-PDF Upload, Drag & Drop, Attachment Viewer

### Added
- **Multi-PDF file picker** — Ctrl+Click / Shift+Click to select multiple PDFs at once in Import modal
- **Drag-and-drop upload zone** — drop PDF files directly onto the upload area with visual hover feedback
- **File preview list before upload** — see all selected files with name, size, and individual remove (x) buttons
- **"Clear all" button** — reset file selection before uploading
- **Live upload progress** — "File 2 of 5 — filename.pdf" shown during processing
- **Live scan results** — each file shows success/skipped/error as it finishes (not just at the end)
- **View button on attachments** — opens PDF/images inline in a new browser tab without downloading
- **Multi-file attachment upload** — detail panel "+ Upload" now accepts multiple files at once with progress counter
- **Inline view API** — `GET /api/attachments/:id?inline=true` serves files with `Content-Disposition: inline`
- **Activity tracking** — view vs download distinguished in audit log

### Changed
- Import modal tab renamed from "Single PDF" to "Upload PDFs"
- Attachment action buttons restyled with borders for better visibility (View, Download, Remove)
- Scanning progress spinner hidden on Tab 1 (replaced by inline progress in drop zone)

### Files Modified
- `src/app/api/attachments/[id]/route.ts` — added `?inline=true` query param support
- `src/app/licences/page.tsx` — multi-file upload, drag-and-drop, file preview list, View button on attachments

---

## 2026-04-12 (Day 2 — final session)

### Added
- **Amazon-style 3-sheet Excel export** — Instructions, Data Definitions (55 fields), Data with colored headers
- **55-column CSV export** — separate columns for each ingredient, claim, risk, source file
- **View button** on source files — opens PDFs in browser (inline Content-Disposition)
- **File type color coding** — PDF green/blue, XML yellow, ZIP purple, DOCX indigo
- **Per-licence CSV export fixed** — was showing [object Object], now 55 columns with parsed data
- **Data validation dropdowns** in Excel export for enumerated fields

### Fixed
- **DELETE not refreshing UI** — stale closure bug. `setConfirmDel` was re-rendering before API call completed. Fixed by calling API first, then fetching fresh data directly.
- **Delete buttons invisible** — changed from `text-red-400` (invisible in dark mode) to `bg-red-50 border-red-200 text-red-700` (proper button with background)
- **All Remove/Delete buttons globally** — upgraded from faint text to `text-red-600 font-medium`
- **Application links** — now go to tabbed editor `/applications/[id]` instead of old `/documents` page
- **Class column empty** — auto-derived from submissionType (Compendial→I, Traditional→II, Non-traditional→III)
- **EAnnatto 50 duplicate** — removed
- **Empty "New Facility"** — cleaned up test data
- **Facility name truncated** — added `flex-1 min-w-0`
- **Team title column truncated** — added `min-w-[180px]`
- **Dashboard/Application rows** — added `cursor-pointer` for clickable feel
- **Info grid alignment** in licence detail panel — wrapped in gray card

### UI/UX Audit
- Conducted full UI/UX review of all 9 pages
- Identified and fixed 10 bugs across Licences, Applications, Dashboard, Company Profile
- Documented remaining known issue: Dark Reader browser extension causes "1 Issue" badge

## 2026-04-12 (Day 2 — continued)

### Added (late session)
- **Global Search** — real DB queries across licences, applications, ingredients, submissions. Debounced, keyboard navigation, grouped by type.
- **LNHPD Sync** — enriches all licences with claims, risks, doses from Health Canada API. Fixed response format handling (data wrapper vs flat array).
- **Single PDF import** — restored to import modal (was removed during rewrite)
- **Inline delete** — "Confirm/Cancel" buttons replace browser confirm dialog

### Fixed
- **Licence data quality** — went from 5/33 claims to 32/33 after LNHPD sync format fix
- **Import modal** — 3 tabs (Single PDF, Folder, Scan Path) in a proper modal
- **Duplicate prevention** — folder upload checks for existing NPN before creating
- **Company Profile** — 3 tabs: Company Info, Facilities (1 warehouse), Team (5 members)

### Documentation
- Created `docs/SECURITY_CHECKLIST.md` — 35 security checks
- Created `docs/REQUIREMENTS.md` — complete feature inventory
- Created `docs/CHANGELOG.md` — this file
- Added memory rules: never remove features, maintain docs

## 2026-04-12 (Day 2)

### Added
- **Company Profile: Facilities tab** — warehouse, 3PL, foreign sites with address, site licence, GMP, manager info
- **Company Profile: Team tab** — 5 pre-seeded team members with roles, badges (QAP, Senior Official, HC Contact)
- **Facility & TeamMember DB tables** — full schema for facilities and team management
- **Facilities API** — CRUD endpoints `/api/facilities`
- **Team API** — CRUD endpoints `/api/team`
- **Document Attachments** — upload files to any entity, download, delete, tracked
- **Activity Tracking** — every view, download, export, upload logged with user/IP/timestamp
- **Audit Reports** — monthly report generation with per-user breakdown (admin only)
- **Licence Export APIs** — single (JSON/CSV) + bulk export, all audit-logged
- **File listing API** — list PDFs in a folder for download
- **File download API** — serve files with tracking
- **Import Modal** — 3 tabs: Single PDF, Select Folder, Scan Local Path
- **Duplicate detection** — skip import if NPN already exists
- **Inline delete confirmation** — "Confirm/Cancel" buttons instead of browser dialog
- **Dashboard stats** — now shows Active Licences (from ProductLicence table), Ingredients KB, NHPID Submissions

### Fixed
- **PDF extraction** — subprocess approach for pdf-parse (worker issue in Next.js)
- **Recursive folder scan** — finds product folders at any depth
- **Security: role escalation** — registration no longer accepts client role field
- **Security: field injection** — all PUT routes use field whitelisting
- **Security: viewer role checks** — added to 8 routes that were missing them
- **Dark Reader hydration** — `suppressHydrationWarning` on html/body
- **Dev overlay** — `devIndicators: false` in next.config
- **Licences page UX** — collapsible upload, modal import, clean table layout
- **Detail panel** — fixed right slide-out with sticky header, scrollable content
- **Activity feed** — filtered spam entries ("0 imported")

### Changed
- **Licences page fully rewritten** — proper UX with modal import, no scroll mess
- **Company Profile** — expanded to 3 tabs (Company Info, Facilities, Team)
- **Dashboard** — 5 stat cards instead of 4, counts real data

## 2026-04-11 (Day 1)

### Built
- Project scaffolding (Next.js + TypeScript + Tailwind + Electron)
- Full database schema (22 tables, Prisma + SQLite)
- Authentication system (login, register, session, roles)
- Dashboard with stats and activity feed
- PLA Application wizard (tabbed editor, 7 tabs)
- AI ingredient research (Claude API)
- Ingredient management (add/edit/delete, NHPID search)
- Non-medicinal ingredients with dosage form presets
- Claims, dosage, risk editors
- Document generation (11 types including bilingual labels)
- Document review, edit, approve workflow
- Submission package assembly + export
- Company profile (pre-filled Wellnessextract data)
- Settings (API key, export path, NHPID refresh)
- Global search shell (Ctrl+K)
- Help panel with AI FAQ
- Sidebar navigation with logout
- LNHPD API client (7 endpoints)
- Ingredient Knowledge Base page
- NHPID Submissions page
- Active Licences page with folder import
- REST API for all entities
- Audit logging on all data changes
- 32 NPN licences imported from PDF folder scan
