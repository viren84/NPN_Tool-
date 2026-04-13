---
description: Show test command quick reference dashboard
---
Show the TEST QUICK REFERENCE panel below. This is the user's pinned command dashboard.

After showing the panel, ask: "Pick a command to run, a #tag group, or type a keyword to search."

---

## TEST QUICK REFERENCE

### Smoke Test (P0 Critical Path — run these first)
| # | Command | What It Tests |
|---|---------|--------------|
| 1 | `@auth:login` | Login works, session set |
| 2 | `@import:single-pdf` | PDF upload → preview → import |
| 3 | `@import:dual-pdf` | 2 PDFs same NPN → 1 product |
| 4 | `@sync:single` | LNHPD sync fills all fields |
| 5 | `@detail:info-grid` | 4-row info grid populated |
| 6 | `@detail:hc-link` | "View on HC" link works (not 404) |
| 7 | `@export:csv` | Single licence CSV export |
| 8 | `@app:create` | New PLA application |
| 9 | `@editor:generate-all` | Generate 11 documents |
| 10 | `@table:bulk-delete` | Bulk delete + cascade cleanup |

### Most Used (Top 10)
| Command | Tag | One-Liner |
|---------|-----|-----------|
| `@import:single-pdf` | #import | Upload 1 PDF → licence created |
| `@sync:single` | #sync | Sync button → 6 HC endpoints |
| `@detail:info-grid` | #detail | Info grid shows all 4 rows |
| `@table:search` | #table | Search bar filters table |
| `@export:excel` | #export | 3-sheet Excel download |
| `@auth:login` | #auth | Valid login → dashboard |
| `@editor:add-ingredient` | #application | Add medicinal ingredient |
| `@search:ctrl-k` | #nav | Ctrl+K opens global search |
| `@sync:duplicate-guard` | #sync | Duplicate lnhpdId → error |
| `@import:dup-replace` | #import | Replace existing NPN |

### Tag Groups (run all tests in a group)
| Tag | Count | Run It |
|-----|-------|--------|
| `#import` | 14 | `/test-import` |
| `#sync` | 8 | `/test-sync` |
| `#detail` | 12 | `/test-detail` |
| `#security` | 8 | `/test-security` |
| `#edge` | 8 | `/test-edge` |
| `#export` | 6 | `/test-export` |
| `#application` | 14 | `/test-app` |
| `#data-flow` | 5 | `/test-flow` |
| `#api` | 6+ | `/test-api` |
| `#backup` | 4 | `/test-backup` |
| `#ui` | 6 | `/test-ui` |
| `#performance` | 4 | `/test-perf` |

### Combo Runs
| Name | What | Command |
|------|------|---------|
| Full Import Pipeline | import + sync + detail | `/test-import` then `/test-sync` then `/test-detail` |
| Security Audit | auth + security + api | `/test-security` |
| Edge Cases | all boundary tests | `/test-edge` |
| Everything | all 79+ tests | `/test-all` |

### Search
Type `/test-search <keyword>` to find commands (e.g., `/test-search duplicate`, `/test-search csv`)
