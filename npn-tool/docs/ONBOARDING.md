# Developer Onboarding Guide — NPN Filing Tool

> Last updated: 2026-04-13
> Time to first run: ~15 minutes
> For: New developers joining the project

---

## Welcome

The NPN Filing Tool is a desktop app that manages Health Canada NPN licences and product licence applications (PLAs) for UV International Traders Inc (Wellness Extract). You'll be working with Next.js 16, React 19, Prisma 7, Electron 41, and Claude AI.

**The single most important thing to know:**
> Next.js 16 is NOT the version you learned. Always read `node_modules/next/dist/docs/` before writing any route or page. The API has breaking changes from your training data.

---

## 1. Get Running (15 minutes)

### Prerequisites
- Windows 10/11
- Node.js 24+ (`node --version`)
- npm 11+ (`npm --version`)
- Git

### Steps
```bash
# 1. Clone the project
git clone <repo-url> npn-tool
cd npn-tool

# 2. Install dependencies
npm install

# 3. Generate Prisma client
npx prisma generate

# 4. Create and migrate database
npx prisma migrate dev

# 5. Start development server
npm run dev

# 6. Open in browser
# → http://127.0.0.1:3000
```

### First Login
1. Go to `http://127.0.0.1:3000`
2. Click "Register" — first user becomes **admin**
3. Set username, password (min 6 chars), name
4. Go to **Settings** → paste Claude API key (get from console.anthropic.com)
5. You're ready!

---

## 2. Project Structure — Where Things Live

```
npn-tool/
├── src/
│   ├── app/                      ← Pages + API routes (Next.js 16 App Router)
│   │   ├── page.tsx              ← Dashboard (home page)
│   │   ├── licences/             ← Licence management pages
│   │   ├── applications/         ← PLA builder pages
│   │   ├── ingredients/          ← Ingredient KB pages
│   │   ├── submissions/          ← NHPID submission pages
│   │   ├── company/              ← Company/Facility/Team pages
│   │   ├── settings/             ← Settings page
│   │   └── api/                  ← ALL 53 API routes
│   │       ├── auth/             ← Login, register, logout, me
│   │       ├── licences/         ← Licence CRUD + exports
│   │       ├── applications/     ← PLA CRUD + ingredients/claims/dosage/risk/generate/export
│   │       ├── ingredients/      ← Ingredient KB CRUD + import/export
│   │       ├── sync/             ← LNHPD sync (single + bulk)
│   │       ├── upload/           ← PDF processing (single, batch, folder scan)
│   │       └── ...               ← See API_REFERENCE.md for full list
│   ├── components/               ← Reusable React components
│   ├── lib/
│   │   ├── auth/                 ← Authentication (password.ts, session.ts)
│   │   ├── db/                   ← Database connection (prisma.ts)
│   │   ├── sync/                 ← LNHPD sync engine (lnhpd-sync.ts)
│   │   ├── documents/            ← Document generators (cover-letter.ts, label-generator.ts, etc.)
│   │   ├── utils/                ← Utilities (whitelist.ts, sanitize.ts, audit.ts)
│   │   └── claude.ts             ← Claude AI wrapper
│   └── generated/prisma/         ← Auto-generated Prisma client (DO NOT EDIT)
├── prisma/
│   ├── schema.prisma             ← Database schema (SOURCE OF TRUTH)
│   ├── migrations/               ← Migration history
│   └── dev.db                    ← SQLite database (created at first run)
├── main/
│   └── electron.js               ← Electron desktop shell
├── data/
│   └── attachments/              ← Uploaded files (organized by entity)
├── docs/                         ← All documentation
├── agents/                       ← 8 AI agent system prompts (Sutradhaar)
├── .claude/commands/             ← Claude Code slash commands
├── CLAUDE.md                     ← AI assistant config
├── AGENTS.md                     ← Agent routing rules
└── package.json                  ← Dependencies and scripts
```

---

## 3. Key Files to Understand First

Read these files in this order to understand the project:

| # | File | Why |
|---|---|---|
| 1 | `docs/ARCHITECTURE.md` | Full system overview, data flows, tech stack |
| 2 | `prisma/schema.prisma` | 31 models — the data foundation |
| 3 | `src/lib/sync/lnhpd-sync.ts` | Core LNHPD integration logic |
| 4 | `src/lib/auth/session.ts` | How authentication works |
| 5 | `src/lib/utils/whitelist.ts` | How field whitelisting protects API responses |
| 6 | `src/app/api/applications/[id]/generate/route.ts` | How document generation works |
| 7 | `docs/VISION.md` | What's planned but not yet built |

---

## 4. The 5 Core Flows

### Flow 1: PDF Import
```
User uploads PDF → pdf-parse extracts text → Claude AI extracts structured data →
Preview → User confirms → ProductLicence created → Attachment saved →
Auto-enrich from LNHPD (fire-and-forget)
```
**Key file:** `src/app/api/upload/process/route.ts`

### Flow 2: LNHPD Sync
```
Trigger sync → Fetch product by NPN → Get lnhpdId →
Fetch 6 endpoints in parallel (ingredients, non-med, purposes, risks, doses, routes) →
normalize() handles response format differences →
Derive applicationClass (I/II/III) → Update local ProductLicence
```
**Key file:** `src/lib/sync/lnhpd-sync.ts`

### Flow 3: Application Builder (7 Tabs)
```
Tab 1: Product Info → Tab 2: Medicinal Ingredients → Tab 3: Non-Med Ingredients →
Tab 4: Claims → Tab 5: Dosage Groups → Tab 6: Risk Info →
Tab 7: Review & Generate Documents
```
**Key file:** `src/app/applications/[id]/page.tsx` + each tab's API routes

### Flow 4: Document Generation
```
User clicks "Generate" → POST /api/applications/[id]/generate →
Switch on documentType → Call specific generator (Claude AI or template) →
Save to GeneratedDocument table → User reviews → Approve/Reject
```
**Key file:** `src/app/api/applications/[id]/generate/route.ts`

### Flow 5: Export
```
CSV (55 columns) / Excel (3 sheets via SheetJS) / JSON package
Application export: all generated docs → HTML files in folder
```
**Key files:** `src/app/api/licences/export/route.ts`, `src/app/api/applications/[id]/export/route.ts`

---

## 5. How to Add a New API Route

### Example: Adding GET /api/widgets

1. Create the folder: `src/app/api/widgets/`
2. Create the file: `src/app/api/widgets/route.ts`

```typescript
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

// ⚠️ READ node_modules/next/dist/docs/ FIRST!
// Next.js 16 route handlers may differ from what you know.

export async function GET() {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const widgets = await prisma.widget.findMany();
  return NextResponse.json(widgets);
}
```

### Auth Middleware Pattern
```typescript
// Read-only (all logged-in users):
const user = await requireAuth();

// Create/edit (editor + admin):
const user = await requireEditor();

// Admin-only (delete, settings, audit):
const user = await requireAdmin();
```

### Field Whitelisting Pattern
```typescript
// NEVER pass raw request body to Prisma:
// ❌ await prisma.widget.update({ data: body });

// ✅ Always whitelist fields:
const ALLOWED_FIELDS = ["name", "description", "status"];
const data: Record<string, unknown> = {};
for (const field of ALLOWED_FIELDS) {
  if (body[field] !== undefined) data[field] = body[field];
}
await prisma.widget.update({ where: { id }, data });
```

---

## 6. How to Add a New Database Model

1. Edit `prisma/schema.prisma` — add your model
2. Run `npx prisma migrate dev --name "add_widget_model"`
3. Prisma generates migration + updates client
4. Use in code: `import { prisma } from "@/lib/db/prisma"; prisma.widget.findMany();`

**Rules:**
- All fields need explicit types and defaults
- Add UNIQUE constraints explicitly (SQLite doesn't enforce them implicitly)
- Use `@default(uuid())` for IDs
- Use `@default(now())` for createdAt
- Use `@updatedAt` for updatedAt
- JSON data stored as `String @default("[]")` or `String @default("{}")`

---

## 7. How to Modify the 7-Tab Builder UI

The Application builder lives in `src/app/applications/[id]/page.tsx` with sub-routes for each tab.

Each tab has:
1. A **page component** (renders the form)
2. A **corresponding API route** (handles CRUD)
3. **useState/useEffect** for state (no Redux, no SWR, no React Query)

**State pattern (HARD RULE):**
```typescript
// ✅ Correct pattern:
const [data, setData] = useState<Widget[]>([]);
useEffect(() => {
  fetch("/api/widgets").then(r => r.json()).then(setData);
}, []);

// ❌ NEVER use:
// useSWR, useQuery, React Query, Zustand, Redux
```

Every navigation = network hit. Session validated server-side every request.

---

## 8. Testing

### Run Tests
The test suite uses slash commands in Claude Code:

| Command | What it tests |
|---|---|
| `/test-all` | Everything (110+ tests) |
| `/test-import` | PDF import flow |
| `/test-security` | Auth and security |
| `/test-api` | API routes |
| `/test-sync` | LNHPD sync |
| `/test-export` | Export functionality |
| `/test-ui` | UI components |

### Test Tags
Tests are tagged in `docs/TEST_JOURNEYS.md`:
`#import` `#sync` `#security` `#edge` `#performance` `#regression` `#electron` `#backup` `#api` `#auth` `#table` `#detail` `#export` `#application` `#data-flow` `#ui` `#nav`

### Current Status: GREEN (19 bugs fixed)

---

## 9. The 8-Agent System (Sutradhaar)

This project uses an AI agent orchestration system. Each agent owns a specific domain:

| Agent | Domain | File |
|---|---|---|
| Sutradhaar | Orchestration | `agents/sutradhaar.md` |
| Security | Auth, sessions, vault | `agents/security.md` |
| Database | Schema, migrations | `agents/database.md` |
| Compliance | NHPD rules, Dr. Naresh | `agents/compliance.md` |
| API | 53 routes, LNHPD sync | `agents/api.md` |
| Feature | UI, 7-tab builder | `agents/feature.md` |
| Testing | 110+ tests | `agents/testing.md` |
| Documents | Templates, exports | `agents/documents.md` |

**See:** `docs/AGENT_GUIDE.md` for full details on how to use agents.

---

## 10. Common Mistakes to Avoid

| Mistake | Why it's wrong | What to do instead |
|---|---|---|
| Using SWR or React Query | Project uses useState/useEffect only | Follow the state pattern |
| Assuming Next.js 16 = older versions | Breaking API changes | Read `node_modules/next/dist/docs/` first |
| Passing raw body to Prisma | Security vulnerability | Use field whitelisting |
| Forgetting auth middleware | Route is unprotected | Add requireAuth/requireEditor/requireAdmin |
| Editing `src/generated/prisma/` | Will be overwritten | Edit `prisma/schema.prisma` instead |
| Hardcoding API keys | Security risk | Use AppSettings table |
| Creating cloud endpoints | App is local-first | Bind to 127.0.0.1 only |
| English-only documents | Regulatory requirement | All docs must be EN + FR bilingual |

---

## 11. Useful Commands

```bash
# Development
npm run dev                    # Start dev server
npm run electron:dev           # Start with Electron
npx prisma studio              # Visual database browser
npx prisma migrate dev         # Run migrations

# Build
npm run electron:build         # Build Windows installer
npm run build                  # Build Next.js only

# Database
npx prisma generate            # Regenerate Prisma client
npx prisma migrate reset       # Reset database (DESTROYS DATA)
npx prisma migrate status      # Check migration status

# Linting
npm run lint                   # Run ESLint
```

---

## 12. Getting Help

1. **Read the docs** — `docs/` folder has comprehensive documentation
2. **Check ARCHITECTURE.md** — answers most "how does X work?" questions
3. **Use Claude Code** — open VS Code, use the Claude panel, run `/sutradhaar-report`
4. **Check TEST_JOURNEYS.md** — understand what's tested and how
5. **Ask Viren** — CEO, knows the regulatory context
