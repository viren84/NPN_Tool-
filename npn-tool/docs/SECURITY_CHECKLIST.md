# Security Checklist — NPN Filing Tool
**Last Updated:** 2026-04-12
**Updated By:** Claude (automated)

## Authentication & Session

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | Passwords hashed with bcrypt (12 rounds) | ✅ | `src/lib/auth/password.ts` |
| 2 | First user = admin, subsequent = editor (no self-role-assignment) | ✅ | Fixed: `register/route.ts` ignores client `role` field |
| 3 | Session stored as httpOnly cookie | ✅ | `src/lib/auth/session.ts` |
| 4 | Session cookie not accessible via JavaScript | ✅ | httpOnly flag |
| 5 | Server binds to 127.0.0.1 only (localhost) | ✅ | `-H 127.0.0.1` in package.json |
| 6 | No data accessible without authentication | ✅ | All API routes check session |
| 7 | Logout clears session cookie | ✅ | `auth/logout/route.ts` |

## Role-Based Access Control

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 8 | Viewer cannot create/edit/delete data | ✅ | All write endpoints use `requireEditor()` |
| 9 | Only admin can access activity logs | ✅ | `requireAdmin()` on `/api/activity` |
| 10 | Only admin can access audit reports | ✅ | `requireAdmin()` on `/api/audit-reports` |
| 11 | Only admin can delete licences | ✅ | `requireAdmin()` on DELETE `/api/licences/[id]` |
| 12 | Only admin can change settings | ✅ | Admin check on PUT `/api/settings` |

## Input Validation & Injection Prevention

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 13 | All PUT routes use field whitelisting | ✅ | `src/lib/utils/whitelist.ts` applied to all routes |
| 14 | No raw request body passed to Prisma update | ✅ | Fixed: all 8 previously vulnerable routes |
| 15 | HTML sanitization on user inputs | ✅ | `sanitizeHtml()` on product names, ingredients |
| 16 | SQL injection prevented by Prisma ORM | ✅ | Prisma uses parameterized queries |
| 17 | applicationClass validated (I, II, III only) | ✅ | `validateApplicationClass()` |
| 18 | XSS via dangerouslySetInnerHTML | ⚠️ | Used for AI-generated HTML in document preview. Low risk in Electron. |

## Data Security

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 19 | Database is local SQLite (no cloud) | ✅ | `prisma/dev.db` on local disk |
| 20 | API key stored in local DB only | ✅ | Never sent externally except to Anthropic API |
| 21 | API key masked in GET response | ✅ | Shows `••••` + last 4 chars |
| 22 | Machine off = zero access | ✅ | No external server, no cloud DB |
| 23 | File uploads size-limited (50MB) | ✅ | Checked in `/api/attachments` |
| 24 | File uploads stored locally in `data/attachments/` | ✅ | Organized by entity type/ID |

## Audit Trail

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 25 | Every login tracked with IP + user agent | ✅ | ActivityLog table |
| 26 | Every data export logged (who, when, format, purpose) | ✅ | Tracked in both AuditLog and ActivityLog |
| 27 | Every file download logged | ✅ | `trackActivity("download", ...)` |
| 28 | Every file upload logged | ✅ | `trackActivity("upload", ...)` |
| 29 | Every data change logged (create/update/delete) | ✅ | AuditLog table with user ID |
| 30 | Monthly audit report generation | ✅ | POST `/api/audit-reports` |
| 31 | Audit logs are append-only (no delete API) | ✅ | No DELETE endpoint for ActivityLog or AuditLog |

## Network Security

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 32 | No external ports open | ✅ | Binds to 127.0.0.1 |
| 33 | No cloud database | ✅ | Local SQLite only |
| 34 | HTTPS not required (localhost only) | ℹ️ | Would need HTTPS for web deployment |
| 35 | No CORS issues (same-origin) | ✅ | All requests from localhost:3000 |

## Known Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Dark Reader causes hydration warnings | Low | `suppressHydrationWarning` added |
| AI-generated HTML in document preview | Low | Electron context, no external users |
| No CSRF token | Low | Desktop app, session-only cookies |
| No rate limiting on API | Medium | Add if deploying as web app |
| No password complexity rules | Medium | Add before multi-user deployment |
