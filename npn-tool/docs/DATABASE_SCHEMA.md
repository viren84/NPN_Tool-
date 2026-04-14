# Database Schema Reference — NPN Filing Tool

> Last updated: 2026-04-13
> Source of truth: `prisma/schema.prisma`
> Engine: SQLite via Prisma 7.7 + libsql adapter

---

## Overview

**31 models** organized across **11 domains**.
All data is local — SQLite file at `prisma/dev.db`. No cloud database.

### Quick Reference

| # | Domain | Models | Status |
|---|---|---|---|
| 1 | Users & Auth | User | Built |
| 2 | Company Profile | CompanyProfile, Facility, TeamMember | Built |
| 3 | Ingredient Knowledge Base | Ingredient, Monograph, IngredientMonographLink | Built (sync not wired) |
| 4 | Product Licences | ProductLicence, LicenceAmendment | Built |
| 5 | Ingredient Submissions | IngredientSubmission, ProductStrategy | Built |
| 6 | Applications (PLA) | Application, MedicinalIngredient, NonMedicinalIngredient, Claim, DosageGroup, RiskInfo, SupplierCOA, LNHPDPrecedent | Built |
| 7 | Generated Documents | GeneratedDocument | Built |
| 8 | Attachments | Attachment | Built |
| 9 | Audit & Activity | AuditLog, ActivityLog, AuditReport | Built |
| 10 | Settings | AppSettings, FaqCache | Built |
| 11 | Existing Products | ExistingProduct | Built |

---

## DOMAIN 1: Users & Auth

### User
Stores login credentials and user profile. First registered user becomes admin.

| Field | Type | Default | Notes |
|---|---|---|---|
| id | String (UUID) | auto | Primary key |
| username | String | — | **UNIQUE** |
| password | String | — | bcrypt(12) hashed. Never exposed in API responses. |
| name | String | — | Display name |
| email | String? | null | Optional |
| role | String | "editor" | **admin** / **editor** / **viewer** |
| createdAt | DateTime | now() | — |
| updatedAt | DateTime | auto | — |

**Relations:**
- → Application[] (created by this user)
- → AuditLog[] (actions by this user)
- → Attachment[] (files uploaded by this user)
- → ActivityLog[] (activity tracked)
- → GeneratedDocument[] (documents approved by this user)
- → IngredientSubmission[] (NHPID submissions created by this user)

**Security Notes:**
- Password is NEVER returned in any API response
- First user registered = admin role (cannot self-assign)
- Roles: **admin** (full access), **editor** (create/edit), **viewer** (read-only)

---

## DOMAIN 2: Company Profile

### CompanyProfile
Single company record. Defaults pre-filled for UV International Traders Inc.

| Field | Type | Default | Notes |
|---|---|---|---|
| id | String (UUID) | auto | Primary key |
| legalName | String | "UV International Traders Inc" | Legal entity name |
| dbaName | String | "Wellnessextract" | Doing business as |
| companyCode | String | "45028" | Health Canada company code |
| seniorOfficial | String | "Virender Dass" | Senior official name |
| seniorTitle | String | "CEO" | Title |
| address | String | "" | Street address |
| city | String | "" | City |
| province | String | "BC" | Province code |
| postalCode | String | "V2T 6H4" | Postal code |
| country | String | "Canada" | Country |
| phone | String | "" | Phone number |
| email | String | "" | Email |
| siteLicenceNumber | String | "" | Site licence number |
| qapName | String | "" | Quality Assurance Person name |
| qapQualifications | String | "" | QAP qualifications |
| epostRegistered | Boolean | false | Whether registered on ePost |
| createdAt / updatedAt | DateTime | auto | Timestamps |

### Facility
Warehouses, 3PLs, foreign manufacturing sites. Multi-facility support.

| Field | Type | Default | Notes |
|---|---|---|---|
| id | String (UUID) | auto | Primary key |
| facilityType | String | "warehouse" | **warehouse** / **3pl** / **foreign_manufacturer** / **foreign_packager** / **office** |
| name | String | — | Facility name |
| address, city, province, postalCode, country | String | "" / "Canada" | Location |
| phone, email | String | "" | Contact |
| siteLicenceNumber | String | "" | HC site licence |
| siteLicenceExpiry | String | "" | Expiry date |
| siteLicenceStatus | String | "" | **active** / **expired** / **pending** / **not_required** |
| activities | String (JSON) | "[]" | Array: "manufacturing", "packaging", "labelling", "importing", "storing" |
| gmpCertified | Boolean | false | GMP certified? |
| gmpCertExpiry | String | "" | GMP cert expiry |
| gmpAuditDate | String | "" | Last GMP audit |
| fsrn | String | "" | Foreign Site Reference Number |
| mraPicsCert | String | "" | MRA/PIC/S certificate reference |
| managerName, managerPhone, managerEmail, managerRole | String | "" | Facility manager |
| notes | String | "" | Free text |
| isActive | Boolean | true | Soft delete |
| createdAt / updatedAt | DateTime | auto | Timestamps |

### TeamMember
Company personnel. Tracks regulatory roles (QAP, Senior Official, etc.).

| Field | Type | Default | Notes |
|---|---|---|---|
| id | String (UUID) | auto | Primary key |
| name | String | — | Full name |
| role | String | "" | **ceo** / **regulatory** / **warehouse_manager** / **qap** / **hr** / **customer_service** / **compliance** |
| title | String | "" | Formal title |
| department | String | "" | Department name |
| phone, phoneExt, email | String | "" | Contact |
| facilityId | String | "" | Which facility they work at |
| isQAP | Boolean | false | Quality Assurance Person |
| isSeniorOfficial | Boolean | false | Senior Official for HC |
| isAuthorizedSignatory | Boolean | false | Can sign regulatory docs |
| isDPA | Boolean | false | Designated Party Authorization |
| isHCContact | Boolean | false | Primary HC contact |
| notes | String | "" | Free text |
| isActive | Boolean | true | Soft delete |
| createdAt / updatedAt | DateTime | auto | Timestamps |

---

## DOMAIN 3: Ingredient Knowledge Base

### Ingredient
Master ingredient database. Sources: NHPID, manual entry, CSV import, LNHPD.

| Field | Type | Default | Notes |
|---|---|---|---|
| id | String (UUID) | auto | Primary key |
| nhpidId | String? | null | **UNIQUE** — NHPID identifier |
| nhpidName | String | "" | Name from NHPID |
| ingredientType | String | "medicinal" | **medicinal** / **non_medicinal** / **homeopathic** |
| category | String | "" | Chemical Substance, Organism Substance, etc. |
| subCategory | String | "" | Sub-category |
| casNumber | String | "" | CAS registry number |
| unii | String | "" | FDA UNII code |
| schedule1 | Boolean | false | Is Schedule 1 item? |
| status | String | "active" | **active** / **archived** / **pending_review** / **restricted** |
| properNameEn / properNameFr | String | "" | Proper names (EN/FR) |
| commonNameEn / commonNameFr | String | "" | Common names (EN/FR) |
| scientificName | String | "" | Latin/scientific name |
| synonyms | String (JSON) | "[]" | Array of alternative names |
| molecularFormula, molecularWeight, chemicalClass, chemicalSubclass | String/Float? | "" | Chemical data |
| smiles, inchi | String | "" | Chemical structure codes |
| physicalForm, solubility, storageConditions | String | "" | Physical properties |
| organismType | String | "" | **plant** / **animal** / **fungus** / **algae** / **bacteria** / **mineral** |
| genus, species, family, authorCitation | String | "" | Taxonomy |
| partsUsed | String (JSON) | "[]" | Botanical parts |
| preparationTypes | String (JSON) | "[]" | Preparation methods |
| geographicalOrigin | String | "" | Origin |
| regulatoryStatusJson | String (JSON) | "{}" | Multi-jurisdiction: {canada, usa, eu, australia} |
| grasStatus | String | "" | **none** / **self_affirmed** / **fda_notified** |
| safetyDataJson | String (JSON) | "[]" | Safety information |
| dosingDataJson | String (JSON) | "[]" | Dose ranges |
| nmiPurposes | String (JSON) | "[]" | Non-medicinal purposes |
| allergenFlag | Boolean | false | Allergen? |
| allergenType | String | "" | Allergen type |
| suppliersJson | String (JSON) | "[]" | Supplier records |
| importedFrom | String | "" | **nhpid** / **manual** / **csv** / **lnhpd** |
| notes | String | "" | Free text |
| createdAt / updatedAt | DateTime | auto | Timestamps |

**Relations:** → IngredientMonographLink[]

### Monograph
Health Canada monographs. Scaffolded — sync NOT built yet (VISION #5).

| Field | Type | Default | Notes |
|---|---|---|---|
| id | String (UUID) | auto | Primary key |
| nhpidId | String | — | **UNIQUE** — NHPID monograph ID |
| name / nameFr | String | — / "" | EN/FR names |
| monographType | String | "single" | **single** / **combination** / **product_category** |
| version | String | "" | Version number |
| effectiveDate / lastRevised | String | "" | Dates |
| submissionClass | String | "" | **class_I** / **class_II** |
| status | String | "current" | **current** / **archived** / **draft** |
| claimsJson | String (JSON) | "[]" | [{textEn, textFr, isMandatory}] |
| doseRangesJson | String (JSON) | "{}" | {population: {min, max, unit}} |
| specificationsJson | String (JSON) | "{}" | Quality specs |
| cautionsJson, warningsJson, contraindicationsJson, adverseReactionsJson | String (JSON) | "[]" | Safety data |
| sourceRequirements / preparationRequirements | String | "" | Allowed sources/preparations |
| pdfPath / pdfUrl | String | "" | Monograph PDF location |
| lastUpdated / createdAt | DateTime | now() | Timestamps |

**Relations:** → IngredientMonographLink[]

### IngredientMonographLink
Junction table linking ingredients to their applicable monographs.

| Field | Type | Notes |
|---|---|---|
| id | String (UUID) | Primary key |
| ingredientId | String | FK → Ingredient (CASCADE delete) |
| monographId | String | FK → Monograph (CASCADE delete) |
| isCompliant | Boolean | Does ingredient meet monograph specs? |
| notes | String | Free text |
| createdAt | DateTime | Timestamp |

---

## DOMAIN 4: Product Licences

### ProductLicence
Approved NPN licences. Core data model — imported from PDFs and enriched from LNHPD.

| Field | Type | Default | Notes |
|---|---|---|---|
| id | String (UUID) | auto | Primary key |
| lnhpdId | String? | null | **UNIQUE** — LNHPD database ID |
| licenceNumber | String | — | 8-digit NPN (NOT unique — archived duplicates allowed) |
| licenceType | String | "npn" | **npn** / **din_hm** |
| productName / productNameFr | String | — / "" | Product names (EN/FR) |
| dosageForm | String | "" | Capsule, Tablet, Liquid, etc. |
| routeOfAdmin | String | "" | Oral, Topical, etc. |
| companyCode / companyName | String | "" | HC company info |
| applicationClass | String | "" | **I** / **II** / **III** (derived from LNHPD) |
| submissionType | String | "" | **Compendial** / **Traditional** / **Non-traditional** |
| attestedMonograph | Boolean | false | Attested to monograph? |
| hypothetical | Boolean | false | Hypothetical product flag |
| licenceDate, revisedDate, receiptDate | String | "" | Key dates |
| productStatus | String | "active" | **active** / **non_active** / **cancelled** / **suspended** |
| renewalDate / renewalStatus | String | "" / "current" | **current** / **pending** / **overdue** |
| internalStatus | String | "active" | **active** / **amendment_pending** / **needs_attention** |
| assignedTo | String | "" | Team member assigned |
| priority | String | "medium" | Priority level |
| medicinalIngredientsJson | String (JSON) | "[]" | Full MI data from LNHPD |
| nonMedIngredientsJson | String (JSON) | "[]" | NMI data |
| claimsJson | String (JSON) | "[]" | Claims data |
| risksJson | String (JSON) | "[]" | Risk info |
| dosesJson | String (JSON) | "[]" | Dosage groups |
| routesJson | String (JSON) | "[]" | Routes of admin |
| licencePdfPath / labelTextPath | String | "" | File paths |
| importedFrom | String | "" | **lnhpd** / **manual** / **pdf** / **csv** |
| notes | String | "" | Free text |
| createdAt / updatedAt | DateTime | auto | Timestamps |

**Relations:** → LicenceAmendment[]

### LicenceAmendment
Tracks amendments to existing NPN licences.

| Field | Type | Default | Notes |
|---|---|---|---|
| id | String (UUID) | auto | Primary key |
| licenceId | String | — | FK → ProductLicence (CASCADE delete) |
| amendmentType | String | — | **notification** / **amendment** / **new_pla_required** |
| changeType | String | "" | **ingredient_change** / **claim_change** / **label_change** / **site_change** |
| description | String | — | What changed |
| status | String | "draft" | **draft** / **submitted** / **under_review** / **approved** / **rejected** |
| submissionDate / approvalDate | String | "" | Key dates |
| documentPath | String | "" | Supporting document |
| notes | String | "" | Free text |
| createdAt / updatedAt | DateTime | auto | Timestamps |

---

## DOMAIN 5: Ingredient Submissions (NHPID)

### IngredientSubmission
For submitting new ingredients to Health Canada's NHPID.

| Field | Type | Default | Notes |
|---|---|---|---|
| id | String (UUID) | auto | Primary key |
| status | String | "draft" | **draft** / **submitted** / **under_review** / **approved** / **rejected** |
| ingredientName, scientificName, casNumber | String | — / "" | Identity |
| molecularFormula | String | "" | Formula |
| molecularWeight | Float? | null | Weight |
| classification | String | "medicinal" | **medicinal** / **non_medicinal** |
| schedule | String | "" | schedule_1_plant, schedule_1_vitamin, etc. |
| sourceOrganism, sourceOrganismLatin, sourcePart, extractionMethod | String | "" | Source data |
| proposedProperName / proposedCommonName | String | "" | Proposed names |
| grasStatus | String | "" | FDA GRAS status |
| otherJurisdictions | String (JSON) | "{}" | {usa, eu, australia} |
| evidencePackageJson | String (JSON) | "[]" | Studies/evidence |
| precedentIngredientsJson | String (JSON) | "[]" | Similar NHPID ingredients |
| nhpidRequestDate, nhpidExpectedDate, nhpidApprovalDate | String | "" | Tracking dates |
| nhpidId | String | "" | Assigned after approval |
| notes | String | "" | Free text |
| createdById | String | — | FK → User |
| createdAt / updatedAt | DateTime | auto | Timestamps |

**Relations:** → ProductStrategy[], → User (createdBy)

### ProductStrategy
Product plans linked to an ingredient submission.

| Field | Type | Default | Notes |
|---|---|---|---|
| id | String (UUID) | auto | Primary key |
| submissionId | String | — | FK → IngredientSubmission (CASCADE delete) |
| productName | String | — | Planned product name |
| productType | String | "single" | **single** / **combination** |
| applicationClass | String | "III" | Expected class |
| dosageForm / dosageAmount | String | "" | Formulation |
| combinationIngredients | String (JSON) | "[]" | Other ingredients |
| proposedClaims | String (JSON) | "[]" | Planned claims |
| targetTimeline | String | "" | When to file |
| status | String | "planned" | **planned** / **nhpid_pending** / **ready_to_file** / **filed** |
| applicationId | String? | null | Link to created Application |
| notes | String | "" | Free text |
| createdAt / updatedAt | DateTime | auto | Timestamps |

---

## DOMAIN 6: Applications (PLA)

### Application
The core PLA (Product Licence Application) builder. 7-tab interface.

| Field | Type | Default | Notes |
|---|---|---|---|
| id | String (UUID) | auto | Primary key |
| productName | String | — | Product name |
| brandName | String | "" | Brand/marketing name |
| applicationClass | String | "I" | **I** / **II** / **III** |
| applicationType | String | "Compendial" | **Compendial** / **Traditional** / **Non-traditional** |
| status | String | "draft" | Application status |
| dosageForm / routeOfAdmin | String | "" | Form and route |
| trackingNumber | String | "" | HC tracking number |
| productConcept / classReasoning | String | "" | Concept and class justification |
| animalTissue | Boolean | false | Contains animal tissue? |
| sterile | Boolean | false | Sterile product? |
| durationOfUse | String | "" | Duration of use |
| version | Int | 1 | Version counter |
| createdById | String | — | FK → User |
| createdAt / updatedAt | DateTime | auto | Timestamps |

**Relations:**
- → MedicinalIngredient[] (Tab 2)
- → NonMedicinalIngredient[] (Tab 3)
- → Claim[] (Tab 4)
- → DosageGroup[] (Tab 5)
- → RiskInfo[] (Tab 6)
- → GeneratedDocument[] (Tab 7 output)
- → SupplierCOA[]
- → LNHPDPrecedent[]

### MedicinalIngredient
Active ingredients in a PLA. Detailed regulatory data per ingredient.

| Field | Type | Default | Notes |
|---|---|---|---|
| id | String (UUID) | auto | Primary key |
| applicationId | String | — | FK → Application (CASCADE delete) |
| sortOrder | Int | 0 | Display order |
| nhpidName, properName, commonName, scientificName | String | "" | Names |
| casNumber | String | "" | CAS number |
| quantity | Float | 0 | Amount per dose |
| quantityUnit | String | "mg" | Unit |
| potency | Float? | null | Potency value |
| potencyUnit | String | "" | Potency unit |
| standardization | String | "" | Standardization details |
| sourceMaterial, organismPart | String | "" | Source |
| extractType, extractSolvent, extractRatio, driedHerbEquiv | String | "" | Extract details |
| syntheticFlag, nanomaterialFlag, animalTissueFlag | Boolean | false | Flags |
| animalSource | String | "" | Animal source if applicable |
| monographId | String? | null | Linked monograph |
| monographName | String | "" | Monograph name |
| monographCompliant | Boolean | false | Meets monograph specs? |
| supplierName, coaReference | String | "" | Supplier info |
| createdAt / updatedAt | DateTime | auto | Timestamps |

**Relations:** → SupplierCOA[]

### NonMedicinalIngredient
Excipients, fillers, coatings, etc.

| Field | Type | Default | Notes |
|---|---|---|---|
| id | String (UUID) | auto | Primary key |
| applicationId | String | — | FK → Application (CASCADE delete) |
| sortOrder | Int | 0 | Display order |
| ingredientName | String | — | Name |
| purpose | String | "" | Purpose (filler, coating, flavour, etc.) |
| quantity | Float? | null | Amount |
| unit | String | "" | Unit |
| animalTissueFlag, nanomaterialFlag | Boolean | false | Flags |
| createdAt / updatedAt | DateTime | auto | Timestamps |

### Claim
Health claims for the product. EN/FR bilingual.

| Field | Type | Default | Notes |
|---|---|---|---|
| id | String (UUID) | auto | Primary key |
| applicationId | String | — | FK → Application (CASCADE delete) |
| sortOrder | Int | 0 | Display order |
| claimTextEn / claimTextFr | String | — / "" | Bilingual claim text |
| fromMonograph | Boolean | false | From a monograph? |
| monographName | String | "" | Source monograph |
| linkedIngredientIds | String (JSON) | "[]" | Which ingredients support this claim |
| claimType | String | "health" | Claim type |
| selected | Boolean | true | Include in submission? |
| createdAt / updatedAt | DateTime | auto | Timestamps |

### DosageGroup
Dosage instructions per population group.

| Field | Type | Default | Notes |
|---|---|---|---|
| id | String (UUID) | auto | Primary key |
| applicationId | String | — | FK → Application (CASCADE delete) |
| sortOrder | Int | 0 | Display order |
| population | String | — | Target population (Adults, Children, etc.) |
| ageRangeMin / ageRangeMax | Int? | null | Age range |
| minDose / maxDose | Float? | null | Dose range |
| doseUnit | String | "" | Unit |
| frequency | String | "" | How often |
| directions | String | "" | Usage directions |
| withFood | Boolean | false | Take with food? |
| createdAt / updatedAt | DateTime | auto | Timestamps |

### RiskInfo
Cautions, warnings, contraindications, adverse reactions.

| Field | Type | Default | Notes |
|---|---|---|---|
| id | String (UUID) | auto | Primary key |
| applicationId | String | — | FK → Application (CASCADE delete) |
| sortOrder | Int | 0 | Display order |
| riskType | String | — | **caution** / **warning** / **contraindication** / **adverse_reaction** |
| textEn / textFr | String | — / "" | Bilingual text |
| fromMonograph | Boolean | false | From a monograph? |
| monographName | String | "" | Source monograph |
| createdAt / updatedAt | DateTime | auto | Timestamps |

### SupplierCOA
Certificate of Analysis from ingredient suppliers.

| Field | Type | Default | Notes |
|---|---|---|---|
| id | String (UUID) | auto | Primary key |
| applicationId | String | — | FK → Application (CASCADE delete) |
| ingredientId | String? | null | FK → MedicinalIngredient (optional) |
| supplierName | String | "" | Supplier name |
| parsedDataJson | String (JSON) | "{}" | Parsed COA data |
| originalFilePath / fileName | String | "" | File info |
| fileSize | Int | 0 | Bytes |
| createdAt | DateTime | auto | Timestamp |

### LNHPDPrecedent
Similar approved products found via LNHPD search. Used as precedent for new applications.

| Field | Type | Default | Notes |
|---|---|---|---|
| id | String (UUID) | auto | Primary key |
| applicationId | String | — | FK → Application (CASCADE delete) |
| lnhpdId | String | — | LNHPD product ID |
| licenceNumber | String | "" | NPN number |
| productName | String | "" | Product name |
| relevanceScore | Float | 0 | How relevant (0-1) |
| ingredientsMatchJson | String (JSON) | "{}" | Ingredient match details |
| createdAt | DateTime | auto | Timestamp |

---

## DOMAIN 7: Generated Documents

### GeneratedDocument
AI-generated regulatory documents from the 11 Handlebars templates.

| Field | Type | Default | Notes |
|---|---|---|---|
| id | String (UUID) | auto | Primary key |
| applicationId | String | — | FK → Application (CASCADE delete) |
| documentType | String | — | Template type (cover_letter, ingredient_table, etc.) |
| status | String | "pending" | **pending** / **generated** / **approved** / **rejected** |
| content | String | "" | Generated HTML/text content |
| filePath | String | "" | Saved file path |
| version | Int | 1 | Version counter |
| approvedById | String? | null | FK → User (who approved) |
| approvedAt | DateTime? | null | When approved |
| createdAt / updatedAt | DateTime | auto | Timestamps |

---

## DOMAIN 8: Attachments

### Attachment
Polymorphic file storage — attached to any entity type.

| Field | Type | Default | Notes |
|---|---|---|---|
| id | String (UUID) | auto | Primary key |
| entityType | String | — | **licence** / **application** / **ingredient** / **submission** |
| entityId | String | — | ID of parent entity |
| fileName | String | — | File name |
| fileType | String | "" | **pdf** / **xlsx** / **docx** / **jpg** / etc. |
| fileSize | Int | 0 | Bytes |
| filePath | String | — | Local file path (data/attachments/<entityType>/<entityId>/) |
| docCategory | String | "other" | **coa** / **supplier_spec** / **hc_letter** / **il_letter** / **pl_licence** / **invoice** / **label** / **study** / **other** |
| description | String | "" | Description |
| tags | String (JSON) | "[]" | Tags for categorization |
| uploadedById | String | — | FK → User |
| createdAt / updatedAt | DateTime | auto | Timestamps |

**Constraints:** `@@unique([entityType, entityId, fileName])` — prevents duplicate file names per entity.

**File Storage:** `data/attachments/<entityType>/<entityId>/<fileName>`

---

## DOMAIN 9: Audit & Activity

### AuditLog
Data change tracking — who changed what, when, with before/after values.

| Field | Type | Default | Notes |
|---|---|---|---|
| id | String (UUID) | auto | Primary key |
| userId | String | — | FK → User |
| action | String | — | create / update / delete |
| entityType | String | — | Which model was changed |
| entityId | String | — | Which record |
| details | String | "" | Human-readable description |
| changes | String (JSON) | "{}" | Before/after values |
| createdAt | DateTime | auto | **Append-only — no delete API** |

### ActivityLog
Granular user activity tracking — views, clicks, downloads, searches.

| Field | Type | Default | Notes |
|---|---|---|---|
| id | String (UUID) | auto | Primary key |
| userId | String | — | FK → User |
| action | String | — | **view** / **click** / **download** / **upload** / **search** / **login** / **logout** / **export** |
| entityType | String | "" | What was acted on |
| entityId | String | "" | Which record |
| entityName | String | "" | Human-readable name |
| pagePath | String | "" | URL path |
| details | String | "" | Additional context |
| ipAddress | String | "" | Client IP |
| userAgent | String | "" | Browser/client info |
| createdAt | DateTime | auto | **Append-only — no delete API** |

### AuditReport
Generated monthly/weekly audit summaries for Aman's review.

| Field | Type | Default | Notes |
|---|---|---|---|
| id | String (UUID) | auto | Primary key |
| reportType | String | "monthly" | **monthly** / **weekly** / **custom** |
| periodStart / periodEnd | DateTime | — | Report period |
| summaryJson | String (JSON) | "{}" | {totalLogins, totalViews, totalDownloads, etc.} |
| detailsJson | String (JSON) | "[]" | Full activity breakdown |
| userBreakdown | String (JSON) | "{}" | Per-user activity counts |
| status | String | "generated" | **generated** / **reviewed** / **archived** |
| generatedAt | DateTime | now() | When generated |
| reviewedById | String? | null | Who reviewed |
| reviewedAt | DateTime? | null | When reviewed |

---

## DOMAIN 10: Settings

### AppSettings
Application configuration. Single record (id = "default").

| Field | Type | Default | Notes |
|---|---|---|---|
| id | String | "default" | **Always "default"** — single record |
| claudeApiKey | String | "" | Anthropic API key (masked in GET response) |
| nhpidLastRefresh | DateTime? | null | Last NHPID data refresh |
| lnhpdLastRefresh | DateTime? | null | Last LNHPD sync |
| autoRefreshEnabled | Boolean | true | Auto-refresh on? |
| exportPath | String | "" | Default export directory |
| createdAt / updatedAt | DateTime | auto | Timestamps |

### FaqCache
Cached FAQ answers for the help system.

| Field | Type | Default | Notes |
|---|---|---|---|
| id | String (UUID) | auto | Primary key |
| question | String | — | **UNIQUE** — the question |
| answer | String | — | Cached answer |
| category | String | "general" | Category |
| createdAt | DateTime | auto | Timestamp |

---

## DOMAIN 11: Existing Products

### ExistingProduct
Imported product records (quick reference, not full licence data).

| Field | Type | Default | Notes |
|---|---|---|---|
| id | String (UUID) | auto | Primary key |
| npnNumber | String | — | **UNIQUE** — NPN number |
| productName | String | — | Product name |
| licenceStatus | String | "active" | Licence status |
| applicationClass | String | "" | Class I/II/III |
| licenceNumber | String | "" | Licence number |
| importedFrom | String | "" | Import source |
| createdAt / updatedAt | DateTime | auto | Timestamps |

---

## Relationship Diagram

```
User ──────────────┬──→ Application ──────┬──→ MedicinalIngredient ──→ SupplierCOA
                   │                      ├──→ NonMedicinalIngredient
                   │                      ├──→ Claim
                   │                      ├──→ DosageGroup
                   │                      ├──→ RiskInfo
                   │                      ├──→ GeneratedDocument
                   │                      ├──→ SupplierCOA
                   │                      └──→ LNHPDPrecedent
                   │
                   ├──→ AuditLog
                   ├──→ ActivityLog
                   ├──→ Attachment (polymorphic)
                   ├──→ IngredientSubmission ──→ ProductStrategy
                   └──→ GeneratedDocument (approved by)

ProductLicence ──→ LicenceAmendment

Ingredient ──→ IngredientMonographLink ←── Monograph

CompanyProfile (standalone)
Facility (standalone)
TeamMember (standalone)
AppSettings (singleton)
FaqCache (standalone)
AuditReport (standalone)
ExistingProduct (standalone)
```

---

## JSON Field Reference

Many fields store structured data as JSON strings (SQLite limitation). Here's what each JSON field contains:

| Model | Field | Structure |
|---|---|---|
| Facility | activities | `["manufacturing", "packaging", "labelling"]` |
| Ingredient | synonyms | `["name1", "name2"]` |
| Ingredient | partsUsed | `["root", "leaf", "seed"]` |
| Ingredient | preparationTypes | `["extract", "powder", "tincture"]` |
| Ingredient | regulatoryStatusJson | `{canada: {}, usa: {}, eu: {}}` |
| Ingredient | safetyDataJson | `[{type, text, source}]` |
| Ingredient | dosingDataJson | `[{population, min, max, unit}]` |
| Ingredient | suppliersJson | `[{name, country, certifications}]` |
| Monograph | claimsJson | `[{textEn, textFr, isMandatory}]` |
| Monograph | doseRangesJson | `{population: {min, max, unit}}` |
| ProductLicence | medicinalIngredientsJson | Full MI data from LNHPD |
| ProductLicence | claimsJson | Claims from LNHPD |
| Claim | linkedIngredientIds | `["uuid1", "uuid2"]` |
| SupplierCOA | parsedDataJson | Parsed COA test results |
| AuditReport | summaryJson | `{totalLogins, totalViews, ...}` |
| AuditReport | userBreakdown | `{userId: {logins, views, ...}}` |

---

## Migration Notes

- **Engine:** Prisma 7.7 with libsql adapter
- **Command:** `npx prisma migrate dev` (development), `npx prisma migrate deploy` (production)
- **Schema file:** `prisma/schema.prisma` (single source of truth)
- **Database file:** `prisma/dev.db` (local SQLite)
- **Auto-create:** Prisma creates the database on first run
- **Backup:** Copy `prisma/dev.db` + `data/attachments/` folder
