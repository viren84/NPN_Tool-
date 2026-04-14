# API Reference — NPN Filing Tool

> Last updated: 2026-04-13
> Total routes: **53** across 14 domains
> Base URL: `http://127.0.0.1:3000/api`

---

## Authentication Levels

| Middleware | Who Can Access | Usage |
|---|---|---|
| **Public** | Anyone | Login, register, logout |
| **requireAuth** | All logged-in users | Read operations |
| **requireEditor** | Editor + Admin | Create, update operations |
| **requireAdmin** | Admin only | Delete, settings, audit, bulk sync |

## Standard Error Responses

| Code | Meaning |
|---|---|
| 200 | Success |
| 201 | Created |
| 400 | Bad request (missing/invalid fields) |
| 401 | Not authenticated |
| 403 | Forbidden (insufficient role) |
| 404 | Resource not found |
| 409 | Conflict (optimistic locking failure) |
| 422 | Unprocessable (e.g., unreadable PDF) |
| 500 | Server error |

---

## 1. Authentication (4 routes)

### POST /api/auth/login
- **Auth:** Public
- **Body:** `{ username, password }`
- **Response:** `{ id, username, name, role }` + sets `npn_session` httpOnly cookie
- **Errors:** 400 (missing fields), 401 (invalid credentials)

### POST /api/auth/register
- **Auth:** Public
- **Body:** `{ username, password (min 6 chars), name, email? }`
- **Response:** `{ id, username, name, role, isFirstUser }`
- **Notes:** First user becomes **admin**. Subsequent users are **editor**. Client cannot self-assign role.
- **Errors:** 400 (validation), 409 (username taken)

### GET /api/auth/me
- **Auth:** requireAuth
- **Response:** Current user object `{ id, username, name, role }`
- **Errors:** 401

### POST /api/auth/logout
- **Auth:** Public
- **Response:** `{ success: true }` + clears session cookie

---

## 2. Product Licences (9 routes)

### GET /api/licences
- **Auth:** requireAuth
- **Query:** `?q=search&status=active`
- **Response:** Array of ProductLicence objects with amendments
- **Notes:** Searchable by product name or licence number. Filterable by productStatus.

### POST /api/licences
- **Auth:** requireAuth (not viewer)
- **Body:** Single object or array for bulk import
  ```json
  { "productName": "...", "licenceNumber": "80000123", "dosageForm": "Capsule", ... }
  ```
- **Response:** Created object (single) or `{ created, skipped }` (bulk)
- **Errors:** 400 (validation)

### GET /api/licences/[id]
- **Auth:** requireAuth
- **Response:** Full ProductLicence with amendments
- **Errors:** 404

### PUT /api/licences/[id]
- **Auth:** requireEditor
- **Body:** Whitelisted fields only (LICENCE_FIELDS). Raw body never passed to Prisma.
- **Response:** Updated licence
- **Errors:** 403, 404

### DELETE /api/licences/[id]
- **Auth:** requireEditor
- **Response:** `{ success: true }`
- **Audit:** Logged in AuditLog

### POST /api/licences/bulk-delete
- **Auth:** requireEditor
- **Body:** `{ ids: ["uuid1", "uuid2", ...] }` (max 100)
- **Response:** `{ deleted: 5, errors: [], total: 5 }`
- **Errors:** 400 (empty/too many IDs)

### GET /api/licences/export
- **Auth:** requireAuth
- **Query:** `?format=csv&status=active&ids=uuid1,uuid2&purpose=quarterly_review&agent=viren`
- **Response:** JSON object or CSV file (55 columns)
- **Audit:** Every export logged with purpose and agent

### GET /api/licences/export-excel
- **Auth:** requireAuth
- **Response:** 3-sheet Excel file (SheetJS)
  - Sheet 1: Instructions
  - Sheet 2: Data Definitions
  - Sheet 3: Licence data (machine + display column names)
- **Audit:** Logged

### GET /api/licences/[id]/export
- **Auth:** requireAuth
- **Query:** `?format=json&purpose=review`
- **Response:** Single licence as JSON or 1-row CSV (55 columns)
- **Audit:** Logged

---

## 3. Applications — PLA Builder (17 routes)

### Core CRUD

#### GET /api/applications
- **Auth:** requireAuth
- **Response:** Array of applications with medicinalIngredients, documents count

#### POST /api/applications
- **Auth:** requireAuth (not viewer)
- **Body:** `{ productName (required), productConcept, applicationClass, dosageForm, routeOfAdmin }`
- **Notes:** All text fields sanitized with `sanitizeHtml()`

#### GET /api/applications/[id]
- **Auth:** requireAuth
- **Response:** Full application with ALL relations: medicinalIngredients, nonMedicinalIngredients, claims, dosageGroups, riskInfos, documents, supplierCOAs, lnhpdPrecedents

#### PUT /api/applications/[id]
- **Auth:** requireEditor
- **Body:** Whitelisted APPLICATION_FIELDS + optional `version` for optimistic locking
- **Errors:** 409 (version conflict)

### Medicinal Ingredients (Tab 2)

#### GET /api/applications/[id]/ingredients
- **Auth:** requireAuth
- **Response:** Array sorted by sortOrder

#### POST /api/applications/[id]/ingredients
- **Auth:** requireAuth (not viewer)
- **Body:** `{ properName, commonName, scientificName, quantity, quantityUnit, ... }`
- **Full fields:** nhpidName, casNumber, potency, potencyUnit, standardization, sourceMaterial, organismPart, extractType, extractSolvent, extractRatio, driedHerbEquiv, syntheticFlag, nanomaterialFlag, animalTissueFlag, animalSource, monographName, monographCompliant, supplierName, coaReference

#### PUT /api/applications/[id]/ingredients/[ingId]
- **Auth:** requireEditor

#### DELETE /api/applications/[id]/ingredients/[ingId]
- **Auth:** requireEditor

### Non-Medicinal Ingredients (Tab 3)

#### GET /api/applications/[id]/non-med-ingredients
- **Auth:** requireAuth

#### POST /api/applications/[id]/non-med-ingredients
- **Auth:** requireAuth (not viewer)
- **Body:** Single ingredient or `{ loadPreset: "Tablet|Capsule|Softgel|Liquid|Powder|Chewable Tablet" }`
- **Notes:** Presets auto-populate common excipients for the dosage form

#### PUT /api/applications/[id]/non-med-ingredients/[nmId]
- **Auth:** requireEditor

#### DELETE /api/applications/[id]/non-med-ingredients/[nmId]
- **Auth:** requireEditor

### Claims (Tab 4)

#### GET /api/applications/[id]/claims
- **Auth:** requireAuth

#### POST /api/applications/[id]/claims
- **Auth:** requireAuth (not viewer)
- **Body:** Single claim or array (bulk from monograph)
  ```json
  { "claimTextEn": "...", "claimTextFr": "...", "fromMonograph": true, "monographName": "...", "claimType": "health" }
  ```

#### PUT /api/applications/[id]/claims/[claimId]
- **Auth:** requireEditor

#### DELETE /api/applications/[id]/claims/[claimId]
- **Auth:** requireEditor

### Dosage Groups (Tab 5)

#### GET /api/applications/[id]/dosage
- **Auth:** requireAuth

#### POST /api/applications/[id]/dosage
- **Auth:** requireAuth
- **Body:** `{ population, ageRangeMin, ageRangeMax, minDose, maxDose, doseUnit, frequency, directions, withFood }`

#### PUT /api/applications/[id]/dosage/[dosageId]
- **Auth:** requireEditor

#### DELETE /api/applications/[id]/dosage/[dosageId]
- **Auth:** requireEditor

### Risk Information (Tab 6)

#### GET /api/applications/[id]/risk
- **Auth:** requireAuth

#### POST /api/applications/[id]/risk
- **Auth:** requireAuth
- **Body:** Single or array (bulk). Deduplicates on import.
  ```json
  { "riskType": "caution|warning|contraindication|adverse_reaction", "textEn": "...", "textFr": "...", "fromMonograph": true }
  ```

#### PUT /api/applications/[id]/risk/[riskId]
- **Auth:** requireEditor

#### DELETE /api/applications/[id]/risk/[riskId]
- **Auth:** requireEditor

### Document Generation (Tab 7)

#### POST /api/applications/[id]/generate
- **Auth:** requireAuth
- **Body:** `{ documentType: "cover_letter|label_en|label_fr|safety_report|efficacy_report|senior_attestation|monograph_attestation|ingredient_specs|..." }`
- **Document types with dedicated generators:**
  - `cover_letter` — Claude AI + company info template
  - `label_en` — English product label
  - `label_fr` — French translation of English label (requires `label_en` first)
  - `safety_report` — Safety assessment with ingredient data
  - `efficacy_report` — Efficacy evidence report
  - `senior_attestation` — Senior Official attestation (template)
  - `monograph_attestation` — Monograph compliance attestation (template)
  - `ingredient_specs` — Ingredient specifications
  - Any other type — falls through to generic Claude AI generation
- **Errors:** 400 (company profile not set), 500 (generation failed)

#### POST /api/applications/[id]/export
- **Auth:** requireAuth
- **Response:** `{ success, exportPath }` — exports all generated documents as HTML files to disk
- **Audit:** Logged

#### PUT /api/applications/[id]/documents/[docId]
- **Auth:** requireEditor
- **Notes:** Used to approve/reject documents. Sets approvedById and approvedAt when status = "approved"

### Research

#### POST /api/applications/[id]/research
- **Auth:** requireAuth
- **Response:** `{ recommendedClass, classReasoning, ... }` — AI researches ingredients and recommends application class
- **Uses:** Claude AI to analyze product concept and ingredients

---

## 4. Ingredient Knowledge Base (7 routes)

### GET /api/ingredients
- **Auth:** requireAuth
- **Query:** `?q=turmeric&type=medicinal&limit=50&offset=0`
- **Response:** `{ ingredients: [], total, limit, offset }`
- **Search fields:** properNameEn, commonNameEn, scientificName, nhpidName, casNumber

### POST /api/ingredients
- **Auth:** requireAuth (not viewer)
- **Body:** Single object or array (bulk)

### GET /api/ingredients/[id]
- **Auth:** requireAuth
- **Response:** Full ingredient with monographLinks

### PUT /api/ingredients/[id]
- **Auth:** requireAuth

### DELETE /api/ingredients/[id]
- **Auth:** requireAdmin
- **Notes:** Admin-only deletion

### POST /api/ingredients/import
- **Auth:** requireAuth (not viewer)
- **Body:** `{ format: "csv_rows", data: [...rows] }`
- **Response:** `{ created, skipped, errors }`

### GET /api/ingredients/export
- **Auth:** requireAuth
- **Query:** `?type=medicinal&format=csv`
- **Response:** JSON array or CSV file

---

## 5. Ingredient Submissions — NHPID (5 routes)

### GET /api/ingredient-submissions
- **Auth:** requireAuth
- **Response:** Array with productStrategies

### POST /api/ingredient-submissions
- **Auth:** requireAuth (not viewer)
- **Body:** `{ ingredientName (required), scientificName, casNumber, classification, productStrategies: [...] }`

### GET /api/ingredient-submissions/[id]
- **Auth:** requireAuth

### PUT /api/ingredient-submissions/[id]
- **Auth:** requireEditor

### DELETE /api/ingredient-submissions/[id]
- **Auth:** requireEditor

---

## 6. Attachments (4 routes)

### GET /api/attachments
- **Auth:** requireAuth
- **Query:** `?entityType=licence&entityId=uuid` (both required)
- **Response:** Array with uploadedBy user info

### POST /api/attachments
- **Auth:** requireEditor
- **Body:** multipart/form-data: `file` (max 50MB), `entityType`, `entityId`, `docCategory?`, `description?`
- **Response:** Created attachment. Flags: `_deduplicated`, `_crossEntityWarning`
- **Dedup:** Unique constraint on entityType + entityId + fileName

### GET /api/attachments/[id]
- **Auth:** requireAuth
- **Query:** `?inline=true` (browser preview) or no param (download)
- **Response:** File binary

### DELETE /api/attachments/[id]
- **Auth:** requireEditor
- **Notes:** Removes file from disk AND database record

---

## 7. Files (3 routes)

### GET /api/files/download
- **Auth:** requireAuth
- **Query:** `?path=/absolute/path/to/file`
- **Audit:** Download activity tracked

### GET /api/files/list
- **Auth:** requireAuth
- **Query:** `?path=/folder/path`
- **Response:** `[{ name, path, size, ext, modified }]`

### GET /api/files/view
- **Auth:** requireAuth
- **Query:** `?path=/absolute/path/to/file`
- **Notes:** Inline display (Content-Disposition: inline)
- **Audit:** View activity tracked

---

## 8. LNHPD Sync (2 routes)

### POST /api/sync/lnhpd
- **Auth:** requireAdmin
- **Body:** None
- **Response:** `{ synced, skipped, errors }`
- **Notes:** Bulk sync — iterates ALL licences, enriches from Health Canada LNHPD API. 300ms throttle, 6 parallel endpoints per licence.
- **Audit:** Logged

### POST /api/sync/lnhpd/[id]
- **Auth:** requireEditor
- **Body:** None
- **Response:** `{ success, message }`
- **Notes:** Single licence sync from LNHPD
- **Audit:** Logged

---

## 9. Upload & Document Processing (3 routes)

### POST /api/upload/process
- **Auth:** requireEditor
- **Body:** multipart/form-data: `file` (max 20MB), `context?` ("licence_pdf", "coa", "study", or auto-detect)
- **Response:**
  ```json
  {
    "fileName": "NPN-80000123.pdf",
    "fileSize": 245760,
    "textLength": 5200,
    "documentType": "licence_pdf",
    "confidence": 0.95,
    "extractedData": { "licenceNumber": "80000123", "productName": "...", ... },
    "warnings": []
  }
  ```
- **Notes:** Uses pdf-parse for text extraction, then Claude AI for structured data extraction

### POST /api/upload/batch
- **Auth:** requireEditor
- **Body:** multipart/form-data with indexed files: `file_0`, `file_1`, ... and optional paths: `path_0`, `path_1`, ...
- **Response:** `{ totalFiles, totalGroups, results: [{ folderName, fileCount, extractedData, status, error }] }`
- **Notes:** Groups PDFs by folder, processes each group together

### POST /api/upload/scan-folder
- **Auth:** requireEditor
- **Body:** `{ folderPath (required), preview? (boolean) }`
- **Security:** Path allowlist enforced — only ~/Downloads, ~/Documents, ~/Desktop, or app data/ directory
- **Response:** `{ folderPath, totalFolders, results, summary: { success, duplicates_archived, skipped, errors } }`
- **Errors:** 403 (forbidden path outside allowlist)

---

## 10. Company & Team (6 routes)

### GET /api/company
- **Auth:** requireAuth
- **Response:** CompanyProfile (auto-creates with defaults if missing)

### PUT /api/company
- **Auth:** requireEditor
- **Body:** Whitelisted COMPANY_FIELDS (all sanitized)

### GET /api/facilities
- **Auth:** requireAuth
- **Response:** Array of active facilities

### POST /api/facilities
- **Auth:** requireEditor

### PUT /api/facilities/[id]
- **Auth:** requireEditor

### DELETE /api/facilities/[id]
- **Auth:** requireEditor

### GET /api/team
- **Auth:** requireAuth

### POST /api/team
- **Auth:** requireEditor

### PUT /api/team/[id]
- **Auth:** requireEditor

### DELETE /api/team/[id]
- **Auth:** requireEditor

---

## 11. Settings & FAQ (3 routes)

### GET /api/settings
- **Auth:** requireAuth
- **Response:** AppSettings with Claude API key **masked** (`....{last4}`)

### PUT /api/settings
- **Auth:** requireAdmin
- **Body:** Any settings fields (claudeApiKey, exportPath, autoRefreshEnabled, etc.)

### POST /api/faq
- **Auth:** requireAuth
- **Body:** `{ question (required), context? }`
- **Response:** `{ answer, cached }` — uses Claude AI, caches in FaqCache table

---

## 12. Audit & Activity (4 routes)

### GET /api/audit-log
- **Auth:** requireAuth
- **Query:** `?entityType=licence&action=created`
- **Response:** Last 100 AuditLog entries

### GET /api/activity
- **Auth:** requireAdmin
- **Query:** `?limit=100&offset=0&userId=uuid&action=login&from=2026-01-01&to=2026-04-13`
- **Response:** `{ logs: [], total, limit, offset }` with user info

### GET /api/audit-reports
- **Auth:** requireAdmin
- **Response:** Last 12 AuditReport records

### POST /api/audit-reports
- **Auth:** requireAdmin
- **Body:** `{ periodStart?, periodEnd? }` (defaults: last 30 days)
- **Response:** Generated AuditReport with summaryJson, detailsJson, userBreakdown

---

## 13. Search (1 route)

### GET /api/search
- **Auth:** requireAuth
- **Query:** `?q=turmeric` (min 2 chars)
- **Response:** `{ query, results: [{ type, id, title, subtitle, href, status }], total }`
- **Searches across:** Licences, Applications, Ingredients, Ingredient Submissions

---

## 14. External API — Health Canada LNHPD

These are the external endpoints the tool consumes (read-only, no auth):

**Base URL:** `https://health-products.canada.ca/api/natural-licences`

| Endpoint | Purpose |
|---|---|
| `/productlicence/?lang=en&type=json&id={NPN}` | Search by NPN number |
| `/medicinalingredient/?lang=en&type=json&id={lnhpdId}` | Medicinal ingredients |
| `/nonmedicinalingredient/?lang=en&type=json&id={lnhpdId}` | Non-medicinal ingredients |
| `/productpurpose/?lang=en&type=json&id={lnhpdId}` | Claims/purposes |
| `/productrisk/?lang=en&type=json&id={lnhpdId}` | Risk information |
| `/productdose/?lang=en&type=json&id={lnhpdId}` | Dosage groups |
| `/productroute/?lang=en&type=json&id={lnhpdId}` | Routes of administration |

**Rate limiting:** 300ms self-imposed throttle between requests.
**Parallel:** 6 detail endpoints fetched simultaneously per licence.

---

## Route Count by Domain

| Domain | Routes |
|---|---|
| Authentication | 4 |
| Product Licences + Exports | 9 |
| Applications (PLA Builder) | 17 |
| Ingredient Knowledge Base | 7 |
| Ingredient Submissions (NHPID) | 5 |
| Attachments | 4 |
| Files | 3 |
| LNHPD Sync | 2 |
| Upload & Processing | 3 |
| Company & Team | 6 |
| Settings & FAQ | 3 |
| Audit & Activity | 4 |
| Search | 1 |
| **Total** | **53** (confirmed, matches source code) |
