---
description: Run all #import tests from TEST_JOURNEYS.md
---
Run all #import tests from docs/TEST_JOURNEYS.md.

Instructions:
1. Read docs/TEST_JOURNEYS.md
2. Find ALL entries tagged `#import` (look for commands with `#import` in their header)
3. List them in a table showing: Command | Priority | Status (pass/fail/skip)
4. For each command, read the Action and Expected Result
5. Using the browser preview or app at http://localhost:3000, execute each test:
   - Navigate to the correct page
   - Perform the action described
   - Check if the expected result matches
   - Record pass/fail
6. Show summary: X passed, Y failed, Z skipped

The #import commands to run:
- @import:single-pdf — Upload 1 PDF
- @import:dual-pdf — 2 PDFs same NPN → 1 product
- @import:multi-npn — Multiple different NPNs
- @import:drag-drop — Drag and drop upload
- @import:folder — Folder selection
- @import:scan-path — Server path scan
- @import:dup-detect — Duplicate detection
- @import:dup-bulk — Bulk duplicate actions
- @import:new-product — Import creates new record
- @import:dup-replace — Replace existing
- @import:dup-attach — Attach to existing
- @import:batch-guard — Same-batch duplicate guard
- @import:corrupt-pdf — Error handling for bad files
- @import:auto-enrich — Auto LNHPD sync after import
