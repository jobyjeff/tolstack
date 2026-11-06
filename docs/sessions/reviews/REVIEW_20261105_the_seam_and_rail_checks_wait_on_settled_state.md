---
type: review
handoff: docs/sessions/active/HANDOFF_20261105_the_seam_and_rail_checks_wait_on_settled_state.md
reviewer: agent
date: 2026-11-05
verdict: APPROVE
blockers: 0
---

# Review 2026-11-05 — the_seam_and_rail_checks_wait_on_settled_state

The work is test harness only: `scripts/run_viewer_browser_tests.mjs`, one
re-anchored mutation spec, two new issues, two dated addenda on 10-29 issues,
and a lesson. It does not touch `apps/` or `apps/annotate/sweep.js`. The stack
provenance checks (mandatory 1–7) do not apply, because no stack, topology or
element value changed.

This is the first run of this slug. No prior report or lesson exists, and
every artifact in the diff arrives as `A`. The two issue files arrive as `M`,
but only to append addenda. `integration` had moved 11 commits (the
`the_annotator_reads_a_nodes_declared_face` landing). The merge was clean and
added no conflict markers.

## What I verified

**The causes and the waits, one by one:**

- **Seam pick, hover and click** (`seamShows`). The old `drawnAfter(before)`
  accepted any draw-counter increment, which is a weaker predicate than the
  assertion. The new wait reads the drawn path's `seam__leader--<state>`
  class, the same thing the assertion reads. It is bounded at 15 s, and on a
  timeout the assertion still fails. Each assertion keeps its full conjunct
  set, including the dim-the-rest and grid-rail clauses, so nothing was
  weakened.
- **`[real]` screenshot rows.** `liveSettle`'s signature gained draw states
  and the two rects. That makes the settle strictly stronger.
  `traceFaults`/`traceHolds` are clause-for-clause the old `traceHolds`; I
  checked all seven.
- **Rail filter face tint** (`sceneStill`). Every field the barrier reads
  exists: `scene.dirty` and `requestRender` (`apps/annotate/scene.js:392-416`),
  `renderer.getPixelRatio`, `camera.aspect`, and `window.__scene`
  (`app.js:6148`). So the barrier is neither vacuous (an undefined `dirty`) nor
  always false (a throw). To confirm, I probed it with a temporary log line in
  the merged tree, since reverted: `sceneStill true 24ms`, and the suite went
  34/34.
- **Unbound contributor row.** `__lastHighlightNote` is written only on the
  no-face branch (`app.js:714`). Both notes `planHighlight` can return name
  the edge (`commands.js:1200,1207`), and the assertion still demands
  `/no binding/`. The wait is therefore keyed on this row's own command and
  cannot be satisfied by the preceding `highlight clear`.
- **Re-anchored witness `b1a6d21a#2`.** The new `find` occurs exactly once in
  `apps/viewer/topology_app.js` (line 1793, inside `paneHoverTarget`'s
  `data-id` branch). The lesson's argument holds: the old anchor was on a
  branch the grid-row hover never runs.
- **Out-of-list fixes.** The `holdLight()` and `bodyRow` waits are in the
  same suite and were needed for the DoD's "whole suite green". Each one has
  an issue addendum or a new issue. For `holdLight`, stepping the pointer
  masks a real product defect. That defect is filed as
  `ISSUE_20261105_a_nav_scene_row_rebuilt_under_a_resting_pointer_drops_the_scenes_hover_light.md`
  (frontmatter in contract), which is what the handoff asked for.

**DoD:**

- **Three loaded full runs.** The lesson quotes all three: 41/41, 40/41 and
  41/41. The one red was `suite file://`, which is not a target suite and is
  filed. All four target sub-checks were green in every run.
- **The load was weaker than the batch merge's.** The lesson says so itself:
  each pytest overlapped only the first quarter of its browser run. Its
  stronger load helper was refused by auto mode, and that refusal is recorded
  under Blocked actions. I accept the literal reading.
- **`--only`.** Each suite passed alone, quoted.
- **Witnesses.** The `--changed-since master` run was 10/10. Every
  `--only` entry the hunk selection missed was WITNESSED.
- **Lesson arithmetic.** It re-adds: 3 in 9 = 1 in 4 + 2 in 5. The lesson
  states plainly that three greens do not prove a 1-in-N flake is fixed,
  which is the right reading of the overlay's "N green runs" entry.

## Tests (this review)

- **Pre-land subset** (after merging into the review branch, before landing):
  `pytest -q tests/test_mutation_witnesses.py`: **44 passed**.
- **Target suites, merged tree, `--repo C:/workspace/tolstack`:**
  - rail filter 34/34
  - seam 26/26 (run beside the full pytest)
  - 3D pane 32/32 (run beside the full pytest)
- **Full default tier, merged tree, review worktree:** `1 failed, 1723
  passed, 1 skipped, 2 deselected in 379.89s`. Recorded at 381 s, inside
  budget. The one failure is the expected worktree red,
  `test_viewer_js_suite` with no projection here. That tier ran separately:
  `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` was
  **635/635**. This repo's conftest prints no contention header lines.
- **Witness merge tier:** `--changed-since integration` on the merged tree;
  the result is under "Witness run" below.

## Findings

No blockers and no should-fixes.

**Nits:**

1. **`sceneStill()`'s result is discarded** (`run_viewer_browser_tests.mjs`,
   `testAnnotateRail`). A 15 s timeout falls through to the aim silently. The
   face-tint DIAG line prints the canvas, buffer and aspect, so a red still
   names its cause. Adding `stillOk` to that DIAG line would close it.
2. **The draw-counter wait survives at two other sites in `testSeamLeaders`:**
   column resize, and unlit hide (`drawnAfter(beforeResize)` and
   `drawnAfter(beforeHide)` plus a 150 ms sleep). Neither has been seen red,
   and both assert geometry that their own trigger causes, so I am not filing
   an issue. Instead the shape is now in the overlay, so the next red there is
   recognised.

## Overlay

Two edits to `docs/prompts/REVIEW_AGENT.md`:

- a second shape on the existing wait-predicate entry: a draw counter is not
  the draw's content;
- a new entry: a hover held by a resting pointer across a DOM rebuild, where
  the test-side fix requires the product issue.

## Witness run

`node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack --changed-since integration`,
run on the merged tree: **10/10 witnessed, 10/10 reached in 16m49s; 0 left to the sweep**, exit 0.
The 10 include the re-anchored `b1a6d21a#2` and the scene-tree pick entry `eb9eaa42`.
The selection note says 2 of the runner's entries anchor more than 30 lines
from every hunk, so they are left to the scheduled sweep. Recorded as merge tier,
1009 s.

**Verdict: APPROVE.**

## Landing

At landing, `integration` had moved again: it now carried the
`a_two_row_cylinder_band_fits_as_a_cylinder` merge, which touches annotate
`face_geometry.js`, `feature_geometry.py`, the topology, and three witness
specs. It does not touch `run_viewer_browser_tests.mjs`. That merge
(`git merge integration`) was clean, the overlay included, and left no
markers. The fast-forward landed before I re-ran the risky subset. I re-ran
it on the landed tree straight afterwards: `tests/test_mutation_witnesses.py`
**44 passed**.
