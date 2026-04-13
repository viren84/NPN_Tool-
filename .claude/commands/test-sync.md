---
description: Run all #sync tests from TEST_JOURNEYS.md
---
Run all #sync tests from docs/TEST_JOURNEYS.md.

Instructions:
1. Read docs/TEST_JOURNEYS.md
2. Find ALL entries tagged `#sync`
3. For each, read the Action and Expected Result, execute the test
4. Show results table: Command | Priority | Pass/Fail

The #sync commands:
- @sync:single — Click sync button → 6 HC endpoints → all fields updated
- @sync:bulk — Bulk sync all licences with 300ms rate limit
- @sync:not-found — Fake NPN → "not found" message
- @sync:duplicate-guard — Duplicate lnhpdId → clear error message
- @sync:api-down — HC API unreachable → graceful degradation
- @sync:mixed-formats — normalize() handles flat array vs {metadata, data}
- @sync:field-mapping — routeOfAdmin, applicationClass, dates all populated
- @sync:idempotent — Sync twice → same result, no data loss
