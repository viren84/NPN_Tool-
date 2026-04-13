# Test Journeys -- NPN Filing Tool
# Command-Based Test System

> **Last updated:** 2026-04-12
> **Total commands:** 79 | **Total tags:** 16
>
> A comprehensive, command-based test plan. Each test has a short `@command` name and `#tags`.
> Run one test, run a tag group, or run ALL.

---

## Quick Reference

### How to Use This Document

**Three ways to use:**
1. **Run one test:** Find the `@command:name` → read Action → Expect → Cross-System Check
2. **Run a tag:** Search for `#tagname` → every command with that tag is part of the suite
3. **Run ALL:** `#all` = every `@` command in the document

**From a screenshot:**
1. Identify the page/section visible in the screenshot
2. Find that section below (sections ordered by route)
3. Run every journey listed under that section

**Priority key:**
- **P0** = Critical path. Blocks all usage if broken.
- **P1** = Important. Core feature that must work for production.
- **P2** = Nice-to-have. Polish and edge cases.

### Tag System

| Tag | Description | Count |
|-----|-------------|-------|
| `#auth` | Login, logout, registration, session, roles | 7 |
| `#import` | PDF upload, folder scan, batch, consolidation, duplicates | 14 |
| `#sync` | LNHPD single, bulk, auto-enrich, failure recovery | 8 |
| `#table` | Sorting, selection, bulk actions, search | 8 |
| `#detail` | Info grid, ingredients, claims, risks, doses, attachments | 10 |
| `#export` | CSV, Excel, JSON, application package | 6 |
| `#application` | PLA lifecycle: create, edit, ingredients, claims, generate | 14 |
| `#data-flow` | End-to-end pipelines (import→sync→display, create→generate→export) | 5 |
| `#ui` | Layout, responsive, scroll, modals, slide-outs, resize | 6 |
| `#nav` | Sidebar, Ctrl+K search, help panel, keyboard shortcuts | 6 |
| `#edge` | Special chars, unicode, empty files, huge batches, long names | 8 |
| `#security` | Role enforcement, XSS, SQL injection, unauthorized access | 8 |
| `#performance` | Load times, large datasets, bulk operations | 4 |
| `#electron` | Window behavior, file system, resize, keyboard in desktop | 3 |
| `#backup` | DB backup, export roundtrip, data integrity | 4 |
| `#api` | Direct API endpoint testing (curl/fetch, no UI) | 6 |

### Tag Quick-Run Combos

| Combo | Tags | What It Tests |
|-------|------|---------------|
| Import Pipeline | `#import` + `#sync` + `#detail` | Full PDF → sync → display flow |
| Full Data Flow | `#data-flow` | End-to-end pipelines |
| Security Audit | `#security` + `#api` + `#auth` | All security checks |
| Visual Regression | `#ui` + `#nav` + `#electron` | All visual/layout tests |
| Edge Cases | `#edge` | All boundary conditions |
| Backup Verify | `#backup` + `#export` | Data integrity |
| Smoke Test (P0) | `@auth:login` `@import:single-pdf` `@sync:single` `@detail:info-grid` `@export:csv` `@app:create` `@editor:generate-all` | 7 critical path tests |
| Everything | `#all` | Every command (79) |

### Command Index (Alphabetical)

```
@api:auth-flow       @api:crud-apps       @api:crud-licences   @api:export
@api:search          @api:unauthorized
@app:create          @app:delete          @app:list            @app:readiness
@app:status
@auth:bad-password   @auth:first-register @auth:login          @auth:logout
@auth:session-persist
@company:add-facility @company:add-member  @company:edit-facility @company:info
@company:regulatory  @company:role-badges
@dash:activity-feed  @dash:empty-state    @dash:nav-cards      @dash:new-pla
@dash:stats-accuracy
@detail:attachments  @detail:claims       @detail:dosage-summary @detail:doses
@detail:hc-link      @detail:info-grid    @detail:ingredients  @detail:non-med
@detail:risks        @detail:scroll       @detail:status-badge @detail:upload-file
@editor:add-claim    @editor:add-dosage   @editor:add-ingredient @editor:add-non-med
@editor:add-risk     @editor:ai-research  @editor:basic-info   @editor:bilingual
@editor:claude-down  @editor:doc-approve  @editor:doc-delete   @editor:doc-preview
@editor:export-package @editor:generate-all @editor:generate-one @editor:risk-types
@error:claude-down   @error:corrupt-pdf   @error:duplicate-lnhpd @error:network-sync
@export:bulk-csv     @export:csv          @export:csv-roundtrip @export:excel
@export:empty        @export:json
@import:auto-enrich  @import:corrupt-pdf  @import:cross-entity @import:dup-attach
@import:dup-bulk     @import:dup-replace  @import:dup-skip     @import:dual-pdf
@import:empty-batch  @import:folder       @import:large-batch  @import:preview-cancel
@import:scan-path    @import:single-pdf
@kb:csv-roundtrip    @kb:export-csv       @kb:import-csv       @kb:search
@nav:all-links       @nav:highlight       @nav:logout          @nav:user-info
@search:ctrl-k       @search:empty        @search:keyboard     @search:navigate
@search:results
@sec:api-key-hidden  @sec:audit-logged    @sec:file-traversal  @sec:no-cookie
@sec:role-editor     @sec:role-viewer     @sec:sql-injection   @sec:xss-input
@settings:api-key    @settings:key-mask
@sub:create          @sub:status
@sync:api-down       @sync:bulk           @sync:duplicate-guard @sync:field-mapping
@sync:idempotent     @sync:not-found      @sync:single
@table:bulk-delete   @table:bulk-export   @table:click-row     @table:search
@table:select-all    @table:sort
```

### Screenshot Matching Guide

| If You See... | Go To Section |
|----------------|---------------|
| Login form (username + password) | PAGE: Login |
| 5 stat cards + activity feed | PAGE: Dashboard |
| Table of licences + Import button | PAGE: Licences — Table |
| Modal with 3 tabs (Upload/Folder/Scan) | PAGE: Licences — Import |
| Slide-out panel with product details | PAGE: Licences — Detail Panel |
| List of applications with status | PAGE: Applications |
| 7-tab editor (Basic/Ingredients/Claims...) | PAGE: Applications — Editor |
| 3-tab company profile | PAGE: Company Profile |
| Ingredient table with search/filter | PAGE: Ingredients KB |
| Submission list | PAGE: Ingredient Submissions |
| Settings with API key field | PAGE: Settings |
| Floating search palette | Global Search (Ctrl+K) |

---

## ─── SECTION 1: PAGE TESTS ───

---

## PAGE: Login (/login)

### Visual Elements
- Username text field
- Password text field
- Login button (primary, full-width)
- Register link (visible only when database has zero users)

### Journeys

#### `@auth:first-register` `#auth` — J-AUTH-01: First User Registration (P0)
- **Action**: Start with a fresh/empty database. Navigate to `/login`. The registration form should appear instead of login (no users exist). Enter username `admin`, password `admin123`, name `Admin User`. Click Register.
- **Expected Result**: User is created, redirected to `/dashboard`. A session cookie is set with `httpOnly` and `SameSite=lax` flags. The `/login` page no longer shows the register form on subsequent visits.
- **Cross-System Check**: `User` table has 1 row with `role=editor`. `ActivityLog` has entry with `action=register`. Cookie visible in browser devtools under Application > Cookies.

#### `@auth:login` `#auth` — J-AUTH-02: Valid Login (P0)
- **Action**: Navigate to `/login`. Enter valid username and password. Click Login.
- **Expected Result**: Redirected to `/dashboard`. Sidebar shows username and role. Session cookie is set with 30-day expiry.
- **Cross-System Check**: `ActivityLog` has entry with `action=login`, `userId` matches the logged-in user. `GET /api/auth/me` returns `{ id, username, name, role }`.

#### `@auth:bad-password` `#auth` `#edge` — J-AUTH-03: Invalid Login (P0)
- **Action**: Navigate to `/login`. Enter valid username but wrong password. Click Login.
- **Expected Result**: Error message displayed (red text, e.g., "Invalid credentials"). No redirect. No session cookie set.
- **Cross-System Check**: `ActivityLog` has NO entry for this attempt. `GET /api/auth/me` returns 401. No cookie in browser storage.

#### `@auth:session-persist` `#auth` — J-AUTH-04: Session Persistence (P1)
- **Action**: Log in successfully. Close the browser tab entirely. Reopen browser and navigate to `/dashboard`.
- **Expected Result**: User is still authenticated. Dashboard loads without redirect to `/login`. Sidebar shows correct user info.
- **Cross-System Check**: `GET /api/auth/me` still returns user data. Cookie expiry is ~30 days from login time.

#### `@auth:logout` `#auth` — J-AUTH-05: Logout (P0)
- **Action**: While logged in, click the Logout button in the sidebar.
- **Expected Result**: Redirected to `/login`. Session cookie is cleared/expired. Navigating to `/dashboard` redirects back to `/login`.
- **Cross-System Check**: `ActivityLog` has entry with `action=logout`. `GET /api/auth/me` returns 401. Cookie is removed from browser storage.

---

## PAGE: Dashboard (/dashboard)

### Visual Elements
- 5 stat cards (Total Licences, Active, Applications, Ingredients, Documents)
- Recent Applications list (last 5)
- Activity Feed (recent actions)
- "New PLA" button (navigates to /applications/new)

### Journeys

#### `@dash:stats-accuracy` `#data-flow` — J-DASH-01: Stats Accuracy (P0)
- **Action**: Navigate to `/dashboard`. Read all 5 stat card values.
- **Expected Result**: Each card value matches the actual database count. "Total Licences" = `ProductLicence` row count. "Active" = count where `productStatus=active`. "Applications" = `Application` row count. "Ingredients" = `Ingredient` row count. "Documents" = `GeneratedDocument` row count.
- **Cross-System Check**: Run `SELECT COUNT(*) FROM ProductLicence` (and equivalent for each stat) against the SQLite database. Values must match exactly. If they differ, the dashboard query is wrong.

#### `@dash:activity-feed` `#ui` — J-DASH-02: Activity Feed (P1)
- **Action**: Perform an action elsewhere (e.g., import a licence). Return to `/dashboard`. Check the Activity Feed section.
- **Expected Result**: The most recent action appears at the top of the feed with correct action type, entity name, and timestamp. Feed shows at most 10 recent items, ordered newest first.
- **Cross-System Check**: `ActivityLog` table entries match what the feed displays. Timestamps are in local time zone.

#### `@dash:nav-cards` `#nav` — J-DASH-03: Navigation (P0)
- **Action**: Click each stat card and the "New PLA" button.
- **Expected Result**: "Total Licences" card navigates to `/licences`. "Applications" card navigates to `/applications`. "Ingredients" card navigates to `/ingredients`. "New PLA" button navigates to `/applications/new`. Each navigation loads the correct page without errors.
- **Cross-System Check**: Browser URL matches expected route. Page content loads (no white screen, no 500 errors in console).

---

## PAGE: Licences (/licences)

### Visual Elements
- **Top bar**: CSV export button, Excel export button, Import button; Search bar (text input)
- **Table**: Checkbox column, NPN (licenceNumber), Product Name, Form (dosageForm), Route (routeOfAdmin), Class (applicationClass), Status (productStatus with colored badge), Issued (licenceDate), Actions column (delete button)
- **Bulk toolbar**: Appears when 1+ checkboxes selected; shows count + Delete Selected + Export Selected
- **Detail panel**: Slides in from right when a row is clicked; table shrinks to accommodate

---

### Section: Import Modal

> Opened by clicking the "Import" button in the top bar. Has 3 tabs: "Upload PDFs" (single), "Folder Upload" (folder), "Server Path" (scan).

#### `@import:single-pdf` `#import` — J-IMP-01: Tab 1 Single PDF Upload (P0)
- **Action**: Click Import. On "Upload PDFs" tab, click the file picker or use the browse button. Select 1 PDF file (e.g., `IL_80120933.pdf`). Wait for processing.
- **Expected Result**: The file appears in the pending files list. A preview item is generated showing extracted NPN (licenceNumber), product name, and status ("new" or "duplicate"). No database writes happen yet -- this is preview only.
- **Cross-System Check**: `ProductLicence` table has no new rows. `POST /api/upload/process` was called and returned extracted data. The preview item's `licenceNumber` matches the NPN in the PDF.

#### `@import:dual-pdf` `#import` `#regression` — J-IMP-02: Tab 1 Multi-PDF Same NPN (P0)
- **Action**: Click Import. Select 2 PDF files that belong to the same NPN (e.g., `IL_80120933.pdf` and `PL_80120933.pdf`). Wait for processing.
- **Expected Result**: The preview shows exactly 1 item (NOT 2 items). That item shows `fileCount: 2` and displays "2 files" in its summary. The item's licenceNumber is the shared NPN. Both files are listed under that single preview item.
- **Cross-System Check**: The `PreviewItem.files` array contains both File objects. `PreviewItem.fileCount === 2`. Only one import action will be executed if confirmed.

#### `@import:multi-npn` `#import` — J-IMP-03: Tab 1 Multi-PDF Different NPNs (P0)
- **Action**: Click Import. Select 3 PDF files: 2 for NPN 80120933 and 1 for NPN 80034567. Wait for processing.
- **Expected Result**: The preview shows exactly 2 items. First item: NPN 80120933 with "2 files". Second item: NPN 80034567 with "1 file". Each item has its own status badge (new/duplicate).
- **Cross-System Check**: Preview items array length is 2. Each item's `licenceNumber` is correct. Grouping logic in the upload handler correctly merged files by NPN.

#### `@import:drag-drop` `#import` `#ui` — J-IMP-04: Tab 1 Drag and Drop (P1)
- **Action**: Click Import. Drag 1 or more PDF files from the file explorer onto the drop zone area in the modal.
- **Expected Result**: Drop zone highlights with a visual indicator (border color change, background change) when files are dragged over it. On drop, files are added to the pending list and processed exactly like file picker uploads. The `isDragging` state toggles correctly.
- **Cross-System Check**: `pendingFiles` state contains all dropped files. `dragenter`/`dragleave`/`drop` events are handled. No duplicate files added if the same file is dropped twice.

#### `@import:folder` `#import` — J-IMP-05: Tab 2 Folder Upload (P0)
- **Action**: Switch to "Folder Upload" tab. Click "Select Folder". Choose a folder that contains subfolders like `IL_80120933/` and `PL_80120933/`, each with PDFs inside.
- **Expected Result**: The scanner reads the folder structure. Preview items are grouped by subfolder name. Each item shows the folder name, file count, and extracted NPN. IL and PL files for the same NPN are grouped into 1 preview item.
- **Cross-System Check**: `folderRef` input was used with `webkitdirectory` attribute. Files are grouped by their relative folder path. No database writes during preview.

#### `@import:scan-path` `#import` — J-IMP-06: Tab 3 Server Path Scan (P0)
- **Action**: Switch to "Server Path" tab. Enter a valid server path (e.g., `C:\Users\Admin\Downloads\HEALTH CANADA\NPN filling tool\npn-tool\data\attachments`). Click Scan.
- **Expected Result**: The system calls `POST /api/upload/scan-folder` with `{ path, preview: true }`. Results appear as preview items. No database writes occur because `preview: true` was set. Each found folder/PDF is displayed with its extracted NPN and status.
- **Cross-System Check**: `POST /api/upload/scan-folder` returns scan results without creating any `ProductLicence` rows. The `scanning` loading state shows and clears. Invalid paths show an error message.

#### `@import:dup-detect` `#import` — J-IMP-07: Duplicate Detection (P0)
- **Action**: Import a product with NPN 80120933 (so it exists in DB). Then open Import again and upload a PDF for NPN 80120933.
- **Expected Result**: The preview item shows status "duplicate" with a yellow badge. The existing licence data is shown alongside the new data. Three action buttons appear: "Replace", "Skip", "Attach". Default action is "skip".
- **Cross-System Check**: `PreviewItem.status === "duplicate"`. `PreviewItem.existingLicence` contains the full existing `ProductLicence` record. `PreviewItem.duplicateAction` defaults to `"skip"`.

#### `@import:dup-bulk` `#import` — J-IMP-08: Batch Duplicate Actions (P1)
- **Action**: Upload 5 PDFs where 3 are duplicates. Click "Skip All Duplicates" button.
- **Expected Result**: All 3 duplicate preview items switch their action to "skip". The 2 new items remain unchanged. Confirming the import only creates the 2 new products.
- **Cross-System Check**: After import, `ProductLicence` table has exactly 2 new rows. The 3 existing records are unchanged (same `updatedAt` timestamps). No `AuditLog` entries for the skipped items.

#### `@import:new-product` `#import` `#data-flow` — J-IMP-09: Import New Product (P0)
- **Action**: Upload a PDF for a new NPN (not in DB). Preview shows status "new". Click "Confirm Import".
- **Expected Result**: A `ProductLicence` record is created with extracted data (licenceNumber, productName, dosageForm, etc.). PDF files are saved to `data/attachments/licence/{id}/` and an `Attachment` record is created. LNHPD auto-enrichment fires: `POST /api/sync/lnhpd/{id}` is called to fetch ingredients, claims, risks, and doses.
- **Cross-System Check**: `ProductLicence` has 1 new row with `importedFrom="pdf"`. `Attachment` has 1+ rows linking to that licence. `AuditLog` has "created" entry. If LNHPD sync succeeded, `medicinalIngredientsJson` is populated (not empty `[]`). File exists on disk at the `filePath` stored in Attachment.

#### `@import:dup-replace` `#import` — J-IMP-10: Import Replace Duplicate (P1)
- **Action**: For a duplicate preview item, select "Replace" action. Click "Confirm Import".
- **Expected Result**: The old `ProductLicence` record is deleted (cascade deletes amendments). A new `ProductLicence` is created with the new PDF data. Old attachments are removed. New attachments are created from the uploaded files.
- **Cross-System Check**: `ProductLicence` count is unchanged (1 deleted + 1 created). Old record's ID no longer exists. New record has a new UUID. `AuditLog` has both "deleted" and "created" entries. Old attachment files are cleaned up from disk.

#### `@import:dup-attach` `#import` — J-IMP-11: Import Attach to Existing (P1)
- **Action**: For a duplicate preview item, select "Attach" action. Click "Confirm Import".
- **Expected Result**: The existing `ProductLicence` record is NOT modified. The new PDF files are attached to the existing record as additional `Attachment` entries. No new `ProductLicence` row is created.
- **Cross-System Check**: `ProductLicence` count is unchanged. The existing record's `updatedAt` is NOT changed. `Attachment` table has new rows with `entityId` matching the existing licence's `id`. `AuditLog` has "uploaded" entries for the new attachments.

#### `@import:batch-guard` `#import` `#regression` — J-IMP-12: Same Batch Guard (P0)
- **Action**: In a single import batch, upload 2 PDFs that both parse to the same NPN but were NOT grouped by the preview (edge case). Click "Confirm Import".
- **Expected Result**: The first item creates a new `ProductLicence`. The second item detects the just-created record and attaches its files to it instead of creating a duplicate. Only 1 `ProductLicence` row is created total.
- **Cross-System Check**: `ProductLicence` has exactly 1 row for that NPN. `Attachment` has entries from both PDFs linked to the same `entityId`. No unique constraint violation errors in the server logs.

#### `@import:corrupt-pdf` `#import` `#edge` — J-IMP-13: Error Handling (P1)
- **Action**: Upload a file that is not a PDF (e.g., a `.txt` file renamed to `.pdf`) or a corrupt PDF. Wait for processing.
- **Expected Result**: The preview item shows status "error" with a red badge and a descriptive error message (e.g., "Failed to parse PDF" or "Not a valid PDF file"). The error item is NOT included in the import when confirmed. Other valid items in the batch still import normally.
- **Cross-System Check**: `PreviewItem.status === "error"`. `PreviewItem.error` contains the error message. No `ProductLicence` created for the errored file. No server crash -- other items processed normally.

---

### Section: Table

#### `@table:search` `#table` — J-TBL-01: Search / Filter (P0)
- **Action**: Type an NPN number (e.g., "80120933") or a product name (e.g., "omega") into the search bar.
- **Expected Result**: The table filters in real-time (client-side) to show only rows where `licenceNumber` or `productName` contains the search term. Filtering is case-insensitive. Clearing the search restores all rows.
- **Cross-System Check**: The `search` state variable matches the input value. The filtered array length is less than or equal to the full `licences` array. No API calls made during client-side filtering.

#### `@table:click-row` `#table` `#ui` — J-TBL-02: Row Click Opens Detail Panel (P0)
- **Action**: Click on any row in the licences table (not on the checkbox or delete button).
- **Expected Result**: The detail panel slides in from the right side. The table container shrinks (flex layout) to make room. The selected row is highlighted. The panel shows all product data for the clicked licence (NPN, product name, status, ingredients, claims, etc.).
- **Cross-System Check**: `selected` state matches the clicked licence object. `GET /api/attachments?entityType=licence&entityId={id}` is called to load attachments. `sourceFiles` and `attachments` states are populated. The panel does NOT overlap the table (flex shrink, not overlay).

#### `@table:select-one` `#table` — J-TBL-03: Checkbox Selection (P0)
- **Action**: Click the checkbox on 2 different rows in the table.
- **Expected Result**: Both rows are visually highlighted (selected state). The bulk action toolbar appears at the top or bottom of the table showing "2 selected". Toolbar buttons include "Delete Selected" and "Export Selected". Clicking a checkbox again deselects that row.
- **Cross-System Check**: The selected IDs array contains exactly 2 IDs. The bulk toolbar visibility is controlled by `selectedIds.length > 0`. Row highlight CSS class is applied to selected rows.

#### `@table:select-all` `#table` — J-TBL-04: Select All / Deselect All (P1)
- **Action**: Click the checkbox in the table header row.
- **Expected Result**: All visible rows are selected. The header checkbox shows as "checked" (not indeterminate). The bulk toolbar shows the total count. Clicking the header checkbox again deselects all. If some rows are selected and you click header, it selects all (indeterminate state resolves to select-all).
- **Cross-System Check**: `selectedIds` array length equals the filtered licences array length. Indeterminate state is set when `0 < selectedIds.length < filteredLicences.length`.

#### `@table:bulk-delete` `#table` — J-TBL-05: Bulk Delete (P0)
- **Action**: Select 2+ rows using checkboxes. Click "Delete Selected" in the bulk toolbar. A confirmation modal appears. Click "Confirm".
- **Expected Result**: A progress indicator appears during deletion. `POST /api/licences/bulk-delete` is called with the array of selected IDs. All selected `ProductLicence` records are deleted. Their `LicenceAmendment` records are cascade-deleted. Their `Attachment` records are removed. The table refreshes without the deleted rows. The bulk toolbar disappears.
- **Cross-System Check**: `ProductLicence` table has N fewer rows (where N is selected count). `Attachment` table has no orphaned rows referencing deleted IDs. `AuditLog` has "deleted" entries for each removed licence. Attachment files are cleaned up from `data/attachments/licence/{id}/` directories.

#### `@table:bulk-export` `#table` `#export` — J-TBL-06: Bulk CSV Export (P1)
- **Action**: Select 3 rows using checkboxes. Click "Export Selected" in the bulk toolbar.
- **Expected Result**: A CSV file downloads containing only the 3 selected licences. The CSV has all 55 standard columns (matching the full export schema). Headers are in the first row. Each data row corresponds to one selected licence.
- **Cross-System Check**: CSV row count = 3 (data rows) + 1 (header). All 55 column headers are present. The NPN values in the CSV match the 3 selected rows. No other licences are included.

#### `@table:inline-delete` `#table` — J-TBL-07: Inline Delete Single Row (P0)
- **Action**: Click the delete button (trash icon) in the Actions column of a single row.
- **Expected Result**: The row shows inline confirm/cancel buttons (or a confirmation prompt). Clicking "Confirm" deletes the single licence. Clicking "Cancel" restores the row to normal. During deletion, a loading state is shown.
- **Cross-System Check**: `confirmDel` state is set to the licence ID. On confirm, `DELETE /api/licences/{id}` is called. `ProductLicence` row removed. `AuditLog` entry created. If the detail panel was showing this licence, it closes.

#### `@table:empty-state` `#table` `#edge` — J-TBL-08: Empty State (P2)
- **Action**: Delete all licences from the database (or start with empty DB). Navigate to `/licences`.
- **Expected Result**: Instead of an empty table, a friendly empty state is shown with a message like "No licences yet" and a call-to-action button to open the Import modal. The search bar and export buttons are either hidden or disabled.
- **Cross-System Check**: `licences` array has length 0. The empty state component renders. Clicking the CTA opens the import modal (same as clicking the Import button).

---

### Section: Detail Panel

> The detail panel appears on the right side when a table row is clicked. It shows comprehensive product information organized into collapsible sections.

#### `@detail:info-grid` `#detail` — J-DET-01: Product Info Grid (P0)
- **Action**: Click a row for a product that has been synced with LNHPD. Observe the info grid at the top of the detail panel.
- **Expected Result**: All fields are populated: NPN (licenceNumber), Product Name, Dosage Form, Route of Administration, Application Class, Submission Type, Licence Date (issued), Revised Date, Receipt Date, Product Status (with colored badge), Company Name, Company Code. An "LNHPD" link button is visible.
- **Cross-System Check**: Every displayed field matches the corresponding `ProductLicence` column in the database. No fields show "undefined" or "null" as text. Status badge color matches the `statusColors` mapping (green for active, red for cancelled, yellow for suspended, gray for non_active).

#### `@detail:dosage-summary` `#detail` — J-DET-02: Dosage Summary Line (P1)
- **Action**: View the detail panel for a synced product. Look for the dosage summary line below the info grid.
- **Expected Result**: A formatted summary string appears, e.g., `"Capsule, soft . Oral . 1 capsule . 1x/Day(s) . Adults (19+)"`. Components are: dosage form, route, dose amount + unit, frequency, population. Dot separators between each component.
- **Cross-System Check**: The summary is derived from `dosesJson` parsed data. If `dosesJson` is empty `[]`, the summary line is hidden (not shown as garbled text). The population field comes from the first dose group in the array.

#### `@detail:hc-link` `#detail` — J-DET-03: LNHPD Link to Health Canada (P1)
- **Action**: In the detail panel, click the "View on HC" or LNHPD link button.
- **Expected Result**: A new browser tab opens with URL: `https://health-products.canada.ca/lnhpd-bdpsnh/info?licence={NPN}&lang=en` where `{NPN}` is the licenceNumber (not the lnhpdId). The Health Canada product page loads showing the official product monograph.
- **Cross-System Check**: The `href` attribute of the link uses `licenceNumber` (8-digit NPN), not the internal UUID or `lnhpdId`. The URL template is correct for the LNHPD public portal. `ActivityLog` records a "click" action for the HC link.

#### `@sync:single` `#sync` — J-DET-04: Sync Success (P0)
- **Action**: In the detail panel for a product with a valid NPN, click the "Sync" button.
- **Expected Result**: Button text changes to "Syncing..." with a spinner. After 1-3 seconds, the panel refreshes with enriched data. Medicinal ingredients, non-medicinal ingredients, claims, risks, and doses are populated. A success notification appears.
- **Cross-System Check**: `POST /api/sync/lnhpd/{id}` was called and returned 200. `ProductLicence` row now has non-empty `medicinalIngredientsJson`, `claimsJson`, `risksJson`, `dosesJson`. `lnhpdId` is set (integer from LNHPD API). `AuditLog` has "synced" entry.

#### `@sync:not-found` `#sync` `#edge` — J-DET-05: Sync Not Found (P1)
- **Action**: In the detail panel for a product whose NPN does NOT exist in LNHPD (e.g., a test NPN like 99999999), click the "Sync" button.
- **Expected Result**: Button text changes to "Syncing..." briefly, then an error alert/notification appears (e.g., "Product not found in LNHPD" or "No results for this NPN"). The existing data is NOT cleared or overwritten. The panel returns to its previous state.
- **Cross-System Check**: `POST /api/sync/lnhpd/{id}` returned a non-200 status or an error response. `ProductLicence` row is unchanged (all JSON fields retain their previous values). No `lnhpdId` was set. No data was nulled out.

#### `@sync:duplicate-guard` `#sync` `#edge` — J-DET-06: Sync Duplicate Guard (P1)
- **Action**: Have two `ProductLicence` records with the same NPN but different IDs. Sync one of them. Then attempt to sync the other.
- **Expected Result**: The second sync attempt should either succeed (using licenceNumber, not lnhpdId for lookup) or show a warning that another record already has this `lnhpdId`. The `lnhpdId` unique constraint is not violated.
- **Cross-System Check**: `ProductLicence.lnhpdId` has a `@unique` constraint. If both records try to set the same `lnhpdId`, a Prisma unique constraint error is caught and shown to the user. The second record's `lnhpdId` remains null.

#### `@detail:ingredients` `#detail` — J-DET-07: Medicinal Ingredients Display (P0)
- **Action**: View the detail panel for a synced product that has medicinal ingredients. Look at the Medicinal Ingredients section.
- **Expected Result**: Each ingredient is displayed as a tag/chip showing "Name Qty Unit" (e.g., "Fish Oil 1000 mg"). Hovering over or clicking a tag shows additional details in a tooltip: source material, extract type, potency. Tags are colored (e.g., blue or teal background).
- **Cross-System Check**: Tags are generated from `medicinalIngredientsJson` parsed as JSON array. Each object in the array has `ingredient_name`, `quantity`, `quantity_unit`, `potency_amount`, `potency_unit`, `source_material`. The `jp()` helper function correctly parses the JSON.

#### `@detail:non-med` `#detail` — J-DET-08: Non-Medicinal Ingredients Display (P1)
- **Action**: View the detail panel for a synced product that has non-medicinal ingredients. Look at the Non-Medicinal Ingredients section.
- **Expected Result**: Each NMI is displayed as a gray tag/chip showing the ingredient name. Tags are visually distinct from medicinal ingredients (gray vs colored). The section is hidden if `nonMedIngredientsJson` is empty.
- **Cross-System Check**: Tags are generated from `nonMedIngredientsJson` parsed array. If the array is empty or `[]`, the section heading and tags area are not rendered (no empty section visible).

#### `@detail:claims` `#detail` — J-DET-09: Approved Claims Display (P0)
- **Action**: View the detail panel for a synced product that has health claims. Look at the Claims section.
- **Expected Result**: Claims are displayed as a bullet list. Each claim shows the English claim text. Claims are ordered as they appear in the `claimsJson` array. If there are French translations, they may appear as secondary text.
- **Cross-System Check**: Claims are parsed from `claimsJson`. Each entry has a `claim_text` or similar field. The number of bullet items matches the array length. Empty claims (null/empty string) are filtered out by the `jp()` helper.

#### `@detail:doses` `#detail` — J-DET-10: Dosage Information Cards (P1)
- **Action**: View the detail panel for a synced product with dosage data. Look at the Dosage section.
- **Expected Result**: Each dosage group is displayed as a card showing: population (e.g., "Adults 19+"), dose amount and unit, frequency, directions. Multiple dosage groups (e.g., adults vs children) each get their own card.
- **Cross-System Check**: Cards are generated from `dosesJson` parsed array. Each entry has fields for `population`, `dose`, `dose_unit`, `frequency`. Card count matches array length.

#### `@detail:risks` `#detail` — J-DET-11: Risk Information Display (P1)
- **Action**: View the detail panel for a synced product with risk data. Look at the Risk Information section.
- **Expected Result**: Risk items are grouped by type (Cautions, Warnings, Contraindications, Adverse Reactions). Within each group, items are listed as bullets. The `risk_type_desc` field determines the grouping header.
- **Cross-System Check**: Risks are parsed from `risksJson`. Grouping uses `risk_type_desc` or equivalent field. Items within each group maintain their array order. Empty groups are not shown.

#### `@detail:attachments` `#detail` — J-DET-12: Source Files Display (P0)
- **Action**: View the detail panel for a product that was imported from PDF(s). Look at the Source Files / Attachments section.
- **Expected Result**: Each attached file appears as a card showing: file name, file type icon, file size (formatted, e.g., "1.2 MB"), upload date, uploaded by. Each card has "View" and "Download" action buttons.
- **Cross-System Check**: Attachments are loaded from `GET /api/attachments?entityType=licence&entityId={id}`. Card count matches `Attachment` table rows for this entity. `uploadedBy.name` is displayed. File sizes are correctly converted from bytes.

#### `@detail:pdf-view` `#detail` `#ui` — J-DET-13: View PDF Inline (P1)
- **Action**: Click the "View" button on a PDF attachment card.
- **Expected Result**: A new browser tab opens showing the PDF rendered inline (using the browser's built-in PDF viewer). The URL points to `/api/files/view?path={filePath}`. The PDF loads without download prompt.
- **Cross-System Check**: `GET /api/files/view` returns the file with `Content-Type: application/pdf` and appropriate disposition header. `ActivityLog` has a "view" entry for this attachment. The file path resolves correctly on the server.

#### `@detail:upload-file` `#detail` — J-DET-14: Upload New Attachment (P0)
- **Action**: In the detail panel, use the file upload area/button to select new files. Choose 1 or more files (PDF, XLSX, DOCX, JPG, etc.).
- **Expected Result**: An upload progress indicator shows for each file. On completion, the new attachment(s) appear in the attachments list immediately (no page refresh needed). A success message is shown.
- **Cross-System Check**: `POST /api/attachments` was called with `FormData` containing `file`, `entityType=licence`, `entityId={licenceId}`. `Attachment` table has new rows. Files exist on disk at `data/attachments/licence/{id}/`. `AuditLog` has "uploaded" entries.

#### `@detail:dedup-same` `#detail` `#edge` — J-DET-15: Attachment Dedup Same Entity (P1)
- **Action**: Upload a file named `IL_80120933.pdf` to a product. Then upload the exact same file (`IL_80120933.pdf`) to the same product again.
- **Expected Result**: The second upload does NOT create a duplicate. The API returns the existing attachment with `_deduplicated: true` flag and a message like "Attachment already exists -- skipped duplicate". The attachments list still shows only 1 copy.
- **Cross-System Check**: `Attachment` table has exactly 1 row with this `fileName` + `entityType` + `entityId` combination (enforced by `@@unique([entityType, entityId, fileName])`). The response includes `_deduplicated: true`. No duplicate file on disk.

#### `@detail:dedup-cross` `#detail` `#regression` — J-DET-16: Cross Entity Warning (P2)
- **Action**: Upload `IL_80120933.pdf` to Product A. Then upload the same filename `IL_80120933.pdf` to Product B.
- **Expected Result**: The upload to Product B succeeds (it IS a different entity). But the response includes a `_crossEntityWarning` field like "Same file also attached to licence/{ProductA_ID}". The user is informed but not blocked.
- **Cross-System Check**: `Attachment` table has 2 rows: one for Product A, one for Product B. The Product B response has `_crossEntityWarning` set. Both files exist on disk in their respective directories. No data corruption.

#### `@detail:close` `#detail` `#ui` — J-DET-17: Close Detail Panel (P0)
- **Action**: Click the X (close) button in the top-right corner of the detail panel.
- **Expected Result**: The detail panel slides out / disappears. The table expands back to full width (flex layout restored). The selected row is deselected. No data is lost.
- **Cross-System Check**: `selected` state is set to `null`. Table container no longer has the reduced-width class. The previously selected row loses its highlight styling.

---

### Section: Export

#### `@export:bulk-csv` `#export` — J-EXP-01: CSV Export All Licences (P0)
- **Action**: Click the "CSV" export button in the top bar (with no rows selected).
- **Expected Result**: A CSV file downloads with ALL licences in the database. The file has 55 columns covering all `ProductLicence` fields plus flattened ingredient, claim, risk, and dose data. The first row is headers. Each subsequent row is one licence. UTF-8 encoding. Filename includes date.
- **Cross-System Check**: `GET /api/licences/export` is called. CSV row count = `ProductLicence` table count + 1 header row. All 55 columns are present and correctly named. JSON fields (medicinalIngredientsJson, etc.) are flattened into readable columns.

#### `@export:excel` `#export` — J-EXP-02: Excel Export (P1)
- **Action**: Click the "Excel" export button in the top bar.
- **Expected Result**: An `.xlsx` file downloads. It contains 3 sheets: "Instructions" (how to use the data), "Data Definitions" (column descriptions), "Data" (the actual licence data). The Data sheet has the same rows/columns as the CSV export. Formatting is applied (headers bold, etc.).
- **Cross-System Check**: `GET /api/licences/export-excel` is called. The `.xlsx` file opens in Excel/Sheets without errors. Sheet names are correct. Data sheet row count matches database. All columns are present.

#### `@export:csv` `#export` — J-EXP-03: Per-Licence CSV Export (P1)
- **Action**: In the detail panel for a single licence, click the "Export CSV" or download button specific to that licence.
- **Expected Result**: A CSV file downloads containing only that single licence's data. Same 55 columns as the full export. Only 1 data row (plus header). Filename includes the NPN number.
- **Cross-System Check**: `GET /api/licences/{id}/export` is called. CSV has exactly 2 rows (1 header + 1 data). The NPN in the data row matches the selected licence. All JSON fields are properly flattened.

---

## PAGE: Applications (/applications)

### Visual Elements
- **Table**: Columns for Product Name, Application Class, Status (badge), Ingredients count, Documents count, Created By, Created date
- **"New PLA" button**: Top-right, navigates to /applications/new
- **Row click**: Navigates to /applications/[id] (tabbed editor)

### Journeys

#### `@app:create` `#application` — J-APP-01: Create New Application (P0)
- **Action**: Click "New PLA" button. Fill in required fields: Product Name, Brand Name, Application Class (I/II/III), Application Type (Compendial/Traditional/Non-traditional), Dosage Form, Route of Administration. Click Save/Create.
- **Expected Result**: An `Application` record is created in the database with `status=draft`. The user is redirected to `/applications/{newId}` (the tabbed editor). All entered fields are saved correctly. `createdById` is set to the current user's ID.
- **Cross-System Check**: `Application` table has 1 new row. `AuditLog` has "created" entry for the application. The redirect URL contains the correct UUID. `createdBy` relation links to the logged-in user.

---

### Section: Tabbed Editor (/applications/[id])

> The application editor has multiple tabs: Overview, Ingredients, Claims, Dosage, Risk, Documents, Package.

#### `@editor:add-ingredient` `#application` — J-APP-02: Ingredients Tab (P0)
- **Action**: Navigate to `/applications/{id}/ingredients`. Click "Add Ingredient". Fill in: NHPID Name, Proper Name, Quantity (e.g., 500), Unit (mg), Source Material, Organism Part. Click Save.
- **Expected Result**: A `MedicinalIngredient` record is created linked to this application. The ingredient appears in the list with a sort order. Adding more ingredients assigns incrementing `sortOrder` values. Reordering (if drag-and-drop is available) updates `sortOrder` correctly.
- **Cross-System Check**: `MedicinalIngredient` table has new row with correct `applicationId`. `sortOrder` values are sequential (0, 1, 2...). All entered fields are saved. `AuditLog` has "created" entry.

#### `@editor:add-claim` `#application` — J-APP-03: Claims Tab (P0)
- **Action**: Navigate to `/applications/{id}` and switch to Claims tab. Click "Add Claim". Enter English claim text (e.g., "Helps support cardiovascular health"). Enter French claim text. Link to 1+ ingredients. Select claim type. Click Save.
- **Expected Result**: A `Claim` record is created with `applicationId` set. The claim appears in the list. `linkedIngredientIds` contains a JSON array of the linked ingredient IDs. `claimType` is set correctly. `selected=true` by default.
- **Cross-System Check**: `Claim` table has new row. `linkedIngredientIds` parses as valid JSON array of UUID strings. `claimTextEn` and `claimTextFr` are both saved. `sortOrder` is assigned.

#### `@editor:add-dosage` `#application` — J-APP-04: Dosage Tab (P1)
- **Action**: Switch to Dosage tab. Click "Add Dosage Group". Fill in: Population (e.g., "Adults"), Age Range Min (19), Age Range Max (null), Min Dose (1), Max Dose (2), Dose Unit (capsule), Frequency (daily), Directions ("Take with food"). Click Save.
- **Expected Result**: A `DosageGroup` record is created. The card appears showing all entered fields. `withFood` checkbox sets the boolean. Multiple dosage groups can be added for different populations.
- **Cross-System Check**: `DosageGroup` table has new row with correct `applicationId`. `ageRangeMin=19`. `withFood=true` if the checkbox was checked. `sortOrder` is assigned.

#### `@editor:add-risk` `#application` — J-APP-05: Risk Tab (P1)
- **Action**: Switch to Risk tab. Click "Add Risk Info". Select risk type (Caution/Warning/Contraindication/Adverse Reaction). Enter English text. Enter French text. Optionally link to a monograph. Click Save.
- **Expected Result**: A `RiskInfo` record is created. Items are grouped by `riskType` in the display. Multiple risks of different types can be added. Monograph-sourced risks show a "From Monograph" badge.
- **Cross-System Check**: `RiskInfo` table has new row. `riskType` matches selected value. `fromMonograph=true` if linked to monograph. `monographName` is set if applicable.

#### `@editor:generate-all` `#application` — J-APP-06: Document Generation (P0)
- **Action**: Navigate to Documents tab or click "Generate All Documents". The system should generate all required document types using the Claude API.
- **Expected Result**: `POST /api/applications/{id}/generate` is called. Up to 11 document types are generated (e.g., attestation, label text, product info, etc.). Each `GeneratedDocument` record is created with `status=pending`. Content is populated from Claude API responses. A progress indicator shows generation status.
- **Cross-System Check**: `GeneratedDocument` table has new rows (up to 11) with correct `applicationId`. Each has `documentType` set. `content` field is non-empty. `status=pending` (awaiting review). `AppSettings.claudeApiKey` must be set for generation to work; if not, an error is shown.

#### `@editor:doc-approve` `#application` — J-APP-07: Document Approval (P1)
- **Action**: After documents are generated, click on a document to review it. Click "Approve" button.
- **Expected Result**: The document's `status` changes from "pending" to "approved". `approvedById` is set to the current user's ID. `approvedAt` timestamp is set to now. The document card shows an "Approved" badge with the approver's name.
- **Cross-System Check**: `GeneratedDocument` row updated: `status=approved`, `approvedById` is current user UUID, `approvedAt` is not null. `AuditLog` has "approved" entry.

#### `@editor:export-package` `#application` `#export` — J-APP-08: Application Export (P1)
- **Action**: Click "Export" on the application page. This generates a JSON package.
- **Expected Result**: `GET /api/applications/{id}/export` returns a JSON file containing the complete application data: application fields, all medicinal ingredients, non-medicinal ingredients, claims, dosage groups, risk infos, generated documents, supplier COAs, LNHPD precedents. All nested relations are included.
- **Cross-System Check**: The JSON file parses correctly. `medicinalIngredients` array length matches `MedicinalIngredient` count for this app. All relation arrays are present even if empty. Document content is included.

#### `@editor:ai-research` `#application` — J-APP-09: AI Ingredient Research (P1)
- **Action**: On the Ingredients tab, click "Research" button next to an ingredient. This calls the Claude API for structured ingredient research.
- **Expected Result**: `POST /api/applications/{id}/research` is called with the ingredient data. The Claude API returns structured research data (monograph references, safety data, regulatory status, dosing ranges). The response is displayed in a structured format.
- **Cross-System Check**: The API call includes the ingredient's `nhpidName` or `properName`. The response is valid JSON with expected fields. `AppSettings.claudeApiKey` is required. If the key is missing/invalid, a clear error is shown.

---

## PAGE: Company Profile (/company)

### Visual Elements
- **3 tabs**: Company Info, Facilities, Team
- **Company Info tab**: Form with legal name, DBA name, company code, senior official, address fields, site licence number, QAP info
- **Facilities tab**: List of facility cards with add button
- **Team tab**: List of team member cards with add button

### Journeys

#### `@company:info` `#ui` — J-COMP-01: View Company Info (P1)
- **Action**: Navigate to `/company`. The Company Info tab should be active by default.
- **Expected Result**: All fields are pre-filled with the default `CompanyProfile` data: Legal Name = "UV International Traders Inc", DBA = "Wellnessextract", Company Code = "45028", Senior Official = "Virender Dass", Province = "BC", Postal Code = "V2T 6H4". Fields are editable.
- **Cross-System Check**: `CompanyProfile` table has 1 row (created with defaults). Displayed values match database values. `GET /api/company` returns the profile data.

#### `@company:regulatory` `#ui` — J-COMP-02: Edit Company Info (P1)
- **Action**: Modify one or more fields (e.g., change phone number, update address). Click Save.
- **Expected Result**: The `CompanyProfile` record is updated. A success notification appears. The page reflects the saved changes. `updatedAt` timestamp is refreshed.
- **Cross-System Check**: `CompanyProfile` row has updated values. `AuditLog` has "updated" entry for entityType "company". The `changes` field in AuditLog shows which fields changed (old vs new values).

#### `@company:add-facility` `#application` — J-COMP-03: Add Facility (P1)
- **Action**: Switch to Facilities tab. Click "Add Facility". Fill in: Facility Type (warehouse/3pl/foreign_manufacturer), Name, Address, City, Province, Country. Set Site Licence info and GMP cert if applicable. Click Save.
- **Expected Result**: A `Facility` record is created. A new facility card appears in the list showing the facility name, type, and address. The card shows GMP status and site licence status if set.
- **Cross-System Check**: `Facility` table has new row. `facilityType` matches selected value. `isActive=true` by default. `activities` field is valid JSON array. `POST /api/facilities` was called.

#### `@company:edit-facility` `#application` — J-COMP-04: Edit Facility (P2)
- **Action**: Click "Edit" on an existing facility card. Modify fields: change address, add GMP cert date, add site licence number, toggle activities. Click Save.
- **Expected Result**: The `Facility` record is updated. The card reflects changes immediately. `gmpCertified` boolean and `gmpCertExpiry` date are saved. `activities` JSON array includes the selected activities.
- **Cross-System Check**: `Facility` row updated with new values. `PUT /api/facilities/{id}` was called. `activities` parses as valid JSON array (e.g., `["manufacturing", "packaging", "labelling"]`). `updatedAt` refreshed.

#### `@company:add-member` `#application` — J-COMP-05: Add Team Member (P1)
- **Action**: Switch to Team tab. Click "Add Team Member". Fill in: Name, Role, Title, Department, Phone, Email. Toggle badges: isQAP, isSeniorOfficial, isAuthorizedSignatory, isDPA, isHCContact. Click Save.
- **Expected Result**: A `TeamMember` record is created. A member card appears showing name, role, and badge icons (e.g., "QAP" badge, "Senior Official" badge). Contact info is displayed.
- **Cross-System Check**: `TeamMember` table has new row. Boolean flags match the toggled badges. `isActive=true` by default. `POST /api/team` was called.

#### `@company:role-badges` `#ui` — J-COMP-06: Delete Team Member (P2)
- **Action**: Click "Delete" on a team member card. Confirm the deletion.
- **Expected Result**: The `TeamMember` record is deleted (or `isActive` set to false). The card disappears from the list. A confirmation prompt appeared before deletion.
- **Cross-System Check**: `TeamMember` row removed (or `isActive=false`). `DELETE /api/team/{id}` was called. `AuditLog` has "deleted" entry. No orphaned references in other tables.

---

## PAGE: Ingredients Knowledge Base (/ingredients)

### Visual Elements
- **Search bar**: Text input for filtering ingredients
- **Type filter dropdown**: Filter by ingredientType (medicinal, non_medicinal, homeopathic)
- **Import CSV button**: Opens CSV import modal
- **Export CSV button**: Downloads all ingredients as CSV
- **Table**: Columns for Name, Type, Category, CAS Number, Status, Actions

### Journeys

#### `@kb:search` `#nav` — J-ING-01: Search Ingredients (P0)
- **Action**: Type an ingredient name (e.g., "Fish Oil" or "Vitamin D") into the search bar.
- **Expected Result**: The table filters to show only ingredients whose `nhpidName`, `properNameEn`, `commonNameEn`, or `scientificName` contains the search term. Filtering is case-insensitive. Clearing search restores all results.
- **Cross-System Check**: `GET /api/ingredients?search={term}` is called (or client-side filter applied). Result count is less than or equal to total. Each result's displayed name contains the search term.

#### `@kb:filter-type` `#ui` — J-ING-02: Filter by Type (P1)
- **Action**: Select "Medicinal" from the type filter dropdown.
- **Expected Result**: The table shows only ingredients with `ingredientType=medicinal`. Selecting "Non-Medicinal" shows `ingredientType=non_medicinal`. Selecting "All" or clearing the filter shows all types.
- **Cross-System Check**: Filter is applied correctly. Each visible row's type matches the selected filter. The count displayed matches `Ingredient` rows with that `ingredientType`.

#### `@kb:import-csv` `#backup` — J-ING-03: Import CSV (P1)
- **Action**: Click "Import CSV". Paste or upload CSV data with ingredient columns (name, type, CAS number, etc.). Click Import.
- **Expected Result**: `POST /api/ingredients/import` is called with the CSV data. New `Ingredient` records are created for each valid row. A summary is shown: "Imported X ingredients, Y skipped, Z errors". Duplicates (matching `nhpidId`) are skipped.
- **Cross-System Check**: `Ingredient` table has X new rows. Each has correct field values from the CSV. No duplicate `nhpidId` violations. `AuditLog` has "imported" entry with count.

#### `@kb:export-csv` `#backup` `#export` — J-ING-04: Export CSV (P1)
- **Action**: Click "Export CSV" button.
- **Expected Result**: A CSV file downloads containing all ingredients from the database. All relevant columns are included (name, type, category, CAS number, status, etc.). UTF-8 encoding. Headers in first row.
- **Cross-System Check**: `GET /api/ingredients/export` is called. CSV row count matches `Ingredient` table count + 1 header. All fields are correctly mapped.

#### `@kb:delete` `#application` — J-ING-05: Delete Ingredient (P1)
- **Action**: Click the delete button on an ingredient row. Confirm deletion.
- **Expected Result**: The `Ingredient` record is deleted. Cascade deletes any `IngredientMonographLink` records. The ingredient disappears from the table. A confirmation prompt appeared.
- **Cross-System Check**: `Ingredient` row removed. `IngredientMonographLink` rows with this `ingredientId` are also removed (cascade). `DELETE /api/ingredients/{id}` was called. No orphaned links remain.

---

## PAGE: Ingredient Submissions (/ingredient-submissions)

### Visual Elements
- Table listing NHPID new ingredient submissions
- Status badges (draft, submitted, under_review, approved, rejected)
- Create new submission button

### Journeys

#### `@sub:list` `#application` — J-ISUB-01: View Submissions List (P1)
- **Action**: Navigate to `/ingredient-submissions`. View the table.
- **Expected Result**: All `IngredientSubmission` records are listed with name, status badge, classification, created date, and created by. Rows are ordered by creation date (newest first).
- **Cross-System Check**: `GET /api/ingredient-submissions` returns all submissions. Row count matches DB. Status badges have correct colors.

#### `@sub:create` `#application` — J-ISUB-02: Create Submission (P1)
- **Action**: Click "New Submission". Fill in ingredient name, scientific name, CAS number, classification, source details, proposed names. Click Save.
- **Expected Result**: An `IngredientSubmission` record is created with `status=draft`. The user is redirected to the submission detail page. `createdById` is set.
- **Cross-System Check**: `IngredientSubmission` table has new row. `POST /api/ingredient-submissions` was called. `createdById` matches current user.

#### `@sub:strategy` `#application` — J-ISUB-03: Product Strategy (P2)
- **Action**: On a submission detail page, add a Product Strategy. Fill in product name, type, application class, dosage form.
- **Expected Result**: A `ProductStrategy` record is created linked to the submission. The strategy card appears showing planned product details.
- **Cross-System Check**: `ProductStrategy` table has new row with correct `submissionId`. `status=planned` by default.

---

## PAGE: Settings (/settings)

### Visual Elements
- API Key field (masked/dots in display mode)
- Export Path text field
- NHPID auto-refresh toggle
- API documentation links

### Journeys

#### `@settings:api-key` `#security` — J-SET-01: Save API Key (P0)
- **Action**: Navigate to `/settings`. Enter a Claude API key in the API Key field (e.g., `sk-ant-api03-xxxxxxxxxxxx`). Click Save.
- **Expected Result**: The key is saved to `AppSettings.claudeApiKey`. The display immediately masks the key (shows only last 4 characters, e.g., `sk-ant-...xxxx`). A success notification appears.
- **Cross-System Check**: `AppSettings` row updated with the full key stored. `GET /api/settings` returns the key MASKED (never the full key in GET responses). `PUT /api/settings` accepts the full key. `AuditLog` has "updated" entry (but does NOT log the actual key value in the changes field).

#### `@settings:key-mask` `#security` — J-SET-02: API Key Masking Security (P1)
- **Action**: After saving an API key, call `GET /api/settings` directly (via browser devtools or curl).
- **Expected Result**: The response contains a masked version of the key (e.g., `"claudeApiKey": "sk-ant-...xxxx"` or `"claudeApiKey": "****"`). The full key is NEVER returned in any GET response. Only the backend uses the full key for API calls.
- **Cross-System Check**: Open Network tab in browser devtools. Load the settings page. Inspect the API response body. The `claudeApiKey` field must NOT contain the full key. The full key is only in the database.

#### `@settings:export-path` `#ui` — J-SET-03: Export Path (P2)
- **Action**: Enter an export path (e.g., `C:\exports\npn-tool\`). Click Save.
- **Expected Result**: The path is saved to `AppSettings.exportPath`. Future exports use this path as the default save location (if applicable to the export mechanism).
- **Cross-System Check**: `AppSettings.exportPath` is updated in the database. The path is validated (not empty, accessible). If the path is invalid/inaccessible, a warning is shown.

---

## PAGE: Global Search (Ctrl+K)

### Visual Elements
- Modal overlay (dark backdrop)
- Search input field (auto-focused)
- Grouped results: Licences, Applications, Ingredients
- Each result shows entity type icon, name, and secondary info

### Journeys

#### `@search:ctrl-k` `#nav` — J-SRCH-01: Search by NPN (P0)
- **Action**: Press Ctrl+K to open global search. Type an NPN number (e.g., "80120933").
- **Expected Result**: The search modal opens with the input auto-focused. Results appear as you type (debounced). A licence with matching `licenceNumber` appears in the "Licences" group. Clicking the result navigates to `/licences` with that licence selected/highlighted.
- **Cross-System Check**: `GET /api/search?q=80120933` is called. The response includes matching entities across all types. `ActivityLog` has "search" entry with the query. The result links navigate to the correct page.

#### `@search:results` `#nav` — J-SRCH-02: Search by Product Name (P0)
- **Action**: Press Ctrl+K. Type a product name fragment (e.g., "omega" or "vitamin").
- **Expected Result**: Results appear from multiple entity types: licences with matching `productName`, applications with matching `productName`, ingredients with matching names. Results are grouped by entity type. Each result shows enough context to identify it.
- **Cross-System Check**: `GET /api/search?q=omega` returns cross-entity results. Each result has `entityType`, `id`, `name`, and `url` (or enough info to navigate). Results are relevant (no false matches).

#### `@search:keyboard` `#nav` `#electron` — J-SRCH-03: Keyboard Navigation (P1)
- **Action**: Open global search. Type a query that returns multiple results. Use arrow keys (Up/Down) to navigate results. Press Enter to select the highlighted result. Press Escape to close.
- **Expected Result**: Arrow keys move the highlight up and down through the results list. The highlighted item is visually distinct. Enter navigates to the highlighted result's page. Escape closes the modal and returns focus to the previous element.
- **Cross-System Check**: No mouse interaction needed for full navigation cycle. Focus management is correct (modal traps focus). Escape handler works even when input is focused.

#### `@search:empty` `#nav` `#edge` — J-SRCH-04: Empty Query Handling (P2)
- **Action**: Open global search. Leave the input empty or type a single character.
- **Expected Result**: No API call is made for empty queries. For very short queries (1-2 chars), either no results are shown or a minimum character message appears. No errors, no loading spinner stuck. The modal is still functional.
- **Cross-System Check**: Network tab shows no request for empty/too-short queries. No JavaScript errors in console. The search input remains responsive.

---

## CROSS-SYSTEM REGRESSION TESTS

> These tests verify that data flows correctly between multiple pages and systems. Run these after any significant code change.

### `@flow:import-to-export` `#data-flow` `#regression` — R-01: Import→Sync→Export Pipeline (P0)
- **Action**: (1) Import a new product via PDF upload (Tab 1). (2) Open detail panel, click Sync to enrich from LNHPD. (3) Export all licences as CSV.
- **Expected Result**: The CSV contains the imported product with LNHPD-enriched data: medicinal ingredients, claims, risks, and doses are populated columns (not empty).
- **Cross-System Check**: Open the CSV and verify: `medicinalIngredientsJson` column has ingredient data. `claimsJson` column has claim text. `risksJson` has risk entries. The NPN in the CSV matches the imported PDF. The `lnhpdId` column has an integer value.

### `@flow:dual-pdf-to-detail` `#data-flow` `#regression` — R-02: Multi-PDF→Detail Attachments (P0)
- **Action**: (1) Import 2 PDFs for the same NPN (e.g., IL + PL letters). (2) Click the row to open the detail panel. (3) Check the attachments section.
- **Expected Result**: Only 1 `ProductLicence` row exists for this NPN. The detail panel shows 2 attachments (IL and PL files). Both have View and Download buttons that work. File names match the original uploads.
- **Cross-System Check**: `ProductLicence` count for this NPN = 1. `Attachment` count for this licence ID = 2. Both files exist on disk. View opens each PDF correctly.

### `@flow:sync-to-hc-link` `#data-flow` `#regression` — R-03: Sync→Info Grid→HC Link (P0)
- **Action**: (1) Sync a product from LNHPD. (2) Verify all info grid fields are populated. (3) Click the "View on HC" link.
- **Expected Result**: After sync, all info grid fields show data (no "undefined" or blanks for synced fields). The HC link opens `https://health-products.canada.ca/lnhpd-bdpsnh/info?licence={NPN}&lang=en` and the Health Canada page loads the correct product.
- **Cross-System Check**: Compare each info grid field to the database record. Verify the HC URL uses the `licenceNumber` (8-digit NPN), not the internal ID. The HC page title or product name matches.

### `@flow:bulk-delete-cascade` `#data-flow` `#regression` — R-04: Bulk Delete→Dashboard→Export (P0)
- **Action**: (1) Note the dashboard "Total Licences" count. (2) Go to `/licences`, select 2 rows, bulk delete. (3) Return to dashboard. (4) Export CSV.
- **Expected Result**: Dashboard count decreased by 2. The CSV does not contain the deleted licences. The dashboard stats are immediately accurate (no caching lag).
- **Cross-System Check**: Dashboard count = previous count - 2. CSV row count = previous CSV rows - 2. The deleted NPNs do not appear anywhere in the CSV. `Attachment` table has no orphans for the deleted IDs.

### `@flow:search-to-sync` `#data-flow` `#nav` — R-05: Search→Detail→Sync (P1)
- **Action**: (1) Press Ctrl+K, search for a known NPN. (2) Click the search result to navigate to the licence. (3) Click Sync in the detail panel.
- **Expected Result**: Search finds the licence. Clicking navigates to `/licences` with the detail panel open for that product. Sync enriches the data. The panel updates with LNHPD data.
- **Cross-System Check**: `ActivityLog` has entries for: search, view (detail panel), sync. The synced data persists (reloading the page shows enriched data). No errors in the flow.

### `@flow:app-to-export` `#data-flow` `#application` — R-06: App→Documents→Export (P1)
- **Action**: (1) Create an application with 2+ medicinal ingredients and claims. (2) Generate all documents via the Documents tab. (3) Export the application as JSON.
- **Expected Result**: The exported JSON includes: application fields, `medicinalIngredients` array (2+ items), `claims` array, and `documents` array (with generated content). All nested data is complete.
- **Cross-System Check**: JSON `medicinalIngredients.length >= 2`. `documents.length` matches generated count. Each document has non-empty `content`. `claims` array has entries with `linkedIngredientIds` populated.

### `@flow:attachment-dedup` `#regression` `#edge` — R-07: Attachment Dedup Cross-Flow (P1)
- **Action**: (1) Import a product via PDF -- file `IL_80120933.pdf` is attached during import. (2) Open the detail panel, try uploading the same `IL_80120933.pdf` again. (3) Upload the same file to a DIFFERENT product via its detail panel.
- **Expected Result**: Step 2: Returns `_deduplicated: true`, no duplicate attachment created for Product A. Step 3: Attachment IS created for Product B (different entity), but response includes `_crossEntityWarning`.
- **Cross-System Check**: Product A: `Attachment` count = 1 (not 2). Product B: `Attachment` count = 1 (with warning). Total `Attachment` rows for `fileName=IL_80120933.pdf` = 2 (one per product). Both files exist on disk in separate directories.

### `@sec:role-enforcement` `#security` `#regression` — R-08: Auth Role Enforcement (P0)
- **Action**: (1) Create a user with `role=viewer` (or modify an existing user's role in the DB). (2) Log in as that user. (3) Attempt: import a licence, sync from LNHPD, delete a licence, upload an attachment.
- **Expected Result**: All mutation attempts return 403 Forbidden. The `requireEditor()` guard blocks the requests. The viewer can still: view licences, open detail panels, search, export. Read-only operations work normally.
- **Cross-System Check**: `POST /api/upload/process` returns 403. `POST /api/sync/lnhpd/{id}` returns 403. `DELETE /api/licences/{id}` returns 403. `POST /api/attachments` returns 403. `GET /api/licences` returns 200. `GET /api/search` returns 200.

### `@sync:data-integrity` `#sync` `#regression` — R-09: Data Integrity After Sync (P0)
- **Action**: (1) Import a product with data extracted from PDF (product name, dosage form, etc.). (2) Note the current values of all fields. (3) Sync from LNHPD.
- **Expected Result**: LNHPD data is merged/updated but does NOT null out existing fields. If LNHPD provides a field, it updates. If LNHPD does not provide a field (returns empty), the original PDF-extracted value is preserved. Attachments are completely untouched by sync.
- **Cross-System Check**: After sync: `productName` is updated to LNHPD value (or preserved if LNHPD value is empty). `licencePdfPath` is unchanged. `Attachment` records are unchanged. `medicinalIngredientsJson` is populated from LNHPD. No fields are set to `null` or empty string that previously had values.

### `@flow:empty-state-recovery` `#edge` `#regression` — R-10: Empty State Recovery (P1)
- **Action**: (1) Delete all products (bulk select all + delete). (2) Check `/licences` page (should show empty state). (3) Check `/dashboard` (counts should all be 0 for licences). (4) Import a new product.
- **Expected Result**: Step 2: Empty state component with import CTA is shown. Step 3: Dashboard "Total Licences" and "Active" cards show 0. Step 4: Import succeeds, table now shows 1 row, dashboard shows 1.
- **Cross-System Check**: After delete all: `ProductLicence` count = 0. After import: count = 1. Dashboard stats update correctly in both states. The empty state renders only when count = 0. No errors during the full cycle.

---

## API ENDPOINT TESTS `#api`

> Direct API testing for each endpoint. Use curl, Postman, or browser devtools.
> All tests in this section are tagged `#api`. Run `#api` to execute all API tests.

### `@api:crud-licences` `#api` — Licences

| Test ID | Endpoint | Method | Auth Required | Test Description | Expected Status | Key Assertions |
|---------|----------|--------|---------------|------------------|-----------------|----------------|
| API-L01 | `/api/licences` | POST | Editor | Create licence with valid data (licenceNumber, productName) | 201 | Record created, ID returned, `AuditLog` entry |
| API-L02 | `/api/licences` | POST | Editor | Missing required field (no productName) | 400 | Error message, no DB record |
| API-L03 | `/api/licences` | GET | Auth | List all licences | 200 | Array returned, count matches DB |
| API-L04 | `/api/licences/{id}` | GET | Auth | Get single licence | 200 | Full record with amendments |
| API-L05 | `/api/licences/{id}` | PUT | Editor | Update licence fields | 200 | Fields updated, `AuditLog` entry |
| API-L06 | `/api/licences/{id}` | DELETE | Editor | Delete licence | 200 | Record removed, cascade deletes amendments, `AuditLog` entry |
| API-L07 | `/api/licences/{id}` | DELETE | Viewer | Attempt delete as viewer | 403 | "Forbidden", no deletion |

### `@api:sync` `#api` `#sync` — Sync

| Test ID | Endpoint | Method | Auth Required | Test Description | Expected Status | Key Assertions |
|---------|----------|--------|---------------|------------------|-----------------|----------------|
| API-S01 | `/api/sync/lnhpd/{id}` | POST | Editor | Sync valid NPN | 200 | `lnhpdId` set, JSON fields populated |
| API-S02 | `/api/sync/lnhpd/{id}` | POST | Editor | Sync with invalid/non-existent licence ID | 404 | Error message, no DB changes |
| API-S03 | `/api/sync/lnhpd/{id}` | POST | Editor | Sync NPN not found in LNHPD | 200/404 | Error message, existing data preserved |
| API-S04 | `/api/sync/lnhpd/{id}` | POST | Editor | Sync when another record has same lnhpdId | 409/500 | Unique constraint handled, alert shown |

### `@api:attachments` `#api` — Attachments

| Test ID | Endpoint | Method | Auth Required | Test Description | Expected Status | Key Assertions |
|---------|----------|--------|---------------|------------------|-----------------|----------------|
| API-A01 | `/api/attachments` | POST | Editor | Upload valid file (FormData: file, entityType, entityId) | 201 | Attachment record created, file on disk |
| API-A02 | `/api/attachments` | POST | Editor | Upload file > 50MB | 400 | "File too large. Max 50MB." |
| API-A03 | `/api/attachments` | POST | Editor | Upload duplicate (same file, same entity) | 200 | Returns existing with `_deduplicated: true` |
| API-A04 | `/api/attachments` | POST | Editor | Upload file that exists on different entity | 201 | Created with `_crossEntityWarning` in response |
| API-A05 | `/api/attachments` | POST | Editor | Missing required fields | 400 | "file, entityType, and entityId required" |
| API-A06 | `/api/attachments` | GET | Auth | List attachments for entity | 200 | Array with `uploadedBy.name` included |
| API-A07 | `/api/attachments/{id}` | DELETE | Editor | Delete attachment | 200 | Record removed, file removed from disk |

### `@api:bulk-delete` `#api` `#security` — Bulk Delete

| Test ID | Endpoint | Method | Auth Required | Test Description | Expected Status | Key Assertions |
|---------|----------|--------|---------------|------------------|-----------------|----------------|
| API-BD01 | `/api/licences/bulk-delete` | POST | Editor | Delete array of valid IDs | 200 | All records removed, cascade deletes, `AuditLog` entries |
| API-BD02 | `/api/licences/bulk-delete` | POST | Editor | Empty array | 400 | Error "No IDs provided" or similar |
| API-BD03 | `/api/licences/bulk-delete` | POST | Editor | Array with non-existent IDs | 200 | Silently skips non-existent, deletes valid ones |
| API-BD04 | `/api/licences/bulk-delete` | POST | Viewer | Attempt as viewer | 403 | "Forbidden", no deletions |

### `@api:export` `#api` `#export` — Export

| Test ID | Endpoint | Method | Auth Required | Test Description | Expected Status | Key Assertions |
|---------|----------|--------|---------------|------------------|-----------------|----------------|
| API-E01 | `/api/licences/export` | GET | Auth | Export all as CSV | 200 | Content-Type: text/csv, 55 columns, all rows |
| API-E02 | `/api/licences/export?ids=x,y` | GET | Auth | Export filtered by IDs | 200 | Only requested IDs in CSV |
| API-E03 | `/api/licences/export-excel` | GET | Auth | Export as Excel | 200 | Content-Type: xlsx, 3 sheets |
| API-E04 | `/api/licences/{id}/export` | GET | Auth | Export single licence CSV | 200 | 1 data row, 55 columns |

### `@api:upload` `#api` `#import` — Upload / Process

| Test ID | Endpoint | Method | Auth Required | Test Description | Expected Status | Key Assertions |
|---------|----------|--------|---------------|------------------|-----------------|----------------|
| API-U01 | `/api/upload/process` | POST | Editor | Valid PDF upload | 200 | Extracted NPN, product name, preview data |
| API-U02 | `/api/upload/process` | POST | Editor | Corrupt/invalid PDF | 200/400 | Error in response, no crash |
| API-U03 | `/api/upload/process` | POST | Editor | Non-PDF file | 400 | Rejection or error in preview |
| API-U04 | `/api/upload/scan-folder` | POST | Editor | Valid server path, preview=true | 200 | Scan results, NO DB writes |
| API-U05 | `/api/upload/scan-folder` | POST | Editor | Invalid server path | 400/500 | Error message, path not found |
| API-U06 | `/api/upload/batch` | POST | Editor | Batch process multiple files | 200 | All files processed, grouped results |

### `@api:search` `#api` `#nav` — Search

| Test ID | Endpoint | Method | Auth Required | Test Description | Expected Status | Key Assertions |
|---------|----------|--------|---------------|------------------|-----------------|----------------|
| API-SR01 | `/api/search?q=80120933` | GET | Auth | Search by NPN | 200 | Matching licences in results |
| API-SR02 | `/api/search?q=omega` | GET | Auth | Search by name | 200 | Cross-entity results |
| API-SR03 | `/api/search?q=` | GET | Auth | Empty query | 200 | Empty results array, no error |
| API-SR04 | `/api/search?q=<script>` | GET | Auth | Special characters | 200 | Sanitized, no XSS, no SQL injection |

### `@api:auth` `#api` `#auth` — Auth

| Test ID | Endpoint | Method | Auth Required | Test Description | Expected Status | Key Assertions |
|---------|----------|--------|---------------|------------------|-----------------|----------------|
| API-AU01 | `/api/auth/login` | POST | None | Valid credentials | 200 | Session cookie set, user data returned |
| API-AU02 | `/api/auth/login` | POST | None | Invalid credentials | 401 | Error message, no cookie |
| API-AU03 | `/api/auth/login` | POST | None | Missing fields | 400 | Validation error |
| API-AU04 | `/api/auth/me` | GET | Auth | Valid session | 200 | User object (id, username, name, role) |
| API-AU05 | `/api/auth/me` | GET | None | No cookie / expired session | 401 | Unauthorized |
| API-AU06 | `/api/auth/register` | POST | None | First user registration | 201 | User created, session set |
| API-AU07 | `/api/auth/register` | POST | None | Register when users exist | 403 | Blocked (first-user only) |
| API-AU08 | `/api/auth/logout` | POST | Auth | Valid logout | 200 | Cookie cleared |

### Settings

| Test ID | Endpoint | Method | Auth Required | Test Description | Expected Status | Key Assertions |
|---------|----------|--------|---------------|------------------|-----------------|----------------|
| API-ST01 | `/api/settings` | GET | Auth | Get settings | 200 | API key is MASKED in response |
| API-ST02 | `/api/settings` | PUT | Editor | Save API key | 200 | Full key stored in DB, masked in response |

---

## DATA INTEGRITY CHECKS `#backup` `#regression`

> Run these periodically or after bulk operations to ensure database consistency.

### DI-01: No Orphaned Attachments
- **SQL Check**: `SELECT a.id, a.entityType, a.entityId FROM Attachment a LEFT JOIN ProductLicence pl ON a.entityId = pl.id AND a.entityType = 'licence' LEFT JOIN Application app ON a.entityId = app.id AND a.entityType = 'application' WHERE pl.id IS NULL AND app.id IS NULL`
- **Expected**: 0 rows. Every `Attachment.entityId` must reference a valid record in the corresponding parent table.
- **Disk Check**: List all files in `data/attachments/` directories. Every file should have a matching `Attachment` record. Every `Attachment.filePath` should point to an existing file on disk.

### DI-02: No Duplicate lnhpdId
- **SQL Check**: `SELECT lnhpdId, COUNT(*) as cnt FROM ProductLicence WHERE lnhpdId IS NOT NULL GROUP BY lnhpdId HAVING cnt > 1`
- **Expected**: 0 rows. The `lnhpdId` field has a `@unique` constraint in Prisma. If this query returns rows, there is a schema enforcement gap.
- **Fix**: If duplicates found, identify which record is correct and null out the duplicate's `lnhpdId`.

### DI-03: JSON Fields Valid
- **Check**: For every `ProductLicence` record, parse these fields as JSON:
  - `medicinalIngredientsJson` -- must parse as array
  - `nonMedIngredientsJson` -- must parse as array
  - `claimsJson` -- must parse as array
  - `risksJson` -- must parse as array
  - `dosesJson` -- must parse as array
  - `routesJson` -- must parse as array
- **Expected**: All parse successfully. No syntax errors. Default value is `"[]"` (empty array string), never `null` or `undefined`.
- **Also Check**: `Ingredient.synonyms`, `Ingredient.partsUsed`, `Ingredient.preparationTypes`, `Ingredient.safetyDataJson`, `Ingredient.dosingDataJson`, `Ingredient.nmiPurposes`, `Ingredient.suppliersJson`, `Ingredient.regulatoryStatusJson` -- all must parse as valid JSON.

### DI-04: Audit Trail Complete
- **Create Check**: For every `ProductLicence` created after a certain date, verify a matching `AuditLog` entry exists with `action=created` and `entityType=ProductLicence` and `entityId` matching.
- **Update Check**: For every `ProductLicence` where `updatedAt > createdAt`, verify an `AuditLog` entry with `action=updated` exists.
- **Delete Check**: Cross-reference `AuditLog` entries with `action=deleted` against the `ProductLicence` table. Deleted IDs should NOT exist in `ProductLicence`.
- **Activity Check**: For every file download or view action, verify an `ActivityLog` entry exists with `action=view` or `action=download`.
- **Expected**: Full coverage. No creates/updates/deletes without matching audit entries.

### DI-05: Session and Security Checks
- **Cookie Flags**: After login, inspect the session cookie in browser devtools:
  - `httpOnly` must be `true` (not accessible via JavaScript)
  - `SameSite` must be `lax` or `strict`
  - `Secure` should be `true` in production (HTTPS)
  - `Max-Age` or `Expires` should be ~30 days
- **No User IDs in URLs**: Verify no page URL contains user IDs as query parameters. User identification should only come from the session cookie.
- **API Key Masking**: `GET /api/settings` must never return the full `claudeApiKey`. Verify the response body masks or omits the full key.
- **Password Hashing**: `User.password` in the database must be a bcrypt hash (starts with `$2b$` or `$2a$`), never plaintext.

### DI-06: Cascade Delete Integrity
- **Check**: After deleting a `ProductLicence`, verify:
  - All `LicenceAmendment` rows with that `licenceId` are gone (onDelete: Cascade)
  - All `Attachment` rows with `entityType=licence` and `entityId=deletedId` are gone
  - Files on disk under `data/attachments/licence/{deletedId}/` are removed
- **Check**: After deleting an `Application`, verify:
  - All `MedicinalIngredient` rows with that `applicationId` are gone
  - All `NonMedicinalIngredient` rows are gone
  - All `Claim` rows are gone
  - All `DosageGroup` rows are gone
  - All `RiskInfo` rows are gone
  - All `GeneratedDocument` rows are gone
  - All `SupplierCOA` rows are gone
  - All `LNHPDPrecedent` rows are gone

### DI-07: Unique Constraint Enforcement
- **Attachment Uniqueness**: `@@unique([entityType, entityId, fileName])` -- attempt to insert a duplicate and verify Prisma throws a unique constraint error.
- **User Uniqueness**: `username @unique` -- attempt to register a duplicate username and verify rejection.
- **Ingredient NHPID Uniqueness**: `nhpidId @unique` -- attempt to import an ingredient with a duplicate NHPID ID and verify rejection.
- **Monograph NHPID Uniqueness**: `Monograph.nhpidId @unique` -- verify no duplicates.

---

## VISUAL REGRESSION CHECKLIST `#ui` `#electron`

> Quick checks for visual consistency when looking at screenshots.

| Page | Element | Check |
|------|---------|-------|
| Login | Form | Centered, fields aligned, button full-width |
| Dashboard | Stat cards | 5 cards in a row (or responsive grid), numbers readable |
| Dashboard | Activity feed | Scrollable, timestamps visible, no overflow |
| Licences | Table | Columns aligned, no horizontal scroll on 1080p+, status badges colored |
| Licences | Bulk toolbar | Appears above/below table, count visible, buttons accessible |
| Licences | Detail panel | Right-side, does not overlap table, scrollable content |
| Licences | Import modal | Tabs visible, drop zone has border, preview items readable |
| Applications | Tabbed editor | Tabs are clickable, active tab highlighted, form fields aligned |
| Company | Tabs | 3 tabs visible, content switches without page reload |
| Ingredients | Table | Sortable columns, type badges colored, search responsive |
| Settings | API key | Masked display, no plaintext visible |
| Global Search | Modal | Centered overlay, grouped results, keyboard navigation highlight visible |

---

## TEST DATA RECOMMENDATIONS

### Minimum Test Dataset
- 3+ `ProductLicence` records (1 active synced, 1 active unsynced, 1 non_active)
- 1+ `Application` with 2+ ingredients, claims, dosage groups, risks
- 5+ `Ingredient` records (mix of medicinal and non-medicinal)
- 2+ `Attachment` records per licence
- 1+ `Facility` and 2+ `TeamMember` records
- 1 `CompanyProfile` (auto-created with defaults)
- 1 `AppSettings` with Claude API key set

### NPN Numbers for Testing
- Use real NPNs for LNHPD sync tests (e.g., 80120933, 80034567)
- Use fake NPNs (e.g., 99999999) for "not found in LNHPD" tests
- Use consistent NPNs across related tests (import + sync + export pipeline)

### PDF Files for Testing
- Valid IL letter PDF (e.g., `IL_80120933.pdf`)
- Valid PL licence PDF (e.g., `PL_80120933.pdf`)
- Corrupt PDF (binary file renamed to .pdf)
- Non-PDF file (e.g., .txt renamed to .pdf)
- Large PDF (>20MB for upload limit tests)
- Very large file (>50MB for attachment limit tests)
