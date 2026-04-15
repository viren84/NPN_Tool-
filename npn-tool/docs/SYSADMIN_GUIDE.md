# System Administrator Guide — NPN Filing Tool

> Last updated: 2026-04-13
> For: System administrators managing the NPN Filing Tool installation

---

## 1. System Overview

The NPN Filing Tool is a **local-first Electron desktop app** — there is no cloud database, no external server, and no internet-hosted data. All data stays on the local machine.

| Component | Details |
|---|---|
| App | Electron 41 desktop app (Windows NSIS installer) |
| Web Framework | Next.js 16.2 running on `127.0.0.1:3000` (localhost only) |
| Database | SQLite file at `prisma/dev.db` |
| File Storage | `data/attachments/` (organized by entity type) |
| AI Service | Anthropic Claude API (external, requires internet for AI features only) |
| Gov API | Health Canada LNHPD (external, read-only, no auth required) |

**Bundle ID:** `com.wellnessextract.npn-tool`

---

## 2. Installation

### Prerequisites
- Windows 10/11 (64-bit)
- No additional software required — the installer bundles everything

### Install from NSIS Installer
1. Run the `NPN Filing Tool Setup.exe` installer
2. Follow the Windows installation wizard
3. Launch the application from the desktop shortcut
4. On first launch, Prisma auto-creates the SQLite database

### Install for Development
```bash
# Prerequisites: Node.js 24+, npm 11+
git clone <repo-url>
cd npn-tool
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

### First Run
1. The first user to register becomes **admin** (cannot be changed)
2. Admin sets the Claude API key in **Settings** page
3. All subsequent registrations create **editor** accounts
4. Admin can change any user's role

---

## 3. User Management

### Roles

| Role | Read | Create/Edit | Delete | Settings | Audit Logs | User Management |
|---|---|---|---|---|---|---|
| **viewer** | Yes | No | No | No | No | No |
| **editor** | Yes | Yes | No | No | No | No |
| **admin** | Yes | Yes | Yes | Yes | Yes | Yes |

### How Roles Work
- **First registered user** automatically becomes admin
- Subsequent users register as editor by default (client cannot self-assign role)
- Only admin can change roles via the UI
- Auth middleware enforces roles on every API request:
  - `requireAuth()` — any logged-in user (read access)
  - `requireEditor()` — editor or admin (create/update)
  - `requireAdmin()` — admin only (delete, settings, audit)

### Password Security
- **bcrypt with 12 rounds** — passwords are never stored in plain text
- Password hashing: `src/lib/auth/password.ts`
- No password recovery — admin must manually reset (future feature)
- No password complexity rules (recommend adding before multi-user deployment)

### Sessions
- **httpOnly cookie** named `npn_session`
- 30-day expiry
- Cookie flags: httpOnly, secure (in production), sameSite=strict
- Session validated server-side on every request
- Logout clears the session cookie
- Session file: `src/lib/auth/session.ts`

---

## 4. Database Management

### Location
```
prisma/dev.db          ← SQLite database file (ALL application data)
data/attachments/      ← Uploaded files (PDFs, COAs, labels, etc.)
```

### Backup Procedure

**What to backup (BOTH required):**
1. `prisma/dev.db` — the entire database
2. `data/attachments/` — all uploaded files

**How to backup:**
```bash
# Manual backup (recommended: weekly)
copy prisma\dev.db backups\dev-YYYY-MM-DD.db
xcopy data\attachments backups\attachments-YYYY-MM-DD\ /E /I
```

**Restore from backup:**
```bash
# Stop the application first!
copy backups\dev-YYYY-MM-DD.db prisma\dev.db
xcopy backups\attachments-YYYY-MM-DD\ data\attachments\ /E /I
# Restart the application
```

### Database Migrations
- Prisma manages all schema changes
- Migrations run automatically on app start
- Manual migration: `npx prisma migrate dev`
- Migration files: `prisma/migrations/` directory
- **Never edit dev.db directly** — always use Prisma migrations

### Database Size Monitoring
The database grows as more licences and applications are added. Monitor:
- `prisma/dev.db` file size (typical: 10-100 MB depending on data volume)
- `data/attachments/` folder size (depends on PDFs uploaded)

---

## 5. Security Configuration

### Network Security
- Server binds to **127.0.0.1 only** (localhost) — `-H 127.0.0.1` in package.json
- **No external ports open** — not accessible from the network
- No cloud database — all data is local
- No CORS issues — all requests from localhost:3000

### Authentication Security
| Check | Status | File |
|---|---|---|
| bcrypt(12) password hashing | Active | `src/lib/auth/password.ts` |
| httpOnly session cookie | Active | `src/lib/auth/session.ts` |
| No JS access to session cookie | Active | httpOnly flag |
| First user = admin | Active | `src/app/api/auth/register/route.ts` |
| All routes require auth | Active | `requireAuth()` on every route |
| Field whitelisting on all responses | Active | `src/lib/utils/whitelist.ts` |
| HTML sanitization on inputs | Active | `sanitizeHtml()` |
| SQL injection prevention | Active | Prisma parameterized queries |

### API Key Security
- Claude API key stored in **AppSettings** table in local database
- Key is **masked** in GET responses (shows `....` + last 4 chars)
- Key is only sent to Anthropic's API — never to any other service
- Key location in DB: `AppSettings.claudeApiKey` where `id = "default"`
- Manage via: Settings page (admin only)

### Known Risks

| Risk | Severity | Mitigation |
|---|---|---|
| No rate limiting on API routes | Medium | Add before web deployment |
| No password complexity rules | Medium | Add before multi-user deployment |
| AI-generated HTML in doc preview | Low | Electron context only, no external users |
| No CSRF token | Low | Desktop app, session-only cookies |
| Dark Reader causes hydration warnings | Low | `suppressHydrationWarning` added |
| Secure Vault not built | High | Planned in VISION #6 |

---

## 6. Audit System

### Audit Log (Data Changes)
Every data create/update/delete is logged in the `AuditLog` table:
- **Who:** userId (linked to User)
- **What:** action (created/updated/deleted), entityType, entityId
- **When:** createdAt timestamp
- **Details:** human-readable description + JSON of before/after changes
- **Append-only:** No delete API exists for audit logs

### Activity Log (User Activity)
Granular tracking of all user actions in the `ActivityLog` table:
- **Actions tracked:** view, click, download, upload, search, login, logout, export
- **Context:** entityType, entityId, entityName, pagePath, details
- **Client info:** ipAddress, userAgent
- **Append-only:** No delete API exists

### Monthly Audit Reports
- Generated via: `POST /api/audit-reports`
- Admin only — `requireAdmin()` protected
- Report contents:
  - Total logins, views, downloads, exports
  - Per-user activity breakdown
  - Date range (monthly, weekly, or custom)
- Status: generated → reviewed → archived
- **Aman** is the designated monthly reviewer (workflow not yet automated)

### How to Generate a Report
1. Log in as admin
2. Navigate to Audit section
3. Select date range
4. Click "Generate Report"
5. Review and mark as "Reviewed"

---

## 7. File Storage Management

### Structure
```
data/
  attachments/
    licence/<uuid>/       ← Files attached to ProductLicence records
      IL-letter.pdf
      PL-certificate.pdf
    application/<uuid>/   ← Files attached to Application records
    ingredient/<uuid>/    ← Files attached to Ingredient records
    submission/<uuid>/    ← Files attached to IngredientSubmission records
```

### File Types Allowed
PDFs, Excel (.xlsx), Word (.docx), images (.jpg, .png), and others.

### Upload Limits
- Maximum file size: **50 MB** per file
- Enforced in: `src/app/api/attachments/route.ts`

### Deduplication
- Unique constraint: `entityType + entityId + fileName`
- Prevents same-named file from being uploaded twice to the same entity

### Cleanup
- Files are stored locally — no automatic cleanup
- To free space: remove old/unnecessary files from `data/attachments/`
- **Always check** if the corresponding `Attachment` record still references the file before deleting

---

## 8. Claude API Management

### What Uses the API
| Feature | Endpoint | Usage |
|---|---|---|
| PDF Import | `/api/upload/process` | Extracts NPN data from uploaded PDFs |
| Document Generation | `/api/applications/[id]/generate` | Generates 11 regulatory document types |
| Label Translation | (within generate) | Translates English labels to French |
| FAQ | `/api/faq` | Answers regulatory questions |

### API Key Setup
1. Get a key from [console.anthropic.com](https://console.anthropic.com)
2. Log in as admin
3. Go to Settings
4. Paste the API key
5. Key is saved in AppSettings table

### Cost Monitoring
- Model used: `claude-sonnet-4-6`
- Monitor usage at: [console.anthropic.com/usage](https://console.anthropic.com/usage)
- Set spending limits at: [console.anthropic.com/settings/limits](https://console.anthropic.com/settings/limits)
- Heavy users: PDF import + document generation can consume significant tokens

### Key Rotation
1. Generate a new key at console.anthropic.com
2. Update in Settings page
3. Old key is immediately replaced in database
4. No downtime — change takes effect on next API call

---

## 9. LNHPD Sync (Health Canada API)

### What It Does
Enriches local licence records with data from Health Canada's LNHPD public API:
- Medicinal ingredients, non-medicinal ingredients
- Claims, dosage groups, risk information
- Route of administration
- Application class derivation (Class I/II/III)

### Configuration
- **Base URL:** `https://health-products.canada.ca/api/natural-licences`
- **Auth:** None required (public API)
- **Rate limit:** 300ms between requests (self-imposed)
- **Parallel:** 6 endpoints fetched simultaneously per licence

### Monitoring
- Last sync timestamp: `AppSettings.lnhpdLastRefresh`
- Sync logs appear in console during operation
- Sync results: `{synced, skipped, errors, details[]}`

### Troubleshooting Sync
| Problem | Cause | Solution |
|---|---|---|
| "Not found in LNHPD" | NPN not in HC database | Product may be too new or cancelled |
| Timeout | HC API slow or down | Wait and retry — 300ms throttle prevents overload |
| Missing ingredients | normalize() issue | Check if HC returned flat array vs {metadata,data} |

---

## 10. Electron App Management

### Development Mode
```bash
npm run electron:dev
# Starts Next.js + Electron concurrently
```

### Build Production Installer
```bash
npm run electron:build
# Outputs: Windows NSIS installer
```

### Window Configuration
- Default size: 1400 x 900
- Minimum size: 1024 x 700
- Title: "NPN Filing Tool — Health Canada"
- Node integration: disabled (security)
- Context isolation: enabled (security)

### Updates
1. Build new installer with `npm run electron:build`
2. Distribute to users
3. Users run the new installer (overwrites previous)
4. Prisma auto-migrates the database schema on next start

---

## 11. Disaster Recovery

### Critical Data to Protect
| Data | Location | Priority |
|---|---|---|
| Database | `prisma/dev.db` | CRITICAL — all application data |
| Uploaded files | `data/attachments/` | CRITICAL — all PDFs, COAs, etc. |
| Environment config | `.env` | LOW — can be recreated |
| API key | In database (AppSettings) | LOW — can be re-entered |

### Recovery Steps
1. **Stop the application**
2. **Restore database:** Copy backup `dev.db` to `prisma/dev.db`
3. **Restore files:** Copy backup `attachments/` to `data/attachments/`
4. **Restart the application**
5. **Verify:** Log in, check licences and applications exist

### Total Loss Recovery
If both database and files are lost with no backup:
1. Reinstall the application
2. Register a new admin user
3. Set Claude API key in Settings
4. Re-import licence PDFs
5. Re-sync from LNHPD (recovers most licence data)
6. Applications and documents must be recreated manually

---

## 12. Monitoring & Health Checks

### What to Monitor
| Check | How | Frequency |
|---|---|---|
| Database size | File size of `prisma/dev.db` | Weekly |
| Attachment folder size | `data/attachments/` total size | Weekly |
| Audit log growth | Count of AuditLog records | Monthly |
| Activity log growth | Count of ActivityLog records | Monthly |
| LNHPD sync status | `AppSettings.lnhpdLastRefresh` | After each sync |
| Claude API usage | console.anthropic.com/usage | Weekly |
| User sessions | Active sessions count | As needed |

### Log Locations
- Application logs: Electron console (development mode)
- LNHPD sync logs: Console output during sync
- Audit logs: `AuditLog` table (in-app)
- Activity logs: `ActivityLog` table (in-app)

---

## 13. Quick Reference

### Important File Paths
```
prisma/dev.db                    ← Database
prisma/schema.prisma             ← Schema definition (source of truth)
data/attachments/                ← Uploaded files
main/electron.js                 ← Electron entry point
src/app/api/                     ← All 53 API routes
src/lib/auth/                    ← Authentication logic
src/lib/sync/lnhpd-sync.ts      ← LNHPD integration
src/lib/utils/whitelist.ts       ← Field whitelisting
.env                             ← Environment variables
```

### Key Commands
```bash
npm run dev              # Start dev server (localhost:3000)
npm run electron:dev     # Start Electron + Next.js
npm run electron:build   # Build Windows installer
npx prisma migrate dev   # Run database migrations
npx prisma studio        # Open database GUI
```

### Emergency Contacts
- **Virender Dass** (CEO) — Senior Official for Health Canada
- **Dr. Naresh** — External compliance reviewer (workflow not yet automated)
- **Aman** — Monthly audit reviewer
