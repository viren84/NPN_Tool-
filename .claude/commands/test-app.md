---
description: Run all #application tests from TEST_JOURNEYS.md
---
Run all #application tests from docs/TEST_JOURNEYS.md.

Instructions:
1. Read docs/TEST_JOURNEYS.md
2. Find ALL entries tagged `#application`
3. For each, execute the test and record pass/fail

The #application commands:
- @app:create — New PLA → form → save → tabbed editor
- @app:delete — Delete cascades (ingredients, claims, docs)
- @app:list — List all applications with status
- @app:readiness — Readiness score percentage
- @editor:basic-info — Edit product name, form, class
- @editor:add-ingredient — Add medicinal ingredient
- @editor:add-non-med — Add non-medicinal ingredient
- @editor:add-claim — Add health claim
- @editor:add-dosage — Add dosage group
- @editor:add-risk — Add risk entry (4 types)
- @editor:generate-all — Generate All → 11 document types
- @editor:doc-approve — Approve document (approvedBy set)
- @editor:ai-research — AI ingredient research
- @editor:export-package — Export application JSON package
