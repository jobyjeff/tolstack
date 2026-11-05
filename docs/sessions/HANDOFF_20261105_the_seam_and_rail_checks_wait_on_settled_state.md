---
priority: med
depends_on: []
model: opus
hitl: false
---

# HANDOFF 2026-11-05 — the_seam_and_rail_checks_wait_on_settled_state: four browser sub-checks that go red under load wait on an event, not a wall-clock window

Source: the 2026-11-05 triage sweep's class tally. `timing_assertion_under_load` / `flaky_browser_check`
has four live tolstack members, three of them filed since 11-04:
- `docs/issues/ISSUE_20261104_the_scene_tree_pick_leaders_check_is_flaky.md` (med)
- `docs/issues/ISSUE_20261104_the_seam_leader_screenshot_row_checks_are_intermittent.md` (med)
- `docs/issues/ISSUE_20261105_the_rail_filter_face_click_tint_check_fails_again_in_a_loaded_full_run.md` (low)
- `docs/issues/ISSUE_20261102_the_unbound_contributor_row_hover_check_fails_in_a_loaded_full_run.md` (low)

Baseline: master at or after `1dce46ad`. Scope: `scripts/run_viewer_browser_tests.mjs` (the four suites
named below) and, only where a check needs a settled-state signal the page does not yet emit, a
minimal test hook in `apps/viewer/`. Do NOT touch the annotator's binding logic
(`apps/annotate/sweep.js`), which is owned by the staged `the_annotator_reads_a_nodes_declared_face`.

## The lever (proven, not new)

The class's registry row (`dispatch/class_programs.toml`, `timing_assertion_under_load`): **wait on an
event, a barrier, or a poll-until-settled with a generous deadline. Never assert a tight wall-clock
window.** tolstack already ported it to four viewer checks in
`docs/sessions/completed/HANDOFF_20261029_viewer_browser_checks_wait_on_settled_state.md`. Read that
handoff and its lesson first; this is the same port applied to the next four. The 10-29 rail-filter fix
raised a deadline from 2s to 15s and the check still went red at the 11-05 batch merge, so **a longer
ceiling is not the fix**.

## Deliverables

For each sub-check below: root-cause it as **regression vs. stale/racy check** before touching either.
Then make it wait on the state it asserts. Never weaken what it asserts.

1. `leaders across the seam`, the synthetic-section scene-tree pick sub-check: "a row the scene marks
   selected (a pick there) selects its element here, lighting the same leaders a click on its grid row
   does". Measured 1/4 red on bare integration and 2/5 on a merged tree (11-04). One of those reds was a
   mutation witness's clean run, which then misreported its entry. So this flake also corrupts the
   witness tier, which is why it is med.
2. `leaders across the seam`, the `[real]` screenshot-row sub-checks at 1600x1000 (hovered and selected
   leaders run from the row to its two ends' dots and on to their anchors). Red in a different sub-check
   from run to run, on both trees.
3. `annotate rail filter + face deselect`, the "a real click on the face tints it" sub-check. 33/34 in a
   loaded full run (1357s wall) and 34/34 alone (19s), at the 11-05 batch merge.
4. `3D pane follows the selection`, around line 7240: "resting on a contributor row with no binding tints
   nothing…". This one waits up to 10s for `__lastHighlight === null` across the pane's message seam. The
   issue's review note says the cause is a hypothesis, so measure it.

## Definition of done

- Each of the four suites passes **under load**. Run the full browser tier
  (`node scripts/run_viewer_browser_tests.mjs`) while the default pytest tier runs on the same box,
  **three times**, with zero reds in these four. Quote all three summaries.
- Each suite also passes alone with `--only`.
- The mutation-witness merge tier for any spec you changed (`--changed-since master`) is green.
- Lesson (`docs/sessions/lessons/LESSONS_20261105_the_seam_and_rail_checks_wait_on_settled_state.md`):
  per sub-check, the cause you measured (race vs. real), the signal it now waits on, and any check that
  turned out to be a real regression, filed as an issue rather than papered over.
