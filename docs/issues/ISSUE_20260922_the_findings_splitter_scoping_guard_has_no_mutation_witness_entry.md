---
type: chore
priority: low
status: open
area: tests/mutation-witnesses
reporter: agent
found_by: docs/sessions/HANDOFF_20260922_findings_splitter_scopes_to_excluded_terms.md
---

# The findings-splitter scoping guard has no mutation-witness entry

`findings_splitter_scopes_to_excluded_terms` (2026-09-22) added one guard —
*"an edge name's ` -- ` is part of the NAME: a chain row is shown whole while
an excluded term beside it still splits"* (`apps/viewer/tests.js`) — and it is
not declared in `scripts/mutation_witnesses.json`. Same gap as
`ISSUE_20260922_the_balance_sheet_guards_have_no_mutation_witness_entry.md`,
`ISSUE_20260922_the_nav_status_icon_guards_have_no_mutation_witness_entry.md`
and `ISSUE_20260922_the_policy_free_residue_guards_have_no_mutation_witness_
entry.md` record for the three handoffs before it. The handoff correctly did
**not** touch the registry — `HANDOFF_20260922_mutation_witness_repair_and_
enrollment.md` owns that file — so the row has to be written from the
enrollment rail.

The row is unusual in that it needs **two** mutations to be honest, because
the guard asserts both halves of one rule (names whole, terms still split) and
either half alone leaves the other unwitnessed:

| mutation | file | expected witness | suite |
|---|---|---|---|
| `VA.STUDY_FINDING_SOURCES`' `unverified_value` / `no_tolerance_recorded` go back to `reasonSplit: true` | `apps/viewer/topology.js` | *"an edge name's ` -- ` is part of the NAME…"* | fast tier |
| `excluded_from_model` goes to `reasonSplit: false` | `apps/viewer/topology.js` | same guard, plus `an incomplete check's bottom line is visibly qualified…` and `[real] an incomplete check states what is missing ABOVE its number…` | fast tier |

**Both were run in review (2026-09-22), not proposed**, against the merged
tree at `2be1424` with `node apps/viewer/run_tests.cjs --repo
C:/workspace/tolstack`: clean `497/497`, first mutation `496/497` (the new
guard alone), second mutation `494/497` (the new guard plus the two named
above). Re-plant before declaring either row anyway — the 2026-09-22
enrollment review measured 4 of 26 transcribed rows failing to reproduce
3–4 days later.
