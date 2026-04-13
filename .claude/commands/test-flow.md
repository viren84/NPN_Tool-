---
description: Run all #data-flow pipeline tests from TEST_JOURNEYS.md
---
Run all #data-flow end-to-end pipeline tests from docs/TEST_JOURNEYS.md.

These are the most important cross-system tests — they verify full pipelines work end-to-end.

Instructions:
1. Read docs/TEST_JOURNEYS.md — CROSS-SYSTEM REGRESSION TESTS section
2. Run each pipeline test in order
3. Record pass/fail with notes

The #data-flow pipeline tests:
- @flow:import-to-export (R-01) — Upload PDF → sync → export CSV → verify synced fields in CSV
- @flow:dual-pdf-to-detail (R-02) — 2 PDFs same NPN → 1 product, 2 attachments in detail panel
- @flow:sync-to-hc-link (R-03) — Sync → info grid filled → HC link works
- @flow:bulk-delete-cascade (R-04) — Bulk delete → dashboard count drops → CSV excludes deleted
- @flow:search-to-sync (R-05) — Ctrl+K search → navigate → sync → data updated
- @flow:app-to-export (R-06) — App → ingredients → claims → generate docs → export JSON
- @flow:attachment-dedup (R-07) — Same file same entity = dedup, different entity = warning
- @flow:empty-state-recovery (R-10) — Delete all → empty state → import → works again

Also includes:
- @dash:stats-accuracy — Dashboard counts match DB
- @import:auto-enrich — Import fires auto-sync
