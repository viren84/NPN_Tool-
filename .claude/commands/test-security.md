---
description: Run all #security tests from TEST_JOURNEYS.md
---
Run all #security tests from docs/TEST_JOURNEYS.md.

Instructions:
1. Read docs/TEST_JOURNEYS.md
2. Find ALL entries tagged `#security`
3. For each, execute the test and record pass/fail

The #security commands:
- @sec:role-viewer — Viewer tries POST/PUT/DELETE → 403 on all
- @sec:role-editor — Editor tries DELETE → 403 (admin only)
- @sec:no-cookie — API call without session → 401
- @sec:xss-input — <script> in product name → sanitized
- @sec:sql-injection — SQL in search → parameterized, no leak
- @sec:file-traversal — Path traversal → rejected
- @sec:api-key-hidden — GET /api/settings → key masked
- @sec:audit-logged — Every mutation → AuditLog entry
- @sec:role-enforcement (R-08) — Full role enforcement across all pages
