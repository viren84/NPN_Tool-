---
description: Run all #api endpoint tests from TEST_JOURNEYS.md
---
Run all #api endpoint tests from docs/TEST_JOURNEYS.md.

These are direct API tests — no UI, just curl/fetch calls to verify each endpoint works.

Instructions:
1. Read docs/TEST_JOURNEYS.md — API ENDPOINT TESTS section
2. For each API test group, use curl or fetch to test endpoints
3. Verify status codes and response bodies
4. Record results in a table

API test groups:
- @api:crud-licences — GET/POST/PUT/DELETE /api/licences (7 tests)
- @api:sync — POST /api/sync/lnhpd/:id (4 tests)
- @api:attachments — POST/GET/DELETE /api/attachments (7 tests)
- @api:bulk-delete — POST /api/licences/bulk-delete (4 tests)
- @api:export — GET /api/licences/export, export-excel (4 tests)
- @api:upload — POST /api/upload/process, scan-folder, batch (6 tests)
- @api:search — GET /api/search (4 tests)
- @api:auth — POST /api/auth/login, register, logout, GET /api/auth/me (7 tests)

Key checks:
- Every endpoint without cookie → 401
- Viewer role → 403 on write endpoints
- Editor role → 403 on delete endpoints
- All responses return correct Content-Type
