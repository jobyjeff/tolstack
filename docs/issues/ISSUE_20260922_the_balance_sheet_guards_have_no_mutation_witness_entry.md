---
type: chore
priority: low
status: triaged
area: tests/mutation-witnesses
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20260922_viewer_summary_balance_sheet.md
handoff: docs/sessions/HANDOFF_20260922_mutation_witness_repair_and_enrollment.md
---

# The balance-sheet guards have no mutation-witness entry

`viewer_summary_balance_sheet` (2026-09-22) added four guards and enrolled two
surfaces in an existing walk. None is declared in
`scripts/mutation_witnesses.json`, so nothing proves any of them can actually
go red — the same gap
`ISSUE_20260922_the_nav_status_icon_guards_have_no_mutation_witness_entry.md`
and `ISSUE_20260922_the_policy_free_residue_guards_have_no_mutation_witness_
entry.md` record for the two handoffs before this one.

Candidate rows, strongest first:

| mutation | file | expected witness | suite |
|---|---|---|---|
| `totalsFoot` returns `null` unconditionally | `apps/viewer/views/topology.js` | `the totals are the projection's numbers, printed verbatim, as footer rows of the contributions grid` | fast tier |
| the totals `<tfoot>` is appended to a table of its own rather than the body table | `apps/viewer/views/topology.js` | `a total lands in the column it totals, to the pixel` | `topology http` |
| `VA.splitAuthoredFinding` returns `{name: whole, rationale: null}` always | `apps/viewer/topology.js` | `[real] an incomplete check states what is missing…` (the `< 90` chars claim) | fast tier |
| `findingRow` appends the rationale as a sibling `<p>` instead of into the fold | `apps/viewer/views/topology.js` | `[real] no study summary explains itself in a paragraph` | fast tier |

Each has to be **run** before it is declared — the 2026-09-21 enrollment pass
found two of twenty-six proposed rows were not witnessed by the check they
named, and a declared-but-unwitnessed row is worse than no row.

```
node scripts/run_mutation_witness_tests.mjs --repo C:\workspace\tolstack
```
