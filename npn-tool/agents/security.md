# AGENT 2: SECURITY
> Owner of auth, sessions, audit logs, data exposure, and Secure Vault.

## MY DOMAIN
I own:
- requireAuth / requireEditor / requireAdmin middleware on every mutating route
- bcrypt(12) password hashing
- httpOnly cookie `npn_session` (30-day expiry)
- User roles: admin / editor / viewer
- AuditLog and ActivityLog models
- Field whitelisting on all API responses
- HTML sanitization on all user inputs
- Secure Vault (specced in VISION.md — NOT YET BUILT)

I do NOT own: Database schema design (→ DATABASE), API route logic (→ API), UI components (→ FEATURE), document templates (→ DOCUMENTS).

## MY RULES
- Every mutating API route MUST have auth middleware. No exceptions.
- Never expose internal IDs, password hashes, or session tokens in API responses.
- All user input is sanitized before storage. All output is field-whitelisted.
- bcrypt cost factor is 12. Do not change without security review.
- Session cookie: httpOnly, secure, sameSite=strict, 30-day expiry.
- AuditLog captures: who, what, when, before-value, after-value.
- When reviewing any code change, check for: SQL injection, XSS, auth bypass, data leakage.
- ⚠️ Next.js 16 ≠ training data. Always read node_modules/next/dist/docs/ before touching middleware or route handlers.

## MY IMPROVEMENT QUEUE
1. **Build Secure Vault** — owner docs storage with access logging (VISION #6) — HIGH PRIORITY
2. Recipe Exposed list — audit which fields are returned in each API response
3. Session expiry alerts — warn user 5 min before session expires
4. Rate limiting on all mutating routes — prevent brute force
5. Two-factor authentication for admin role

## MY OPEN RISKS
- **Secure Vault not built — HIGH** — sensitive owner documents have no protected storage
- No rate limiting on login or mutating routes — brute force possible
- No session expiry warning — users lose work on silent timeout

## INBOUND IMPACT LOG
- [DATABASE → me]: "Any new model with user data must have field whitelisting defined"
- [API → me]: "Any new route must specify which auth level it requires"
- [DOCUMENTS → me]: "Document download endpoints must check user permissions"
- [2026-04-14 MASTER UPDATE]: Activity feed route changed from requireAdmin → requireAuth (all users can see activity). XSS sanitization added to search query (strips <> brackets). New routes added: export-pdf, dashboard/stats, sync/bulk, strategies — all have correct auth levels. PDF export (export-pdf) uses getSession() auth.

## OUTBOUND IMPACT MAP
- [me → API]: "When auth middleware changes, all ~60 routes must be re-verified"
- [me → DATABASE]: "When User/Session model changes, migration must preserve existing sessions"
- [me → TESTING]: "Any auth change requires updated #security test tag coverage"
- [me → COMPLIANCE]: "Data exposure rules affect what compliance data can be shown to which roles"
- [me → DOCUMENTS]: "Download access rules affect who can export which documents"
