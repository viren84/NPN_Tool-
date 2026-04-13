---
description: Run ALL 130+ tests from TEST_JOURNEYS.md
---
Run ALL tests from docs/TEST_JOURNEYS.md — the complete test suite.

Instructions:
1. Read the FULL docs/TEST_JOURNEYS.md
2. Execute every test command in order:
   - Section 1: All page tests (auth, dashboard, licences, applications, company, ingredients, submissions, settings, search)
   - Section 2: Cross-system regression (R-01 through R-10)
   - API endpoint tests (all groups)
   - Data integrity checks
3. Show a running summary as you go
4. At the end, show final report:

```
TOTAL: X tests
PASSED: Y
FAILED: Z
SKIPPED: W

Failed tests:
- @command:name — reason
- @command:name — reason
```

This runs 79+ page tests + 10 regression tests + 40+ API tests + 7 integrity checks = ~130+ total checks.
