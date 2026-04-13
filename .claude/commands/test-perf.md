---
description: Run all #performance tests from TEST_JOURNEYS.md
---
Run all #performance tests from docs/TEST_JOURNEYS.md.

Instructions:
1. Read docs/TEST_JOURNEYS.md — find all entries tagged `#performance`
2. Measure response times and rendering speed
3. Record pass/fail with timing

The #performance commands:
- Table with 100+ licences → renders < 2s
- Bulk sync 50 products → completes with 300ms spacing
- Global search → results < 500ms
- 20-PDF batch import → reasonable time, progress shown
- Excel export full dataset → < 5s
- Each page load → < 1s from navigation
