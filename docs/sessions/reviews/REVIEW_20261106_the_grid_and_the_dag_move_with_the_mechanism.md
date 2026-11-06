---
type: review
handoff: docs/sessions/active/HANDOFF_20261105_the_grid_and_the_dag_move_with_the_mechanism.md
reviewer: agent
date: 2026-11-06
verdict: REQUEST CHANGES
blockers: 1
---

# Review: the_grid_and_the_dag_move_with_the_mechanism

Branch `handoff/the_grid_and_the_dag_move_with_the_mechanism` @ `682380e6` (14
commits). It already contains `integration` @ `dd8e0407`, so `git merge` into the
review branch was a fast-forward. It was **not** landed on `integration`, and is not
an ancestor of it. No prior review exists for this slug, on this branch or anywhere else.

## Verdict: REQUEST CHANGES, 1 blocker

### Blocker: Pause does not pause

- **Location:** `apps/viewer/views/kinematic.js` `stackStopPicker`, with
  `play.onclick = function () { if (ctx.onPlay) ctx.onPlay(!ctx.playing); }`;
  `apps/viewer/topology_app.js` `startPlay` / `onPlay`.
- **What's wrong:** `ctx.playing` is fixed when the page renders. Clicking Play
  calls `startPlay()`, which does not re-render: it relabels the button "Pause" in
  place with `VA.syncPoseControl`. So the second click still calls
  `onPlay(!false)` = `onPlay(true)`. That goes to `startPlay()`, which returns early
  because `posePlay` is already set, and the sweep keeps cycling. The page's only
  way out of play is then a stop button, the slider, the angle field or leaving
  the study. Deliverable 1 asks for "play/pause that cycles the sweep".
- **Measured on the real projection**, using a filmstrip scenario. It boots the
  study, clicks Play, waits 800 ms, then clicks the button again (now labelled
  "Pause"):
  - stepped clock, 300 ms page-time frames: the angle went 13.4 → 19.4 → 25.4 →
    31.4 → 37.4 → 43.4, and the button still said "Pause";
  - `--real-time`: the angle went 36.2 → 61.2 → 59.6 over 4.4 s.
- **Why the suite is green:** the fast test `the pose control: play, …` clicks
  the button once and asserts `played == [true]`. No tier clicks it a second time.
  The `pose-play` filmstrip scenario only starts play.
- **Suggested fix (the tactical agent's to make, with a test):** make the handler
  read live state rather than the render-time flag. For example, toggle on
  `posePlay` inside the page's handler, or have the button read its own
  `aria-pressed`. Add a test that clicks Play and then Pause and asserts that the
  pose stops moving and the page renders the paused pose. This could be a fast
  test through a page-level seam, or a `[real]` browser check. The fix is a line or
  two, but it needs a test to be trusted (prong 2), so I have not made it inline.

### Should-fix (part of the rework round, not yet filed)

The rework round inherits these. Under REQUEST CHANGES the handoff still owns
them.

1. **The mutation-witness record does not pass.** The lesson records
   `--changed-since integration`: 32/51 witnessed, 9 left to the sweep, so
   **10 entries the run reached are NOT WITNESSED**. The lesson also counts 19
   unwitnessed, and calls them "browser entries whose tier was red before the
   mutation". Some are explained by the inherited
   `ISSUE_20261106_two_kinematic_page_browser_checks_still_match_the_old_edge_names.md`.
   The DAG-zoom suite's entries were red because this branch had broken its
   tolerance-width check. That check was fixed in `1a2df183`, but the lesson says
   those entries "were not re-run". A capped run passes only when **every entry it
   reached** is witnessed (`CLAUDE.md`). Re-run them with `--only "<guard>"` for
   the DAG-zoom entries, and record the result.
2. **The full-suite record is from an earlier tree.** It reads 1728 passed / 3
   failed. Two of the failures were fixed afterwards and only
   `tests/test_mutation_witnesses.py` was re-run. That is acceptable for this
   round. The rework's single full run should be at the final tip.

### Accepted calls (checked, no finding)

- **The 3D pane's own transport is not unified with the page's pose.** Deliverable
  1 says "unify, do not duplicate", and the handoff also fences off the annotator.
  The page drives the pane one way: `pause` when its play starts, then `seek <mm>`
  on every frame. The way back is filed as
  `ISSUE_20261106_the_3d_panes_own_play_and_scrub_do_not_move_the_pages_pose.md`.
  That is a reasonable resolution of the conflict.
- **The contribution mode draws linkage terms only, on one yardstick for the whole
  sweep, with the stop terms floored.** The lesson argues for this and the
  alternatives are filed for strategy:
  `ISSUE_20261106_the_contribution_length_mode_leaves_the_stop_position_terms_unscaled.md`.
- **Off a stop, the foot covers the linkage alone, while the stop-position
  sub-stack stays visible with "at the −7 deg stop" in its header.** The handoff
  asked for exactly this: "say so on the row". The grid's total no longer equals
  the sum of the sub-stacks shown, which a reader could stumble on. That is a
  design question for after Jeff has used it, not a defect.
- **The pose is not in `VA.DEEP_LINK_PARAMS`.** The lesson's reason is sound: that
  list is the sibling repo's contract.

## What I verified

- **Lesson arithmetic** against `play_cycle.json`: 28 frames 250 ms apart, angle
  −7.0 → max 71.0 → −5.0, grid top 697 → 731 px. All match the lesson.
- **The interpolation** (`rowAtPose`, `VA.kinematicPoseFold`): it is a linear read
  in the fractional index of projection numbers, with no fold in JS. A pose on a
  stop point uses `stops[]` (the per-stop fold). The `[real]` stop-pose and
  three-bars tests exist and are enrolled with witness specs.
- **Tolerance-stack mandatory checks 1–7:** not applicable. The diff adds no stack
  element, band, `source_ref` or `fold()` change; `fold()` is untouched, and JS
  reads the projection's magnitudes rather than computing them. There is no new
  traced ratio to report.
- **Universal checks:** the filed issues all carry valid frontmatter with
  `found_by:` and no `handoff:`. The lesson and shots arrive as `A`, not `M`. The
  only shared path written was the tactical agent's gitignored scratch root
  (`data/scratch/gridpose`). Nothing renders a command or an internal id to the
  reader.

## Tests run (pre-merge risky subset, review worktree, at `682380e6`)

- `pytest -q` on `test_kinematic_pose_pace`, `test_js_python_vocabulary`,
  `test_viewer_readme_doc_facts`, `test_viewer_deep_link_contract`,
  `test_architecture_inventory`, `test_mutation_witnesses`,
  `test_projection_freshness`, `test_tolerance_stack`, `test_provenance`,
  `test_thermal_exception_list`, `test_claims_registry`, `test_app_type_scale`,
  `test_js_vocabulary_is_generated`: **377 passed** (127 s).
- `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack/data/scratch/gridpose`:
  **648/653**. The freshness line paired every projection with `cdedc51a`. The 5
  reds are the five `[real] … worksheet must be readable` checks. They fail
  because the tactical scratch root has no `docs/` (the overlay's "re-add what it
  removed" trap), not because of this diff.
- `node scripts/run_viewer_browser_tests.mjs --repo …/gridpose --only "kinematic"`:
  **24/26**. Both reds are the inherited old-edge-names issue, which matches the
  lesson.
- Two filmstrip runs of a scratch Play→Pause scenario: the blocker above.
- Not run: the full suite (it is owed after an APPROVE merge, and this is not one)
  and the mutation-witness gate (should-fix 1 is the author's to close first).

## For the next round

- The overlay gains a **Recurring bugs** entry for this shape: a toggle reading a
  render-time flag on a control that is synced in place.
- The review branch fast-forwarded to `682380e6`. The rework will push more
  commits to `handoff/…`, and the next review merges those on top.
