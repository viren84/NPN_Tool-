---
description: Run all #export tests from TEST_JOURNEYS.md
---
Run all #export tests from docs/TEST_JOURNEYS.md.

Instructions:
1. Read docs/TEST_JOURNEYS.md
2. Find ALL entries tagged `#export`
3. For each, execute the test and record pass/fail

The #export commands:
- @export:bulk-csv — Export All → multi-row CSV, 55 columns
- @export:excel — 3-sheet XLSX (summary, ingredients, claims+risks)
- @export:csv — Single licence CSV, 55 columns, 1 row
- @table:bulk-export — Select rows → Export Selected CSV
- @editor:export-package — Application JSON package export
- @kb:export-csv — Ingredient KB CSV export
