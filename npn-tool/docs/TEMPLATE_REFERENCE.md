# Template Reference — NPN Filing Tool

> Last updated: 2026-04-13
> Total templates: 8+ document types
> Generator file: `src/app/api/applications/[id]/generate/route.ts`
> Agent owner: DOCUMENTS (agents/documents.md)

---

## 1. Overview

The NPN Filing Tool generates regulatory documents for Health Canada PLA submissions. Documents are generated via Claude AI or Handlebars templates, and output is bilingual (EN + FR).

### Generation Flow
```
User clicks "Generate" (Tab 7: Review & Generate)
  → POST /api/applications/[id]/generate { documentType }
    → Load application data (all ingredients, claims, dosage, risk)
    → Load company profile
    → Switch on documentType:
        → Dedicated generator function (Claude AI or template)
        → OR fallback to generic Claude prompt
    → Save to GeneratedDocument table (status: "draft")
    → User reviews → approves or regenerates
```

---

## 2. Document Types

### Documents with Dedicated Generators

| # | documentType | Generator | Method | Source File |
|---|---|---|---|---|
| 1 | `cover_letter` | `generateCoverLetter()` | Claude AI | `src/lib/documents/cover-letter.ts` |
| 2 | `label_en` | `generateEnglishLabel()` | Claude AI | `src/lib/documents/label-generator.ts` |
| 3 | `label_fr` | `translateLabelToFrench()` | Claude AI (translation) | `src/lib/documents/label-generator.ts` |
| 4 | `safety_report` | `generateSafetyReport()` | Claude AI | `src/lib/documents/safety-efficacy.ts` |
| 5 | `efficacy_report` | `generateEfficacyReport()` | Claude AI | `src/lib/documents/safety-efficacy.ts` |
| 6 | `senior_attestation` | `generateSeniorAttestation()` | Template (no AI) | `src/app/api/applications/[id]/generate/route.ts` |
| 7 | `monograph_attestation` | `generateMonographAttestation()` | Template (no AI) | `src/app/api/applications/[id]/generate/route.ts` |
| 8 | `ingredient_specs` | `generateIngredientSpecs()` | Claude AI | `src/app/api/applications/[id]/generate/route.ts` |

### Generic Fallback
Any `documentType` not in the list above falls through to a generic Claude AI prompt:
```
"Generate a [documentType] document for product [productName] (Class [applicationClass]). Return in clean HTML format."
```

---

## 3. Document Details

### 3.1 Cover Letter (`cover_letter`)

**Purpose:** Formal cover letter accompanying the PLA submission to Health Canada.

**Generator:** `generateCoverLetter()` — Claude AI

**Input Data:**
| Field | Source |
|---|---|
| companyName | CompanyProfile.legalName |
| dbaName | CompanyProfile.dbaName |
| companyCode | CompanyProfile.companyCode |
| seniorOfficial | CompanyProfile.seniorOfficial |
| seniorTitle | CompanyProfile.seniorTitle |
| address, city, province, postalCode | CompanyProfile |
| email, phone | CompanyProfile |
| productName | Application.productName |
| applicationClass | Application.applicationClass |
| ingredientSummary | Concatenated: "ProperName Qty+Unit" for all medicinal ingredients |
| claimsSummary | Semicolon-joined claim texts |

**Output:** Formal HTML letter with company letterhead, product details, submission request.

**Prerequisite:** Company profile must be filled out.

---

### 3.2 English Label (`label_en`)

**Purpose:** Product label text in English (NHP labelling requirements).

**Generator:** `generateEnglishLabel()` — Claude AI

**Input Data:**
| Field | Source |
|---|---|
| productName | Application.productName |
| brandName | Application.brandName |
| dosageForm | Application.dosageForm |
| routeOfAdmin | Application.routeOfAdmin |
| medicinalIngredients | Array: { properName, commonName, quantity, quantityUnit } |
| nonMedicinalIngredients | Array: { ingredientName, purpose } |
| claims | Claims text array |
| dosageInstructions | (empty string — future improvement) |
| warnings | (empty array — future improvement) |
| companyName | "{legalName} ({dbaName})" |
| companyAddress | "{address}, {city}, {province} {postalCode}" |

**Output:** HTML label with all required NHP label sections (product name, DIN/NPN, ingredients table, claims, directions, cautions, company info).

---

### 3.3 French Label (`label_fr`)

**Purpose:** Product label text in French (bilingual requirement).

**Generator:** `translateLabelToFrench()` — Claude AI translation

**Input:** The content of the previously generated English label (`label_en`).

**Prerequisite:** English label (`label_en`) MUST be generated first. Returns error 400 if not.

**Output:** Full French translation of the English label HTML.

---

### 3.4 Safety Report (`safety_report`)

**Purpose:** Safety assessment for Health Canada — demonstrates product safety.

**Generator:** `generateSafetyReport()` — Claude AI

**Input Data:**
| Field | Source |
|---|---|
| productName | Application.productName |
| applicationClass | Application.applicationClass |
| ingredients | Array: { properName, commonName, scientificName, quantity, quantityUnit, monographName, monographCompliant } |
| claims | Claims text array |

**Output:** HTML safety report with ingredient safety profiles, interaction analysis, contraindications, and safety conclusion.

---

### 3.5 Efficacy Report (`efficacy_report`)

**Purpose:** Evidence of efficacy for Health Canada — demonstrates product works.

**Generator:** `generateEfficacyReport()` — Claude AI

**Input Data:** Same as safety report (ingredients + claims + application class).

**Output:** HTML efficacy report with evidence summaries, monograph references, and efficacy conclusion.

---

### 3.6 Senior Attestation (`senior_attestation`)

**Purpose:** Senior Official attestation letter — signed statement that all information is accurate.

**Generator:** `generateSeniorAttestation()` — Template (no AI needed)

**Input Data:** CompanyProfile (name, title, company) + Application (product name, class).

**Output:** Formatted HTML attestation letter. Template-based — consistent format every time.

---

### 3.7 Monograph Attestation (`monograph_attestation`)

**Purpose:** Declaration that the product complies with the attested monograph(s).

**Generator:** `generateMonographAttestation()` — Template (no AI needed)

**Input Data:** CompanyProfile + Application (includes monograph-compliant ingredient data).

**Output:** Formatted HTML monograph attestation. Template-based.

**Note:** Only applicable to Class I (Compendial) applications that reference monographs.

---

### 3.8 Ingredient Specifications (`ingredient_specs`)

**Purpose:** Detailed specifications for each medicinal ingredient — quality control document.

**Generator:** `generateIngredientSpecs()` — Claude AI

**Input Data:** Full application with all medicinal ingredients (including source, extract, potency, supplier, COA data).

**Output:** HTML ingredient specification tables with identity, purity, potency, and quality parameters.

---

## 4. Bilingual Requirements

**Hard Rule:** All regulatory documents submitted to Health Canada must be bilingual (English + French).

### How EN/FR is Handled

| Document | English | French |
|---|---|---|
| Cover Letter | Generated in English | Should be translated (not yet automated) |
| Label | Generated as `label_en` | Translated via `translateLabelToFrench()` → saved as `label_fr` |
| Safety Report | Generated in English | Should be translated (not yet automated) |
| Efficacy Report | Generated in English | Should be translated (not yet automated) |
| Attestations | English template | Should have FR version (not yet built) |
| Ingredient Specs | Generated in English | Should be translated (not yet automated) |

**Current gap:** Only labels have automated EN→FR translation. Other documents need manual translation or future automation.

---

## 5. Export Formats

### Application Export
- **Endpoint:** `POST /api/applications/[id]/export`
- **Output:** Folder of HTML files — one file per generated document
- **Naming:** `DOC_FILENAMES` mapping (e.g., `cover_letter` → `cover-letter.html`)
- **Location:** Configurable export path (AppSettings.exportPath)

### Licence CSV Export
- **Endpoint:** `GET /api/licences/export?format=csv`
- **Columns:** 55 columns covering all ProductLicence fields
- **Audit:** Every export logged with purpose and agent

### Licence Excel Export
- **Endpoint:** `GET /api/licences/export-excel`
- **Sheets:**
  1. Instructions — how to use the spreadsheet
  2. Data Definitions — column descriptions
  3. Licence Data — all licences with machine + display column names
- **Library:** SheetJS (xlsx 0.18)

### Licence JSON Export
- **Endpoint:** `GET /api/licences/export?format=json`
- **Output:** JSON array of licence objects

---

## 6. How to Add a New Template

### Step 1: Create the Generator Function
Create a new file in `src/lib/documents/` (e.g., `amendment-letter.ts`):
```typescript
export async function generateAmendmentLetter(data: {
  companyName: string;
  productName: string;
  amendmentType: string;
  // ... more fields
}): Promise<string> {
  // Option A: Use Claude AI
  const content = await askClaude(
    "You are a Health Canada NHP regulatory document expert.",
    `Generate an amendment letter for ${data.productName}...`,
    { maxTokens: 2000 }
  );
  return content;

  // Option B: Use Handlebars template
  // const template = Handlebars.compile(templateString);
  // return template(data);
}
```

### Step 2: Add to the Switch Statement
In `src/app/api/applications/[id]/generate/route.ts`:
```typescript
case "amendment_letter":
  content = await generateAmendmentLetter({
    companyName: company.legalName,
    productName: application.productName,
    amendmentType: "ingredient_change",
  });
  break;
```

### Step 3: Add Tests
Add test scenarios to `docs/TEST_JOURNEYS.md` with the `#export` tag.

### Step 4: Update Documentation
- Update this file (TEMPLATE_REFERENCE.md)
- Update `agents/documents.md` improvement queue
- Notify COMPLIANCE agent (via INBOUND IMPACT LOG) for regulatory review

---

## 7. Claude AI Configuration

| Setting | Value |
|---|---|
| Model | `claude-sonnet-4-6` |
| Max tokens | 2000-3000 per document |
| System prompt | Domain-specific per document type |
| API key | Stored in AppSettings.claudeApiKey |
| Wrapper | `src/lib/claude.ts` → `askClaude()` function |

---

## 8. Generated Document Lifecycle

```
pending → generating → draft → approved / rejected
                        ↑
                        └── regenerate (creates new version)
```

| Status | Meaning |
|---|---|
| pending | Placeholder created, generation not started |
| generating | AI is currently generating content |
| draft | Generated, awaiting review |
| approved | Reviewed and approved (records approver + timestamp) |
| rejected | Reviewed and rejected |

### Approval Tracking
- `approvedById` — User ID of approver
- `approvedAt` — Timestamp of approval
- `version` — Increments on regeneration

---

## 9. Future Improvements (from VISION.md)

| Item | Vision # | Status | Description |
|---|---|---|---|
| AI self-scrutiny | #10 | Not started | Claude reviews its own documents for compliance gaps before finalizing |
| COA parsing | #11 | Not started | Parse Certificate of Analysis PDFs via Claude Vision |
| Amendment templates | #4 | Not started | Templates for amendment submissions |
| IRN response template | #12 | Not started | Template for Information Request Notice responses |
| Monograph auto-population | #5 | Not started | Auto-fill template fields from matched monograph data |
| Full bilingual automation | — | Partial | Only labels have EN→FR. All docs need it. |
