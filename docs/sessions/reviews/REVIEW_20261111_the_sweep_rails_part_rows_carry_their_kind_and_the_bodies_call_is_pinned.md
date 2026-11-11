---
type: review
handoff: docs/sessions/active/HANDOFF_20261110_the_sweep_rails_part_rows_carry_their_kind_and_the_bodies_call_is_pinned.md
reviewer: agent
date: 2026-11-11
verdict: APPROVE
blockers: 0
---

# Review — the sweep rail's part rows carry their kind; the Bodies call is pinned

Diff is minimal: one line in `missingPartRow` (`railLook(li, AA.RAIL_ROW_KINDS.part)`), two new `[real]`
checks (every Bodies part row carries the part kind, with a vacuity guard requiring a missing row; Bodies
list order and part counts equal the projection's `bodies[]`, and `pitch_plate` has both piston heads --
derived, not literals), the guard-enumeration pin (865/832 -> 868/835), and three witness specs.

## Verified (in this review worktree, node_modules junction to main checkout, `--repo C:/workspace/tolstack`)
- `--only "rail holds still"`: 17/17; the four missing-part rows all carry the part kind (`without the part kind: []; with no model: 4`).
- `--only "the model drawn alone and led"`: 6/6.
- `run_mutation_witness_tests.mjs --changed-since integration`: 5/5 witnessed (3 new specs + 2 neighbours), 0 left to the sweep.
- `pytest -q` after merge: 1927 passed, 1 skipped, 3 deselected (the documented worktree-only `test_viewer_js_suite` red), 496 s.
- The "why was it green" answer (check narrowed by `a14bc991`, not skipped) matches that commit's subject and diff scope; the new check reads the pane's own `#sweep-tree` rows, which is the right place.

## Findings
None blocking. Nit: the new Bodies-order check filters the rail ids to declared bodies before comparing order, so an extra non-declared body would not fail it; acceptable since the part-count check covers declared ones.

Not run here: the whole browser TRUTH tier (batch-merge only), per CLAUDE.md.
