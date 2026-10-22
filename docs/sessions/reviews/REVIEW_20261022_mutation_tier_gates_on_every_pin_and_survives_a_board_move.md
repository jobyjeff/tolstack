---
type: review
handoff: docs/sessions/active/HANDOFF_20261021_mutation_tier_gates_on_every_pin_and_survives_a_board_move.md
reviewer: agent
date: 2026-10-22
verdict: APPROVE
blockers: 0
---

# Review: mutation_tier_gates_on_every_pin_and_survives_a_board_move

Branch `handoff/mutation_tier_gates_on_every_pin_and_survives_a_board_move`
(4 commits), not contained in `integration` at review start. Merged into
`review/<slug>`.

## Merge conflict, resolved here

`DECLARED_GUARDS` in `scripts/guard_enumeration.mjs` conflicted: `integration`
had moved annotate to 213 and browser to 579 (the face-pick handoff), while the
branch repinned its own 206 / 565 / 532. Resolved by taking integration's
counts and recomputing, not by arithmetic: the branch's scan fix (a name
continued in the other quote kind is read whole) moves browser `enrollable` by
-1, so the merged pin is `browser: 579 / 546 / c15b76549239`. Annotate and fast
unchanged. `--unenrolled` shows no pin-moved line after the repin.

## Deliverables

1. Board move: `test_a_cited_handoff_survives_the_board_move` passes; a name in
   none of the three directories still fails. README line added.
2. Tier exit code filters on `pinsMoved` and prints each moved pin's sentence
   and `pinLine`. Planted swap and duplicate exit 1 per the lesson (scratch
   copy); I did not re-plant them, and no pytest pins those two exit codes.
3. `ran ⊆ declared` lives in the browser runner's tail (`ranNotDeclared`); its
   first run found a real scanner defect (13 truncated names), fixed.
4. `tests/test_annotate_js_suite.py` added, `test:annotate` script, CLAUDE.md
   must-run list. **Deviation**: the handoff asked for the same worktree answer
   as the viewer wrapper; it is green in a worktree because the annotate runner
   falls back to the main checkout's data. Disclosed and filed as
   `ISSUE_20261022_the_annotate_real_tier_reads_the_main_checkout_...`. Accepted.

## Tests

Pre-merge risky subset (post-conflict): `tests/test_mutation_witnesses.py` +
`tests/test_annotate_js_suite.py`: 29 passed. Full `pytest -q` in the worktree:
1477 passed, 1 skipped, 1 failed (`test_viewer_js_suite`, no projection in a
worktree, by design) with `-x` stopping there.

## Not exercised

The tactical run could not reach green on the browser tier (stale shared
projection, 5 `[real]` sweep-rail checks) and its `--full` mutation run
skipped 99 viewer entries for the same reason. No browser or app file is
touched by this diff. The batch merge must rebuild projections
(`scripts/rebuild_projections.ps1`) and run the four main-checkout tiers; I did
not, since the main checkout is on trunk and cannot run this tree.
