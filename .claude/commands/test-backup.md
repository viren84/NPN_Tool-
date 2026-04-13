---
description: Run all #backup data integrity tests from TEST_JOURNEYS.md
---
Run all #backup data integrity tests from docs/TEST_JOURNEYS.md.

Instructions:
1. Read docs/TEST_JOURNEYS.md — DATA INTEGRITY CHECKS section
2. Run each integrity check
3. Record pass/fail

The #backup commands:
- DB backup test — Copy dev.db → restore → all data intact
- CSV roundtrip — Export CSV → verify all fields present
- Excel verify — Export Excel → 3 sheets, data correct
- Attachment files — data/attachments/ files match DB records
- Orphaned attachments check — No Attachment records pointing to deleted entities
- JSON validity — All JSON fields parse without error
- Unique constraint check — No duplicate lnhpdId, no duplicate NPN+entity attachments
- Cascade delete check — Deleting parent removes all children
