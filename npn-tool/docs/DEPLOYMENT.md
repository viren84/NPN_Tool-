# Deployment Guide — NPN Filing Tool

> Last updated: 2026-04-13
> Bundle ID: `com.wellnessextract.npn-tool`
> Target: Windows (NSIS installer)

---

## 1. Prerequisites

### For Development
| Tool | Version | Required |
|---|---|---|
| Node.js | 24+ (LTS recommended) | Yes |
| npm | 11+ | Yes (comes with Node.js) |
| Git | Any recent | Recommended |
| Windows | 10 or 11 (64-bit) | Yes |

### For Production Build
| Tool | Version | Required |
|---|---|---|
| Everything above | — | Yes |
| electron-builder | 26.8+ | Yes (devDependency) |
| Windows SDK | Any | Required for code signing (optional) |

---

## 2. Development Setup

### Step 1: Clone and Install
```bash
git clone <repo-url> npn-tool
cd npn-tool
npm install
```

### Step 2: Generate Prisma Client
```bash
npx prisma generate
```

### Step 3: Run Database Migrations
```bash
npx prisma migrate dev
```
This creates `prisma/dev.db` (SQLite database) if it doesn't exist.

### Step 4: Start Development Server
```bash
npm run dev
```
Opens at `http://127.0.0.1:3000` (localhost only — security binding).

### Step 5: (Optional) Start with Electron Shell
```bash
npm run electron:dev
```
This runs Next.js and Electron concurrently using `concurrently` + `wait-on`.

---

## 3. Environment Variables

### .env File
Create a `.env` file in the project root if not present:
```env
# No required env vars — all config is in AppSettings database table
# Prisma uses SQLite, no connection string needed
```

### Runtime Configuration
All configuration is stored in the **AppSettings** database table (not environment variables):
- Claude API key → `AppSettings.claudeApiKey`
- Export path → `AppSettings.exportPath`
- Auto-refresh → `AppSettings.autoRefreshEnabled`
- Last sync timestamps → `AppSettings.lnhpdLastRefresh`, `AppSettings.nhpidLastRefresh`

Configure these via the **Settings** page after first login (admin only).

---

## 4. npm Scripts Reference

| Script | Command | Purpose |
|---|---|---|
| `dev` | `next dev -H 127.0.0.1` | Start dev server (localhost only) |
| `build` | `next build` | Build production Next.js |
| `start` | `next start -H 127.0.0.1` | Start production server |
| `lint` | `eslint` | Run ESLint |
| `electron:dev` | `concurrently "next dev" "wait-on http://localhost:3000 && electron ."` | Dev with Electron |
| `electron:build` | `next build && electron-builder` | Build Windows installer |
| `electron:start` | `next build && electron .` | Run production in Electron |

---

## 5. Building the Windows Installer

### Step 1: Build
```bash
npm run electron:build
```

### Step 2: Output
The installer is created in the `dist/` folder:
```
dist/
  NPN Filing Tool Setup.exe      ← NSIS installer
  NPN Filing Tool Setup.exe.blockmap
  latest.yml
```

### Electron Builder Configuration
From `package.json`:
```json
{
  "build": {
    "appId": "com.wellnessextract.npn-tool",
    "productName": "NPN Filing Tool",
    "files": [
      ".next/**/*",
      "main/**/*",
      "public/**/*",
      "prisma/**/*",
      "src/generated/**/*",
      "node_modules/**/*",
      "package.json"
    ],
    "win": {
      "target": "nsis"
    }
  }
}
```

### What's Included in the Build
- `.next/` — compiled Next.js app
- `main/electron.js` — Electron entry point
- `public/` — static assets (icons, images)
- `prisma/` — schema + migrations (database created on first run)
- `src/generated/prisma/` — Prisma client
- `node_modules/` — all dependencies

### What's NOT Included
- `prisma/dev.db` — database is created fresh on first install
- `data/attachments/` — created automatically when files are uploaded
- `.env` — not needed (config stored in database)

---

## 6. Electron Configuration

### Window Settings
From `main/electron.js`:
```javascript
{
  width: 1400,
  height: 900,
  minWidth: 1024,
  minHeight: 700,
  title: "NPN Filing Tool — Health Canada",
  webPreferences: {
    nodeIntegration: false,      // Security: disabled
    contextIsolation: true,      // Security: enabled
  }
}
```

### How It Works
1. Electron starts → launches Next.js server on port 3000
2. Waits for Next.js "Ready" signal
3. Opens BrowserWindow pointing to `http://localhost:3000`
4. On close → kills Next.js process

### Development vs Production
| Aspect | Development | Production |
|---|---|---|
| Next.js | `next dev` (hot reload) | `next start` (pre-built) |
| Port | 3000 | 3000 |
| Electron | Separate process | Bundled in installer |
| Database | `prisma/dev.db` | Created on first run |

---

## 7. Database Initialization

### First Run
1. Prisma checks for `prisma/dev.db`
2. If missing → creates new SQLite database
3. Runs all pending migrations
4. Database is ready

### Schema Updates (New Version)
1. User installs new version (runs NSIS installer over existing)
2. On next app start, Prisma auto-detects pending migrations
3. Migrations run automatically
4. Database schema is updated without data loss
5. **User does not need to do anything manually**

### Manual Migration (Development)
```bash
# Create a new migration after schema changes
npx prisma migrate dev --name "add_new_field"

# Apply migrations to existing database
npx prisma migrate deploy

# Reset database (DESTROYS ALL DATA)
npx prisma migrate reset

# Open visual database browser
npx prisma studio
```

---

## 8. Production Deployment Checklist

### Before Building
- [ ] All tests passing (`/test-all` slash command)
- [ ] Database migrations are clean (`npx prisma migrate status`)
- [ ] No console.log statements in production code
- [ ] API key not hardcoded anywhere
- [ ] ESLint passes (`npm run lint`)

### Build & Test
- [ ] Run `npm run electron:build`
- [ ] Install the NSIS installer on a clean Windows machine
- [ ] Verify first-run creates database
- [ ] Register admin user
- [ ] Set Claude API key in Settings
- [ ] Test PDF import flow
- [ ] Test LNHPD sync
- [ ] Test document generation
- [ ] Test export (CSV, Excel, JSON)

### Distribution
- [ ] Upload installer to company file share
- [ ] Notify users of new version
- [ ] Document any breaking changes in CHANGELOG.md

---

## 9. Update Process

### For End Users
1. Download new `NPN Filing Tool Setup.exe`
2. Run installer (overwrites previous version)
3. Launch app — database migrates automatically
4. All existing data is preserved

### For Developers
1. Pull latest code
2. `npm install` (in case dependencies changed)
3. `npx prisma generate` (regenerate Prisma client)
4. `npx prisma migrate dev` (apply new migrations)
5. `npm run dev` (start development)

---

## 10. Backup Before Update

**Always backup before updating:**
```bash
# Before running the new installer:
copy prisma\dev.db prisma\dev.db.backup-YYYYMMDD
xcopy data\attachments data\attachments-backup-YYYYMMDD\ /E /I
```

**Restore if something goes wrong:**
```bash
copy prisma\dev.db.backup-YYYYMMDD prisma\dev.db
xcopy data\attachments-backup-YYYYMMDD\ data\attachments\ /E /I
```

---

## 11. Troubleshooting Build Issues

| Problem | Solution |
|---|---|
| `electron-builder` fails | Ensure Node.js 24+ and npm 11+. Delete `node_modules` and reinstall. |
| NSIS installer too large | Check `node_modules` isn't bloated. Run `npm prune --production` before build. |
| Database not created on first run | Check `prisma/` folder is included in build files. |
| "Port 3000 in use" | Another instance is running. Kill it: `taskkill /f /im "NPN Filing Tool.exe"` |
| White screen on launch | Next.js server hasn't started yet. Check console for errors. |
| Prisma migration fails | Delete `prisma/dev.db` and let it recreate (CAUTION: loses all data). |

---

## 12. Network Requirements

| Service | URL | Required | Notes |
|---|---|---|---|
| Claude AI | `api.anthropic.com` | For AI features | PDF extraction + document generation |
| Health Canada LNHPD | `health-products.canada.ca` | For sync | Read-only, no auth |
| npm registry | `registry.npmjs.org` | For development only | Not needed at runtime |
| Everything else | — | No | App runs fully local |

**Offline mode:** The app works without internet for all local operations (viewing, editing, exporting). Only PDF import (Claude AI) and LNHPD sync require internet.
