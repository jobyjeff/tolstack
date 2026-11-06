---
type: review
handoff: docs/sessions/active/HANDOFF_20261105_the_grid_and_the_dag_move_with_the_mechanism.md
reviewer: agent
date: 2026-11-06
verdict: APPROVE (round 2)
blockers: 0
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

## Re-run 2026-11-06 (round 2): APPROVE

Round 1 was REQUEST CHANGES with 1 blocker (Pause does not pause). It is closed
below, along with both round-1 should-fixes. The rework is three commits on
`handoff/…` (`c7ba3464`, `e075c83b`, `c50b40fd`).

### Round 1's blocker: closed

- **The fix.** The Play button now sends the opposite of its own live
  `aria-pressed`, which `VA.syncPoseControl` keeps current. The page's `onPlay`
  also toggles on `posePlay` and ignores a repeated "play". Either layer alone
  would have stopped the bug. The pause spec mutates the page's layer, and the
  spec says why reverting only the button is invisible to a browser check.
- **Tests.** The fast pose-control test now clicks twice (`played == [true,
  false]`). Two new `[real]` browser guards are enrolled with specs, and the
  browser pin is +2.
- **My own probe, re-run on the merged tree.** Play, then Pause: the angle held at
  15.6 on all four frames, 300 ms apart, and the button went back to "Play". The
  new browser check logged `play/pause: -7.0 -> 8.8 (Pause) -> 21.9 (Play) -> 21.9`.

### Round 1's should-fixes: closed

1. **Witnesses.** The five DAG-zoom entries were re-run with `--only` and all
   witnessed. That is the lesson's round-1 record; I checked its counts. My own
   gate run is below.
2. **Full suite.** The lesson records a full run at the tip (1730 passed, 1
   skipped, 1 worktree-expected failure). My post-merge run is below.

### The merge (conflict carve-out)

`integration` had moved by 20 commits. Two handoffs had landed:
`the_grid_fits_the_screen_and_its_brackets_say_what_nests_in_what` and
`the_piston_heads_and_cover_ride_with_their_bodies_in_the_kinematic_model`.
`git merge integration` conflicted in four files. Resolved in `085bc82f`:

- **`scripts/run_viewer_browser_tests.mjs`.** HEAD added the Play/Pause block and
  integration added the clipping and zoom-box-floor block, both at the same point.
  I kept both. Play/Pause runs first, while the page is still on the kinematic
  study; then integration's block, which visits three studies and returns to the
  kinematic one, as it did before.
- **`apps/viewer/README.md`.** The grid paragraph is integration's: brackets,
  PART/DESCRIPTION, sourcing marks. HEAD still had the older wording there only
  because it had not changed it. The new "The pose" bullet is the handoff's.
- **`scripts/guard_enumeration.mjs`.** Both sides' history comments are kept. The
  pins are re-derived by the census on the merged tree, not by adding the two
  sides: fast `655 / 655 / 7d9f49fbee80` (integration's 646 + this handoff's 9)
  and browser `839 / 806 / 04fd992426a3` (837 + 2).
- **`docs/issues/ISSUE_20261105_the_default_test_tier_ran_18_minutes_on_a_worktree.md`.**
  Both addenda are kept.

I grepped the staged diff for conflict markers and there were none.

### Tests on the merged tree

Projections were rebuilt from `085bc82f` into the gitignored scratch root
`C:/workspace/tolstack/data/scratch/gridpose`, which is the tactical agent's root
re-used. I ran the six builders with `--data-root`; no `--allow-older-tree` was
needed. I also copied `docs/` into the root. The freshness line pairs every
projection with `085bc82fd2a3`.

- **Viewer fast tier** (`node apps/viewer/run_tests.cjs --repo …/gridpose`):
  **655/655**.
- **Risky pytest subset** (the same thirteen files as round 1): **377 passed**.
- **Browser, `--only "the DAG zoom, Fit and the grid header"`:** **45/45**. This
  includes both new Play/Pause checks and integration's clipping check (233 cells,
  none clipped).
- **Browser, `--only "kinematic"`:** **25/27**. The two reds are
  `ISSUE_20261106_two_kinematic_page_browser_checks_still_match_the_old_edge_names.md`
  (open, priority high), which was red on `integration` before this branch.
- **Browser, `--only "leaders across the seam"`:** **26/26**.
- **Mutation witnesses, `--changed-since integration`:** 34/49 witnessed, 49/63
  reached in 29m08s, 14 left to the sweep (budget). Recorded inside the merge-tier
  budget. Of the 15 reached entries that were not witnessed:
  - **14 entries (12 specs)** are in the kinematic suite, which was red before any
    mutation because of the inherited issue above. I appended their names to that
    issue, so the person who fixes it knows to re-run them.
  - **1 entry** (`c0ebdc1b`, leaders across the seam) found its suite red during
    the gate, while the slot was busy with other agents. Re-run alone, the suite
    was green (26/26) and `--only` came back **WITNESSED** (3m26s).
  - No reached entry outside the inherited red is unwitnessed.
- **Full suite, post-merge, review worktree**
  (`C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -p no:cacheprovider`):
  **1 failed, 1733 passed, 1 skipped, 2 deselected in 432.73 s**. Recorded inside
  budget. The one failure is `test_viewer_js_suite_is_green`, red by design in a
  worktree because there is no projection at the worktree path. Its tier ran
  655/655 through `--repo` above. This repo's conftest prints no
  `concurrent pytest processes` / `full-suite lock` header lines to quote.
- **Production data.** The main checkout's `git status` (outside `data/`) and
  `data/projections/viewer/` listing were identical before and after the full
  run.

### Verdict

**APPROVE (round 2), 0 blockers.** Every unfixed finding has an owner:
- the 3D pane's own transport:
  `ISSUE_20261106_the_3d_panes_own_play_and_scrub_do_not_move_the_pages_pose.md`;
- the floored stop terms:
  `ISSUE_20261106_the_contribution_length_mode_leaves_the_stop_position_terms_unscaled.md`;
- the hover curve's missing pose mark:
  `ISSUE_20261106_the_sensitivity_curve_card_does_not_mark_the_live_pose.md`;
- the inherited kinematic reds:
  `ISSUE_20261106_two_kinematic_page_browser_checks_still_match_the_old_edge_names.md`.

Round 1 found no design findings to file.

### Landing: integration moved once more

The first `git fetch . review/…:integration` was refused as a non-fast-forward.
`the_rail_reads_as_a_tree_of_bodies_joints_and_faces` had landed in the meantime.
Merging it again (`ca36a028`) conflicted only in the guard pins. I kept both
sides' comments, and the census re-derived the pins: fast `656 / 656 /
eeee061b0636` (647 + 9) and browser `846 / 813 / 8a4c959f321e` (844 + 2).

Re-run on that tree:
- viewer fast tier **656/656**, with the projections still paired with
  `085bc82f` (no projection input moved);
- the risky pytest subset, **377 passed**;
- the DAG-zoom browser suite, **45/45**, logging `play/pause: -7.0 -> 13.5 (Pause)
  -> 17.7 (Play) -> 17.7`.

The full suite and the witness gate above were run on `085bc82f`, before this
merge. The rail handoff's own review ran both on its side.
