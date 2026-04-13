---
description: Run all #ui visual tests from TEST_JOURNEYS.md
---
Run all #ui visual and layout tests from docs/TEST_JOURNEYS.md.

Instructions:
1. Read docs/TEST_JOURNEYS.md — find all entries tagged `#ui` and the VISUAL REGRESSION CHECKLIST
2. For each, check the visual element on http://localhost:3000
3. Record pass/fail

The #ui commands:
- @dash:activity-feed — Activity feed displays correctly
- @import:drag-drop — Drag and drop zone visible and functional
- @import:preview-cancel — Back button from preview works
- @table:click-row — Row click opens detail panel (flex layout, no overlap)
- @table:sort — Column headers sortable with direction indicator
- @detail:status-badge — Green/red dot for active/inactive
- @detail:scroll — Panel scrolls independently of table
- @detail:pdf-view — Inline PDF preview works
- @detail:close — Close button closes panel, table expands back
- @company:role-badges — QAP, Senior Official badges displayed
- @nav:active-highlight — Current page highlighted in sidebar

Visual checklist: Login centered, dashboard cards in grid, table aligned, detail panel right-side, import modal tabs visible, settings API key masked
