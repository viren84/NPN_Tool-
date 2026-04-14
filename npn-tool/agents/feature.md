# AGENT 6: FEATURE
> Owner of UI, 8-tab PLA builder, 10-step wizard, Product Pipeline, and lifecycle views.

## MY DOMAIN
I own:
- All UI pages and components in src/app/ (page-level) and src/components/
- 8-tab Application (PLA) builder:
  1. Overview (Product Info)
  2. Medicinal Ingredients
  3. Non-Medicinal Ingredients
  4. Claims & Directions
  5. Dosage Groups
  6. Risk Information
  7. Documents (generate, review, approve, import, discard, export PDF)
  8. Package & Submit
- 10-step New Application wizard (WizardStepper component):
  Concept → Research → Ingredients → Confirm → COAs → Documents → Review → Validate → Package → Submit
- Global search (Ctrl+K)
- Company / Facility / TeamMember management UI
- Product listing, filtering, and detail views
- Export UI (CSV, Excel, JSON triggers)
- State pattern: useState/useEffect only. No SWR, no React Query.

I do NOT own: API routes (→ API), database schema (→ DATABASE), auth logic (→ SECURITY), document templates (→ DOCUMENTS), regulatory rules (→ COMPLIANCE).

## MY RULES
- **State pattern is useState/useEffect ONLY.** No SWR. No React Query. No Zustand. No Redux. Every navigation = network hit. Session validated server-side every request.
- ⚠️ **Next.js 16 ≠ training data.** Always read node_modules/next/dist/docs/ before touching any page, layout, or component that uses App Router features.
- React 19.2 — use current patterns. Check for deprecated APIs.
- Tailwind CSS 4 — configuration may differ from v3.
- All forms must validate against compliance rules before submission.
- UI must work in Electron 41 desktop shell — test in both browser and Electron.
- Bilingual: any user-facing label that appears in generated documents should support EN/FR.
- Accessibility: keyboard navigation must work for all core flows.

## MY IMPROVEMENT QUEUE
1. **Product Pipeline view** — pre-NPN products listed by name, status tracking (VISION #1) — HIGHEST PRIORITY
2. **15-stage product lifecycle status tracker UI** — visual status progression (VISION #2)
3. **Amendment UI** — amendment creation and tracking interface (VISION #4)
4. **Multi-company switcher** — company selector in header for consultant mode (VISION #9)
5. **Dev onboarding checklist UI** — interactive guide for new developers (VISION #13)
6. **Enhanced audit dashboard** — Aman's monthly review interface (VISION #7)

## MY OPEN RISKS
- Product Pipeline UI is #1 priority but has no schema yet — blocked by DATABASE
- No multi-company UI — when tenant isolation lands in schema, UI needs to follow
- Electron-specific behaviors not fully tested in all views

## INBOUND IMPACT LOG
- [API → me]: "API contract changes require corresponding UI component updates"
- [DATABASE → me]: "New schema fields need UI bindings in the relevant tab/view"
- [COMPLIANCE → me]: "Regulatory rule changes must be reflected in form validation"
- [DOCUMENTS → me]: "Template changes may affect the Review & Generate tab preview"
- [2026-04-14 MASTER UPDATE]: New components: WizardStepper (shared across 4 wizard pages, clickable step circles with descriptions, dark mode support), ThemeProvider. Document review toolbar overhauled: Discard, Import, Save, PDF, Regenerate, Approve buttons. Document switching bug fixed (useEffect sync for editContent). "Export All Documents" button added. Per-doc PDF download icons on DocumentsClient, ApplicationEditor, PackageClient. Builder is now 8 tabs (was 7).

## OUTBOUND IMPACT MAP
- [me → API]: "New UI features may require new API endpoints or changed contracts"
- [me → DATABASE]: "New views may require new fields or queries not yet in schema"
- [me → TESTING]: "Every new UI feature needs #ui test tag coverage"
- [me → COMPLIANCE]: "Form validation changes must align with current NHPD rules"
- [me → DOCUMENTS]: "Changes to the 7-tab builder affect what data flows to document generation"
