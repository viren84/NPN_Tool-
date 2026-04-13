---
description: Run all #detail tests from TEST_JOURNEYS.md
---
Run all #detail tests from docs/TEST_JOURNEYS.md.

Instructions:
1. Read docs/TEST_JOURNEYS.md
2. Find ALL entries tagged `#detail`
3. For each, execute the test and record pass/fail

The #detail commands:
- @detail:info-grid — 4-row info grid: summary, form/route/class/type, dates/status, company+HC
- @detail:dosage-summary — One-liner dosage at top
- @detail:hc-link — "View on HC" opens correct product page (not 404)
- @detail:status-badge — Green dot active, red dot inactive
- @detail:ingredients — Medicinal ingredient tags with quantity/potency
- @detail:non-med — Non-medicinal ingredient gray tags
- @detail:claims — Approved claims from LNHPD
- @detail:risks — Risk info grouped by type
- @detail:doses — Dosage cards per population
- @detail:attachments — Source files with download
- @detail:upload-file — Upload button in panel works
- @detail:scroll — Panel scrolls independently
