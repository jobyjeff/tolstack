---
type: chore
priority: low
status: open
area: tests/mutation-witnesses
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20260922_stack_page_check_card_balance_sheet.md
---

# The stack page's results-table guards have no mutation-witness entry

`stack_page_check_card_balance_sheet` (2026-09-22) added eleven fixture
checks, two `[real]` walks and three browser sub-checks for the stack page's
new results table. None is declared in `scripts/mutation_witnesses.json`, so
nothing proves any of them can go red — the same gap
`ISSUE_20260922_the_balance_sheet_guards_have_no_mutation_witness_entry.md`
records for the handoff one week before this one, and
`ISSUE_20260922_the_nav_status_icon_guards_have_no_mutation_witness_entry.md`
for the one before that.

Candidate rows, strongest first. Every one of these mutations was reachable
by hand during the session and two of them actually happened, which is why
they lead:

| mutation | file | expected witness | suite |
|---|---|---|---|
| `.rs-row__name` / `.rs-marks` get `display: flex` moved back onto the `<td>` (a `<td>` that is not `display: table-cell` leaves the column model) | `apps/viewer/style.css` | `every cell of the results table starts at its own header's left edge…` | `typography pass's visual rules` |
| `.restable` loses `table-layout: fixed` | `apps/viewer/style.css` | same | `typography pass's visual rules` |
| `checkRecord` appends the guidance to the row's name cell instead of the fold | `apps/viewer/views/stack.js` | `every check's authored guidance is in its fold, word for word, and never on the scan line` | fast tier |
| `excludedLine` renders `VA.splitAuthoredFinding(term).whole` instead of `.name`, or the fold drops the whole term | `apps/viewer/views/stack.js` | `an excluded term's name is on the row and its rationale one fold deep` | fast tier |
| `pathRow`'s verdict cell is left empty instead of `—` with the group's sentence | `apps/viewer/views/stack.js` | `a path states it has no verdict rather than leaving the cell blank` | fast tier |
| `appendResult` starts a fold open | `apps/viewer/views/stack.js` | `a result's record is folded until the row is asked for it` | fast tier |

Each has to be **run** before it is declared — the 2026-09-21 enrollment pass
found two of twenty-six proposed rows were not witnessed by the check they
named, and a declared-but-unwitnessed row is worse than no row.

```
node scripts/run_mutation_witness_tests.mjs --repo C:\workspace\tolstack
```
