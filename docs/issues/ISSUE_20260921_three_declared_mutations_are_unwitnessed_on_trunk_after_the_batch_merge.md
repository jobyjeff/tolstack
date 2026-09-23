---
type: bug
priority: med
status: triaged
area: guards/mutation-witness
reporter: agent
found_by: docs/sessions/HANDOFF_20260921_review_overlay_test_cadence.md
handoff: docs/sessions/HANDOFF_20260922_mutation_witness_repair_and_enrollment.md
---

# Three declared mutations are NOT WITNESSED on trunk after the 2026-09-21 batch merge, and one of them was WITNESSED on its own branch hours earlier

Measured 2026-09-21, `node scripts/run_mutation_witness_tests.mjs` from the
**main checkout** on `master` @ `1d31b69`, clean tree, no `--repo` needed
(cwd already holds `data/`):

```
70/73 declared mutations witnessed
NOT WITNESSED:
  leader-style-survives-a-topology-switch — another check reddened, but not the declared one
  worst-verdict-ranks-worst-last — the tier never reached the witness
  arriving-at-an-element-shows-its-part-in-3d — the witness cannot see the difference
```

**Exit code 0.** The runner reports the three in prose above its total and still
exits 0, so nothing downstream fails — which is why this has not surfaced. Three
distinct diagnoses, so this is not flakiness.

## Why it needs an owner now

`arriving-at-an-element-shows-its-part-in-3d` was reported **WITNESSED** by
`docs/sessions/reviews/REVIEW_20260921_annotate_hint_bar_and_context_autofilter.md`
(its witness table, row for "drops only the scene call, keeps every list
effect") the same day, on the branch that review approved. It is NOT WITNESSED
on trunk now. That is exactly the class the review overlay's *"After you merge
`integration` into your review branch, re-run …"* entry exists for — a witness
whose coverage can be lost **by a merge** while every branch involved is green
alone (`ISSUE_20260916_a_review_merge_is_the_one_place_the_mutation_tier_is_…`).
The entry is in the checklist and the coverage still reached trunk, so the
interesting question is not "was the reviewer told" but **what let it through
the batch merge** — the batch-merge step does not run this tier.

The other two look like previously-catalogued shapes rather than new ones, but
neither is filed against these entry names:

- `leader-style-survives-a-topology-switch` — "another check reddened, but not
  the declared one" is the
  `ISSUE_20260915_card_layout_out_of_flow_mutation_reddens_an_earlier_check_so_it_is_never_witnessed.md`
  shape, a different entry.
- `worst-verdict-ranks-worst-last` — "the tier never reached the witness" is the
  unreached-witness shape from
  `LESSONS_20260916_mutation_witness_tier_reaches_its_checks.md`. Note the
  *guard* this witness belongs to came out of
  `ISSUE_20260915_worst_verdict_ranks_by_an_unguarded_object_key_order.md`, so
  the guard written to close that issue is currently not demonstrably a guard.

## Also worth recording: no baseline existed to compare against

The most recent full-tier count written down anywhere in `docs/` is **54/54**
(`LESSONS_20260916_design_pass_typography.md`). The registry is now 73 entries.
So nobody can currently tell whether 70/73 is a regression from 73/73 or a
long-standing 70, except for the one entry the 2026-09-21 review pins. Whoever
picks this up should state the count they measured and where, so the next
comparison has something to stand on.

## Repro

```
node scripts/run_mutation_witness_tests.mjs          # from C:\workspace\tolstack
node scripts/run_mutation_witness_tests.mjs --only <entry-name>
```

Takes >10 minutes for the full registry. Per-entry `--only` is the cheap way in.
Leaves `tmp/mutation-witness/` in the checkout it runs from — **delete it
afterwards**, or it becomes `live_documents()` dirt
(`ISSUE_20260917_live_documents_walks_gitignored_scratch_in_the_main_checkout.md`).
Deleted after the run that produced the numbers above.

## Provenance of this filing

Found by a docs-only handoff (`review_overlay_test_cadence`) that ran this tier
as a supplementary check beyond its own definition of done. Its diff touches one
markdown file and cannot have caused any of the three.
