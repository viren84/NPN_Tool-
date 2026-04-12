# Changelog — NPN Filing Tool

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
