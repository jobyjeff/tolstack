---
priority: high
depends_on: []
model: sonnet
hitl: false
---

# HANDOFF 2026-11-08 — the_pane_seek_witness_points_at_the_comparison_the_page_now_makes: re-point the rotted pane-seek mutation anchor, and close the gap that let a rework land with an anchor dangling

Source: the 2026-11-08 triage batch merge (`dispatch/docs/sessions/lessons/LESSONS_20261108_triage_sweep.md`),
which merged `integration` into `master` (`783515c1 -> 7d9772e6`, fast-forward) with
one known red in the default tier, and
`docs/issues/ISSUE_20261108_the_pane_seek_witness_anchor_rotted_on_integration_and_reddens_pytest.md`
(open, high), which already holds the diagnosis.

Baseline: trunk `master` at `7d9772e6` or later. The failure, measured on the merge
candidate (identical to `7d9772e6`) with
`C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q`:
`1 failed, 1867 passed, 1 skipped, 2 deselected` in 525 s. The failing test is
`tests/test_mutation_witnesses.py::test_every_anchor_resolves_to_exactly_one_place`:

> `browser__real-and-a-seek-in-the-pane-lands-the-page-s-angle-on-th__f697d046.json`:
> a `find` matches 0 places in `apps/viewer/topology_app.js`. Anchor:
> `Math.abs(state.kinematicPose - index) > 1e-6`

Scope: `scripts/mutation_witnesses/browser__real-and-a-seek-in-the-pane-lands-the-page-s-angle-on-th__f697d046.json`,
the issue above, and a test or a review-checklist line if deliverable 2 calls for one.
Do NOT change `apps/viewer/topology_app.js` behaviour to fit the anchor back in.

## Deliverables

1. **Re-point the anchor at the comparison the page makes now.** The pose-sync
   code was rewritten by `665e4d34` ("a pane pose the page already holds writes no
   URL"). The candidates are in `apps/viewer/topology_app.js`: `syncPanePose`
   (~l. 3552, its `Math.abs(paneDriver - pose.driver) < 1e-6` early return) and the
   held-pose test near l. 3767 (`Math.abs(held - index) <= 1e-6`). Pick the one
   whose mutation makes "a paused pane's seek is ignored by the page" true, give it
   a `find` that matches exactly once, and confirm with
   `node scripts/run_mutation_witness_tests.mjs --only "<the guard>"` in the main
   checkout that the entry is `WITNESSED`. If no single comparison does that any
   more, retire the spec and say why in the issue and the lesson.
2. **The class, not just the instance.** The rework that broke the anchor was
   reviewed and landed on `integration` with `pytest -q` red on this exact test
   (the issue names round 2's review, `762d16bc`). Find out why: did the review's
   post-merge run not run, run on a different tree, or run and get waved through?
   Write the answer into the lesson. If the answer is a gap in a check or a prompt
   in this repo, fix it here. If it is in dispatch's review prompt, file an issue in
   dispatch instead of editing it.
3. Resolve the issue above with the verifying command and its output.

## Definition of done

- `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q` is green in the main checkout.
- The `--only` witness run for the re-pointed entry reports `WITNESSED`.
- Lesson written to `docs/sessions/lessons/`.
