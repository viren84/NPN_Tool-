# NPN Filing Tool — Product Vision & Master Plan

> **Company**: UV International Traders Inc (DBA Wellnessextract) | **Code**: 45028
> **Tool**: Regulatory & Product Development Platform for Natural Health Products
> **Version**: 1.0 (Development) | **Last Updated**: 2026-04-12

---

## What This Tool Is

A **secure, centralized regulatory and product development platform** for natural health product companies. It manages the entire lifecycle of a product — from the moment a molecule is being researched, through NPN filing with Health Canada, all the way to handing off a complete product package to the production and launch team.

This is **Tool 1** in a two-tool system:

- **Tool 1 (This Tool)**: Everything from ingredient research to NPN approval — regulatory, formulation, documentation, compliance
- **Tool 2 (Future)**: Production to launch — Shopify, Amazon, 3PL, label design, marketing materials. Reads all its product data from Tool 1 via API

---

## The Product Lifecycle

### Stage 1: Research & Ingredient Discovery

A new molecule or ingredient is identified. The team begins collecting evidence.

- Research documents, supplier COAs, lab reports, safety studies are uploaded
- The Ingredient Knowledge Base stores everything: scientific name, regulatory status across countries, dosing ranges, safety data, supplier info
- **Every month**, the system syncs with Health Canada's NHPID database to pull all latest monographs — this becomes a **local replica** stored in our database, so we always know what's new in the market and which direction Canadian health authorities and supplement companies are moving
- This NHPID replica can later power a separate AI agent for market intelligence and product opportunity spotting

### Stage 2: Product Formulation

A product concept is built from one or more ingredients.

- Formulation details: dosage form, ingredient quantities, non-medicinal ingredients, claims, doses, target population
- **Documents from any source** can be attached — ingredient supplier specs, research papers, competitor analysis, anything that helps AI build a stronger application later
- The product does NOT need an NPN yet — it's tracked by **product name**, not NPN number
- Products can carry regulatory documentation from **other countries** (US, EU, Australia) even if they never get a Canadian NPN
- **Proprietary formulas and cooking recipes** are stored in the **Secure Vault** — owner-only access, no sharing unless explicitly granted per-person, every view and download logged, tied to employee agreements (see Secure Vault section)

### Stage 3: PLA Application Drafting

AI drafts the complete Product Licence Application using everything available.

- All uploaded documents + the NHPID monograph database + formulation details feed into the AI draft
- If there are gaps in what we provided, **AI fills in what it can** from its knowledge — because it already has the research documents and ingredient data that lead to the right answers
- The Generate Application feature is powered with **news and multi-level research** to audit all AI-prepared documentation
- **Self-scrutiny step**: before submission, the system runs an internal audit on the draft — checking completeness, compliance with monograph requirements, and flagging anything that looks weak

### Stage 4: Dr. Naresh Review

The complete draft package goes to the external regulatory consultant.

- Dr. Naresh reviews everything, adds his comments, may add new documentation or modify existing content
- He prepares the **final submission-ready package**
- His changes are tracked in the system
- When live: Dr. Naresh logs in with a **company-issued email** — database stays with UV International

### Stage 5: Health Canada Submission

- Dr. Naresh submits through his own Health Canada portal, keeping the company in CC
- The system tracks the submission date and status

### Stage 6: Health Canada Review

- If Health Canada has questions, they're logged here
- Responses are drafted, reviewed, and tracked

### Stage 7: Licence Received

- The approved NPN is entered into the system
- IL (Issuance Letter) and PL (Product Licence) PDFs are uploaded and attached
- The product moves to "Active Licence" status
- All formulation, regulatory, and approval data is now the **master record**

### Stage 8: Handoff to Tool 2

When a product is approved, everything it needs for launch flows out through API and exports.

- CSV exports shaped for each department: production, quality, marketing, sales
- **Tool 2** reads from this system to populate:
  - Shopify product listings
  - Amazon product listings
  - 3PL (third-party logistics) inventory systems
  - Label and packaging design tools
  - Marketing material generators
  - Listing images, descriptions, compliance text
- Tool 2's entire database filling system is designed in Tool 1 — the data structure and exports are specifically shaped so Tool 2 can auto-populate everything
- The goal: when a product is approved, the **entire launch package** (design, marketing, listing content, compliance docs) is ready for the launch team

---

## Product Status Stages

| Stage | Status | Description |
|-------|--------|-------------|
| 1 | **Research** | Ingredient/molecule being researched, documents being collected |
| 2 | **Formulation Draft** | Product concept created, formulation defined |
| 3 | **Application Draft** | AI-generated PLA draft in progress |
| 4 | **Internal Review** | Self-scrutiny / internal audit of the draft |
| 5 | **Submitted to Dr. Naresh** | Package sent for expert regulatory review |
| 6 | **Dr. Naresh Reviewing** | Under review, may have comments/changes |
| 7 | **Final Package Ready** | Dr. Naresh approved, ready for HC submission |
| 8 | **Submitted to Health Canada** | Filed with HC |
| 9 | **HC Review — Questions** | Health Canada has questions or requests |
| 10 | **HC Review — Pending** | Under review, no questions |
| 11 | **Approved — Licence Received** | NPN issued, IL + PL received |
| 12 | **Active** | Product is live and being manufactured/sold |
| 13 | **Amendment Pending** | A change has been submitted (ingredient, claim, label, etc.) |
| 14 | **Renewal Pending** | Licence up for renewal |
| 15 | **Suspended / Cancelled** | Health Canada action |

---

## Two Sections: Product Pipeline + Active Licences

Products are organized into two areas:

- **Product Pipeline**: Pre-NPN products — research, formulation, application drafting, under review. These don't have an NPN yet and are tracked by product name
- **Active Licences**: Products that have received an NPN — fully approved, active, or under amendment/renewal. This is the master licence database

---

## Site Licence & Facility Management

Every NHP company operates under one or more **Site Licences** from Health Canada:

- **Site Licence Number** and expiry date
- **GMP certification** status and audit dates
- **Multiple facilities**: warehouse, 3PL, foreign manufacturer, foreign packager, office
- Each facility's activities: manufacturing, packaging, labelling, importing, storing
- Manager and contact details per facility
- Foreign Site Reference Numbers (FSRN), MRA/PIC/S certificates

**Scalability vision**: A regulatory consultant like Dr. Naresh might manage 20+ companies. The tool's architecture should eventually support **multi-company management** — one consultant logging in and switching between company portfolios.

---

## Document Management

Every product can hold any type of document:

| Category | Examples |
|----------|----------|
| **Regulatory** | IL letters, PL licences, HC correspondence, amendment submissions |
| **Quality** | COAs, lab test results, stability studies |
| **Ingredient** | Supplier specs, raw material COAs, research papers, safety studies |
| **Formulation** | Formulation sheets, manufacturing procedures |
| **Marketing** | Label drafts, packaging designs, marketing claims review |
| **Research** | Scientific literature, clinical studies, competitive analysis |
| **Other** | Anything a department needs to attach to a product's record |

**Department-specific exports**: When information goes out as CSV, each team gets what they need:
- Production → formulation details
- Quality → specs and COA data
- Marketing → approved claims and product info
- Sales → product descriptions and features

---

## Secure Vault (Trade Secrets & Proprietary Formulas)

Some documents are **not just sensitive — they are the company's competitive advantage**. Cooking recipes, proprietary formulation ratios, patent-pending processes — these require the highest level of protection.

### How the Vault Works

**Creation & Ownership**
- Only a **System Admin or Owner** can create a Vault document
- When created, the document is visible to **nobody except the creator**
- There is **no share button** — sharing is a deliberate, logged, owner-only action

**Sharing (Owner-Controlled Only)**
- The owner can grant access to a specific person (e.g., a co-director, co-partner)
- Access is granted per-individual, per-document — not by role
- Even when shared, the recipient **cannot re-share** — no forward, export, or share-to-others option
- The only way someone else gets access is if the owner grants it directly

**Access Logging (Every Interaction Recorded)**
- Vault document created: logged (who, when)
- Shared with someone: logged (who shared, who received, when, owner's consent confirmed)
- Shared person **opens** it: logged (who, when, how long they viewed)
- Shared person **downloads** it: logged — person is added to the **"Recipe Exposed" list**
- Never opened: tracked — "shared but never viewed"
- Number of views: tracked (saw it once, twice, etc.)

**The "Recipe Exposed" List**
- A permanent record of everyone who has downloaded or viewed a vault document
- Ties directly to the **employee agreement** — before access, the person must have signed:
  - Non-disclosure of proprietary formulas
  - Acknowledgment that all access is logged
  - Consequences of unauthorized sharing
- The tool creates the **digital evidence trail** that makes the agreement enforceable

*"Access to proprietary formulation documents is governed by the employee/partner agreement. This tool provides the audit trail to verify compliance."*

**Example Audit Trail**
```
Document: "WE Bromelain — Master Formula v3.2"
Created by: Virender Dass (Owner) — 2026-03-15
Status: VAULT (Highest Security)

Access History:
1. Created by Owner — 2026-03-15 10:22 AM
2. Shared with Co-Director (Ravi) — 2026-04-01 (Owner consent: Yes)
3. Ravi opened document — 2026-04-02 2:15 PM (viewed 4 min 32 sec)
4. Ravi downloaded document — 2026-04-02 2:19 PM — EXPOSED
5. No further access by anyone.

Exposed List: Ravi (Co-Director) — downloaded 2026-04-02
Employee Agreement: Signed 2025-12-01 (Clause 7.2 — NDA)
```

**Security Rules**
- Vault documents are **invisible** to users without explicit access — they don't even see the document exists
- No search results for vault documents unless you have access
- No API endpoint serves vault content unless the request comes from an authorized user
- Monthly audit report includes a vault section: how many vault docs exist, who accessed them, any downloads

---

## Search & Data Access

**360-degree search**: Take any metric from any product — an ingredient, a dosage, a claim, a supplier name — and search across the entire database. If a product has an NPN, you should be able to use deep search to find everything connected to it.

**API access**: Other systems and departments read data from this tool. They don't modify it — they get exactly what they need, nothing more. The API serves as the **single source of truth** for product information across the company.

---

## Security & Audit

This is a **high-security tool** handling sensitive formulations and regulatory data.

### Role-Based Access

| Role | Access Level |
|------|-------------|
| **Owner/Admin** | Full access — all data, audit logs, security reports, vault management |
| **Compliance** (Dr. Naresh, Aman) | Regulatory documents, review workflows, audit approval |
| **Team Members** | Role-specific only — production gets formulation, marketing gets claims |
| **Auditor** (Aman) | Reviews audit logs monthly, approves security reports |

Sensitive formulation data is **only visible to owner and compliance** — other team members get exactly what they need, not more.

### Audit Trail (When Live)

Once the system is live, **every interaction is logged**:
- Who opened the tool, when, from where
- What pages they visited, what they clicked
- What data they viewed, what they downloaded
- The full narrative: "User X logged in → went to Product Y → viewed formulation → downloaded COA → logged out"
- **Data leak detection**: If someone not supposed to access a product touches it, or touches multiple products in an unusual pattern — that's a flag
- **Download tracking**: Every file view and download is logged with user, timestamp, IP
- **Monthly audit review**: System generates a monthly report. Aman (auditor) reviews, confirms normal, approves. This is the company SOP for high-security tools

### Security Triggers (Future)
- Alert if a user accesses products outside their assigned scope
- Alert if unusual download volume is detected
- Alert if a user accesses the system at unusual hours
- All alerts go to system admin/owner
- Once a document is finalized/live, any access beyond viewing triggers heightened logging

---

## What's Built vs. What's Next

### Built and Working Now

**Core Platform**
- Active Licences library with full detail panels (info grid, ingredients, claims, risks, doses, attachments)
- Smart PDF import with AI extraction (3 methods: upload PDFs, select folder, scan server path)
- Pre-import preview with duplicate detection (Replace / Skip / Attach per-item + bulk actions)
- Multi-file NPN consolidation (2 PDFs for same NPN → 1 product with 2 attachments, not 2 products)
- Document attachment management (View / Download / Upload / Remove) with cross-entity duplicate warning
- Responsive detail panel (flex layout, independent scroll, no content overlay)

**Health Canada Integration**
- Full LNHPD sync with 6 HC API endpoints (medicinal ingredients, non-med ingredients, claims, risks, doses, routes)
- Per-product sync button in detail panel (purple sync badge next to NPN)
- Auto-enrich from LNHPD on every import (fire-and-forget, non-blocking)
- Derived fields: application class (Compendial→I, Traditional→II, Non-traditional→III), route of administration, company code
- Info grid with 4 rows: dosage summary, form/route/class/type, dates/status badge, company + "View on HC" link
- Duplicate lnhpdId guard (UNIQUE constraint protection with clear error messages)

**Data Management**
- Bulk select, bulk delete with cascading attachment cleanup
- Global search (Ctrl+K) across licences, applications, ingredients, submissions
- Single licence CSV export (55 columns, flattened JSON fields)
- Bulk CSV export (multi-row, same 55-column format)
- 3-sheet Excel export (product summary, ingredients detail, claims + risks)
- Application package export (full JSON with all child records)

**Application Builder**
- PLA Application builder with 7-tab editor (basic info, ingredients, non-med, claims, dosage, risk, documents/package)
- AI-powered document generation (11 document types via Claude + Handlebars templates)
- Bilingual label generation (English + French via AI regulatory translation)
- AI ingredient research (regulatory info, dose ranges, warnings)
- Submission readiness score (percentage based on completeness)

**Company & Admin**
- Company profile, team members with regulatory role badges (QAP, Senior Official, HC Contact), facilities
- Ingredient Knowledge Base with CSV import/export
- NHPID Submissions tracking with evidence packages and product strategies
- User authentication with roles (admin, editor, viewer) and session management
- Audit logging (AuditLog for data changes, ActivityLog for user interactions)
- Monthly audit report generation
- Field whitelisting, HTML sanitization, parameterized queries

### Next Priorities
1. Product Pipeline section (separate from Active Licences — for pre-NPN products tracked by name, not NPN)
2. Product status stages (full 15-stage lifecycle: Research → Formulation → Draft → Review → Submission → Approval → Active → Amendment)
3. Dr. Naresh review workflow (compliance role, submission queue, change tracking, approval chain, company-issued email login)
4. Amendment lifecycle (LicenceAmendment → review → HC submission → approval tracking)
5. Monthly NHPID monograph sync and local replica (Monograph + IngredientMonographLink tables ready)
6. Secure Vault implementation (owner-only docs, per-person sharing, access logging, Recipe Exposed list, employee agreement integration)
7. Enhanced security: detailed click/view logging, monthly audit reports with Aman review, data leak detection, unusual access alerts
8. Tool 2 read-only API endpoints (product data for Shopify, Amazon, 3PL, label design, marketing materials)
9. Multi-company support (consultant mode — Dr. Naresh manages 20+ company portfolios from one login)
10. AI self-scrutiny step for application drafts (completeness check, monograph compliance, gap flagging before Dr. Naresh review)
11. COA upload with AI parsing (Claude Vision for Certificate of Analysis documents)
12. IRN response workflow (Health Canada questions tracking, response drafting, status updates)

---

## In One Sentence

**This is the master regulatory and product development hub — from molecule research to NPN approval — that securely holds every product's formulation, documentation, and regulatory history, and serves as the single source of truth for every downstream system that takes a product from approval to market.**
