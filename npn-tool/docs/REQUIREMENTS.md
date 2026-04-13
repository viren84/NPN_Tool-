# Product Requirements Document — NPN Filing Tool
**Last Updated:** 2026-04-12
**Version:** 1.0
**Updated By:** Claude (automated)

## Product Overview
AI-powered 360° Health Canada NHP regulatory management platform for UV International Traders Inc (DBA Wellnessextract). Handles NPN filing, licence management, ingredient knowledge base, and NHPID submissions.

## Tech Stack
- Next.js 16 + TypeScript + Tailwind CSS
- Electron (desktop app wrapper)
- SQLite via Prisma ORM (local database)
- Claude API (AI document generation, PDF extraction, translation)
- Health Canada LNHPD REST API

---

## Modules & Features

### 1. Authentication & Users
| Feature | Status | Page |
|---------|--------|------|
| Login with username/password | ✅ Done | `/login` |
| User registration (first user = admin) | ✅ Done | `/login` |
| Role-based access (admin/editor/viewer) | ✅ Done | All pages |
| Logout button in sidebar | ✅ Done | Sidebar |
| Session management via cookies | ✅ Done | Server-side |

### 2. Dashboard
| Feature | Status | Page |
|---------|--------|------|
| Stats cards (applications, licences, ingredients, submissions) | ✅ Done | `/dashboard` |
| Recent applications list | ✅ Done | `/dashboard` |
| Activity feed (cleaned, no spam) | ✅ Done | `/dashboard` |
| Quick "New PLA Application" button | ✅ Done | `/dashboard` |
| Ctrl+K global search | ✅ Shell | `/dashboard` |

### 3. PLA Applications (NPN Filing)
| Feature | Status | Page |
|---------|--------|------|
| Create new PLA application | ✅ Done | `/applications/new` |
| Tabbed application editor (7 tabs) | ✅ Done | `/applications/[id]` |
| AI ingredient research (Claude API) | ✅ Done | Ingredients tab |
| Add/edit/delete medicinal ingredients | ✅ Done | Ingredients tab |
| Non-medicinal ingredients with presets | ✅ Done | Non-Med tab |
| Claims editor (monograph + custom) | ✅ Done | Claims tab |
| Dosage editor (population groups) | ✅ Done | Claims tab |
| Risk information editor (4 categories) | ✅ Done | Risk tab |
| Auto-detect application class (I/II/III) | ✅ Done | Overview tab |
| Submission readiness score (%) | ✅ Done | Overview tab |
| Document generation (11 types) | ✅ Done | Documents tab |
| Bilingual labels (EN + FR via AI) | ✅ Done | Documents tab |
| Document preview, edit, approve | ✅ Done | Documents tab |
| Generate All documents button | ✅ Done | Documents tab |
| Package assembly + export | ✅ Done | Package tab |
| ePost Connect submission instructions | ✅ Done | Package tab |

### 4. Active Licences Management
| Feature | Status | Page |
|---------|--------|------|
| Import via single PDF | ✅ Done | `/licences` modal |
| Import via folder selection | ✅ Done | `/licences` modal |
| Import via server folder scan | ✅ Done | `/licences` modal |
| AI extraction from IL + PL PDFs | ✅ Done | Auto on import |
| Duplicate detection + skip | ✅ Done | Shows "skipped" |
| Duplicate archiving | ✅ Done | Archives old, keeps new |
| Search by NPN or product name | ✅ Done | `/licences` |
| Click-to-open detail panel | ✅ Done | Right slide-out |
| Detail: product info grid | ✅ Done | Detail panel |
| Detail: medicinal ingredients | ✅ Done | Detail panel |
| Detail: approved claims | ✅ Done | Detail panel |
| Detail: dosage information | ✅ Done | Detail panel |
| Detail: risk information | ✅ Done | Detail panel |
| Detail: source files (IL/PL) with download | ✅ Done | Detail panel |
| Detail: attached documents with upload | ✅ Done | Detail panel |
| Export single licence (JSON/CSV) | ✅ Done | Detail panel buttons |
| Export all licences (JSON/CSV) | ✅ Done | `/api/licences/export` |
| Inline delete with confirm | ✅ Done | Table actions |
| Archived rows sorted to bottom + dimmed | ✅ Done | Table |
| LNHPD per-product sync (6 HC endpoints) | ✅ Done | Detail panel sync button |
| Auto-enrich from LNHPD on every import | ✅ Done | Auto on import |
| Multi-file NPN consolidation (2 PDFs → 1 product) | ✅ Done | Import modal |
| Info grid with full LNHPD enrichment (4 rows) | ✅ Done | Detail panel |
| Responsive detail panel (flex, independent scroll) | ✅ Done | Detail panel |
| "View on HC" link per product | ✅ Done | Detail panel |
| 3-sheet Excel export (summary, ingredients, claims) | ✅ Done | `/api/licences/export-excel` |
| Global search (Ctrl+K) across all entities | ✅ Done | `GlobalSearch.tsx` |
| Bulk sync all licences from LNHPD | ✅ Done | `/api/sync/lnhpd` |

### 5. Ingredient Knowledge Base
| Feature | Status | Page |
|---------|--------|------|
| Search ingredients | ✅ Done | `/ingredients` |
| Import from CSV | ✅ Done | `/ingredients` |
| Export to CSV | ✅ Done | `/ingredients` |
| Filter by type (medicinal/non-medicinal) | ✅ Done | `/ingredients` |
| Delete ingredient | ✅ Done | `/ingredients` |
| Full data model (200+ fields) | ✅ Schema | DB ready |

### 6. NHPID Ingredient Submissions
| Feature | Status | Page |
|---------|--------|------|
| Create new submission | ✅ Done | `/ingredient-submissions` |
| Sample data (GG) for testing | ✅ Done | `/ingredient-submissions` |
| Evidence package (study list) | ✅ Done | Submission data |
| Precedent ingredients | ✅ Done | Submission data |
| Product strategy planning | ✅ Done | Linked strategies |
| Submission status tracking | ✅ Done | Status field |

### 7. Company Profile
| Feature | Status | Page |
|---------|--------|------|
| Company info (name, DBA, HC code, address) | ✅ Done | `/company` tab 1 |
| Regulatory info (senior official, QAP, site licence) | ✅ Done | `/company` tab 1 |
| ePost Connect registration status | ✅ Done | `/company` tab 1 |
| Facilities (warehouse, 3PL, foreign sites) | ✅ Done | `/company` tab 2 |
| Facility details (address, site licence, GMP, manager) | ✅ Done | `/company` tab 2 |
| Foreign site FSRN field | ✅ Done | `/company` tab 2 |
| Team members (name, role, title, department, contact) | ✅ Done | `/company` tab 3 |
| Regulatory role badges (QAP, Senior Official, HC Contact) | ✅ Done | `/company` tab 3 |
| Add/edit/delete facilities and team members | ✅ Done | `/company` tabs 2-3 |
| Pre-seeded with Wellnessextract data | ✅ Done | Auto-populated |

### 8. Settings
| Feature | Status | Page |
|---------|--------|------|
| Claude API key (show/hide, save) | ✅ Done | `/settings` |
| Default export path | ✅ Done | `/settings` |
| NHPID auto-refresh toggle | ✅ Done | `/settings` |
| REST API documentation | ✅ Done | `/settings` |

### 9. Security & Audit
| Feature | Status | Notes |
|---------|--------|-------|
| Activity tracking (all views, downloads, exports) | ✅ Done | ActivityLog table |
| Audit logging (all data changes) | ✅ Done | AuditLog table |
| Monthly audit report generation | ✅ Done | `/api/audit-reports` |
| Admin-only access to logs/reports | ✅ Done | `requireAdmin()` guard |
| Field whitelisting on all PUT routes | ✅ Done | Prevents injection |
| Input sanitization | ✅ Done | XSS prevention |
| File upload size limits | ✅ Done | 50MB max |
| Document attachments per entity | ✅ Done | Attachment table |
| Cross-entity attachment duplicate warning | ✅ Done | Non-blocking `_crossEntityWarning` |
| Unique constraint on attachment (entity+filename) | ✅ Done | `@@unique` in Prisma |

### 10. API Hub (External Access)
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/applications` | GET/POST | Auth | List/create PLA applications |
| `/api/applications/[id]` | GET/PUT | Auth | Get/update application |
| `/api/licences` | GET/POST | Auth | List/create licences |
| `/api/licences/[id]` | GET/PUT/DELETE | Auth | Manage licence |
| `/api/licences/[id]/export` | GET | Auth+Log | Export single licence (JSON/CSV) |
| `/api/licences/export` | GET | Auth+Log | Bulk export all licences |
| `/api/ingredients` | GET/POST | Auth | Ingredient knowledge base |
| `/api/ingredients/import` | POST | Editor | Bulk CSV import |
| `/api/ingredients/export` | GET | Auth | Export ingredients |
| `/api/company` | GET/PUT | Auth | Company profile |
| `/api/facilities` | GET/POST | Auth | Facilities CRUD |
| `/api/team` | GET/POST | Auth | Team members CRUD |
| `/api/attachments` | GET/POST | Auth | Document attachments |
| `/api/attachments/[id]` | GET/DELETE | Auth | Download/delete |
| `/api/files/list` | GET | Auth | List files in folder |
| `/api/files/download` | GET | Auth+Log | Download file |
| `/api/activity` | GET | Admin | Activity logs |
| `/api/audit-reports` | GET/POST | Admin | Audit reports |
| `/api/upload/process` | POST | Editor | Single PDF extraction |
| `/api/upload/batch` | POST | Editor | Batch PDF extraction |
| `/api/upload/scan-folder` | POST | Editor | Server-side folder scan |
| `/api/faq` | POST | Auth | AI FAQ (cached) |

---

## Database Tables (25)
User, CompanyProfile, Facility, TeamMember, Ingredient, Monograph, IngredientMonographLink, ProductLicence, LicenceAmendment, IngredientSubmission, ProductStrategy, Application, MedicinalIngredient, NonMedicinalIngredient, Claim, DosageGroup, RiskInfo, SupplierCOA, GeneratedDocument, LNHPDPrecedent, ExistingProduct, AuditLog, ActivityLog, AuditReport, Attachment, AppSettings, FaqCache

---

## Pending / Future Features
- [x] ~~Global search connected to real DB data~~ — DONE (Ctrl+K, `/api/search`)
- [x] ~~LNHPD sync service~~ — DONE (per-product + bulk sync, auto-enrich on import)
- [ ] Product Pipeline section (pre-NPN products tracked by name, not NPN)
- [ ] Product status stages (15-stage lifecycle from Research to Active)
- [ ] Dr. Naresh review workflow (compliance role, submission queue, approval chain)
- [ ] Amendment lifecycle tracking (LicenceAmendment → review → HC submission)
- [ ] Secure Vault (owner-only documents, per-person sharing, Recipe Exposed list)
- [ ] Tool 2 read-only API endpoints (product data for Shopify, Amazon, 3PL, marketing)
- [ ] Multi-company support (consultant manages 20+ company portfolios)
- [ ] Monthly NHPID monograph sync and local replica
- [ ] Local-first ingredient research (check DB before Claude)
- [ ] Monograph CRUD with PDF import
- [ ] Site Licence Management module
- [ ] Existing product import from SharePoint Excel
- [ ] COA upload with AI parsing (Claude Vision)
- [ ] IRN response workflow (Health Canada questions tracking)
- [ ] AI self-scrutiny step for application drafts
- [ ] Email integration for document sharing
- [ ] Pagination on large tables
- [ ] Test framework (vitest) + automated tests
