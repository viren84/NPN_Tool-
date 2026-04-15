# How to Use the 8-Agent System

> These agents are **prompt templates**, not running software. They don't auto-activate or talk to each other. You load them into a Claude conversation when needed.

---

## 3 Ways to Access Agents

### 1. Direct prompt — Load a specific agent
```
Read agents/security.md then tell me: is the export-pdf route properly secured?
```

### 2. Sutradhaar routing — Let the boss pick the right agent
```
Read agents/sutradhaar.md and AGENTS.md. I want to add a new field to track amendment history. Which agent should handle this and what's the impact?
```

### 3. Master update — After a big coding session
```
Run /master-update — read all 8 agent files and tell me what's outdated.
```

---

## Quick Reference Card

```
"I want to..."                          Ask this agent
--------------------------------------------------------------
Build something new                      SUTRADHAAR (routes you)
Check if something is secure             SECURITY
Change the database                      DATABASE
Check Health Canada rules                COMPLIANCE
Add/change an API endpoint               API
Build/fix a UI page                      FEATURE
Run or write tests                       TESTING
Fix/add document templates or exports    DOCUMENTS
```

---

## Agent-by-Agent: What to Ask + Example Prompts

### SUTRADHAAR (Agent 1 — The Boss)
**File:** `agents/sutradhaar.md`
**When to use:** You're unsure which agent to ask, or you want a high-level decision.

| Task | Example Prompt |
|------|---------------|
| What to build next | "Read agents/sutradhaar.md. What's the highest priority vision item I can start today?" |
| Impact assessment | "Read agents/sutradhaar.md. I want to add multi-company support. Score the impact across all 5 dimensions." |
| Feature routing | "Read agents/sutradhaar.md and AGENTS.md. I need to add COA parsing. Which agent owns this and what needs to happen first?" |
| Full system report | "Read agents/sutradhaar.md. Generate the full Sutradhaar agent report." |
| Dependency check | "Read agents/sutradhaar.md. What blocks VISION #1 (Product Pipeline)?" |

---

### SECURITY (Agent 2)
**File:** `agents/security.md`
**When to use:** Anything touching auth, permissions, data exposure, or vault.

| Task | Example Prompt |
|------|---------------|
| Audit a new route | "Read agents/security.md. I just added /api/reports/generate. What auth level should it have?" |
| Check for vulnerabilities | "Read agents/security.md. Scan src/app/api/applications/ for any routes missing auth middleware." |
| Plan Secure Vault | "Read agents/security.md and VISION.md item #6. Design the Secure Vault schema and access rules." |
| Review data exposure | "Read agents/security.md. What fields are returned by GET /api/licences? Are any sensitive?" |
| Session security | "Read agents/security.md. Is the session cookie configured correctly for production?" |

---

### DATABASE (Agent 3)
**File:** `agents/database.md`
**When to use:** Adding models, fields, migrations, or changing relations.

| Task | Example Prompt |
|------|---------------|
| Design a new model | "Read agents/database.md and prisma/schema.prisma. Design a Product model for pre-NPN products (VISION #1)." |
| Plan a migration | "Read agents/database.md. I need to add a reviewStatus field to Application for Dr. Naresh. Write the migration." |
| Schema audit | "Read agents/database.md. Are there any orphaned relations or missing indexes in the current schema?" |
| Check constraints | "Read agents/database.md. Which models have UNIQUE constraints? Are any missing?" |
| Multi-tenant design | "Read agents/database.md. How would we add companyId to support multi-company mode (VISION #9)?" |

---

### COMPLIANCE (Agent 4)
**File:** `agents/compliance.md`
**When to use:** Anything about Health Canada rules, claims, product classes, or regulatory review.

| Task | Example Prompt |
|------|---------------|
| Validate a claim | "Read agents/compliance.md. Can a Class I product claim 'Helps support immune function'?" |
| Check classification | "Read agents/compliance.md. This product has 2 monograph ingredients from different monographs. What class is it?" |
| Review a document | "Read agents/compliance.md. Review the Safety Summary Report template for NHPD compliance gaps." |
| Plan Dr. Naresh workflow | "Read agents/compliance.md and VISION.md #3. Design the review request flow." |
| Amendment rules | "Read agents/compliance.md. When does a product change require a new PLA vs. an amendment?" |
| Bilingual check | "Read agents/compliance.md. Which documents must be bilingual? Are we missing any French translations?" |

---

### API (Agent 5)
**File:** `agents/api.md`
**When to use:** Adding routes, fixing LNHPD sync, changing request/response contracts.

| Task | Example Prompt |
|------|---------------|
| Add a new endpoint | "Read agents/api.md. I need a GET /api/reports/{id} route for external tools. Design it." |
| Debug LNHPD sync | "Read agents/api.md. The LNHPD sync for NPN 80120933 returns empty ingredients. Diagnose." |
| Rate limiting | "Read agents/api.md. Add rate limiting to /api/auth/login — max 5 attempts per minute." |
| Route inventory | "Read agents/api.md. List all routes that handle application documents." |
| API contract review | "Read agents/api.md. I changed the Application schema. Which API routes need updating?" |

---

### FEATURE (Agent 6)
**File:** `agents/feature.md`
**When to use:** Building UI pages, components, fixing layout, adding forms.

| Task | Example Prompt |
|------|---------------|
| Build a new page | "Read agents/feature.md. Build the Product Pipeline view with status badges and filters." |
| Fix a UI bug | "Read agents/feature.md. The document switching shows stale content when I click between drafts. Fix it." |
| Add a component | "Read agents/feature.md. Add a multi-company selector dropdown to the sidebar." |
| Wizard flow | "Read agents/feature.md. The WizardStepper steps 2-10 aren't clickable in dark mode. Fix it." |
| Form validation | "Read agents/feature.md. Add client-side validation to the Claims tab that checks against product class." |

---

### TESTING (Agent 7)
**File:** `agents/testing.md`
**When to use:** Running tests, checking coverage, adding test scenarios.

| Task | Example Prompt |
|------|---------------|
| Run full suite | "Run /test-all" |
| Run specific tag | "Run /test-security" or "Run /test-api" |
| Check coverage | "Read agents/testing.md. Which tests cover the PDF export feature? Are there gaps?" |
| Add test scenarios | "Read agents/testing.md. Write test scenarios for the new amendment lifecycle." |
| Debug a failure | "Read agents/testing.md. The @sync:single test is failing with 500. Diagnose." |

---

### DOCUMENTS (Agent 8)
**File:** `agents/documents.md`
**When to use:** Templates, PDF generation, CSV/Excel exports, bilingual content.

| Task | Example Prompt |
|------|---------------|
| Fix a template | "Read agents/documents.md. The Cover Letter template is missing the company address. Fix it." |
| Add a new template | "Read agents/documents.md. Create an IRN Response template for Health Canada Information Request Notices." |
| Debug PDF export | "Read agents/documents.md. The exported PDF shows Greek letters as question marks. Fix sanitizeForPdf." |
| Export feature | "Read agents/documents.md. Add a button to export all documents as a single PDF on the Documents page." |
| Bilingual labels | "Read agents/documents.md. The French label template is missing the dosage section. Fix it." |

---

## Important Rules

1. **Always start with "Read agents/X.md"** — this loads the agent's rules and context. Without it, Claude is guessing.

2. **Agents don't auto-update.** After a coding session, run the master update to sync agent files with the current codebase.

3. **Agents don't run in the background.** They're reference documents that shape Claude's behavior when loaded.

4. **For cross-domain questions, start with Sutradhaar.** It knows which agent owns what and will give you the exact prompt to use.

5. **The key files every agent reads on startup:**
   - `CLAUDE.md` — project status dashboard
   - `AGENTS.md` — routing rules and vision priority
   - `agents/<name>.md` — the agent's own rules and knowledge
