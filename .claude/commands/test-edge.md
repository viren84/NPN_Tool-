---
description: Run all #edge tests from TEST_JOURNEYS.md
---
Run all #edge tests from docs/TEST_JOURNEYS.md.

Instructions:
1. Read docs/TEST_JOURNEYS.md
2. Find ALL entries tagged `#edge`
3. For each, execute the test and record pass/fail

The #edge commands:
- @auth:bad-password — Wrong password → error, no session
- @import:corrupt-pdf — Non-PDF/corrupt file → error card, others continue
- @import:batch-guard — Same NPN twice in batch → dedup
- @table:empty-state — No licences → empty state message
- @sync:not-found — Fake NPN → "not found"
- @sync:duplicate-guard — Duplicate lnhpdId → clear error
- @detail:dedup-same — Same file same entity → dedup
- @detail:dedup-cross — Same file different entity → warning
- @search:empty — No results → graceful empty state
- @error:network-sync — Network drops mid-sync → data unchanged
- @error:claude-down — AI unavailable → graceful error
- @error:corrupt-pdf — Bad PDF → extraction fails, others continue
- @error:duplicate-lnhpd — Two records same lnhpdId → error message
- @flow:empty-state-recovery — Delete all → empty state → import → works
