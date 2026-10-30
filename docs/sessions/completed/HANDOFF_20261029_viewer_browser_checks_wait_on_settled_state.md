---
priority: med
depends_on: []
model: sonnet
hitl: false
---

# HANDOFF 2026-10-29 — viewer_browser_checks_wait_on_settled_state: four viewer browser checks that race the page under load wait on a settled state instead of a fixed pause

Source: the 2026-10-29 triage sweep's over-threshold escalation for class
`timing_assertion_under_load`. Since the previous sweep, tolstack received four
new arrivals in this class:
- `docs/issues/ISSUE_20261028_the_live_drawing_clear_of_the_panel_check_measures_before_the_column_settles.md` (med)
- `docs/issues/ISSUE_20261028_the_p2_seam_leader_check_races_the_scenes_anchor_messages_under_load.md` (low)
- `docs/issues/ISSUE_20261028_crop_lightbox_suite_fails_under_load_on_launcher_focus.md` (low)
- `docs/issues/ISSUE_20261028_two_browser_suites_fail_in_the_full_run_under_load_and_pass_alone.md` (low)

The registry's lever for this class (`dispatch/class_programs.toml`), which
forge proved on 2026-10-28: *wait on an event, barrier or poll-until with a
generous deadline; never assert a tight wall-clock window.* This handoff ports
that lever to these checks. Baseline: tolstack trunk at `c9a9687c` or later.
Scope: `scripts/run_viewer_browser_tests.mjs` and any harness helper it
imports. Do NOT touch `apps/viewer/` behaviour, the mutation witnesses' specs,
or the contact-engine files (`HANDOFF_20261029_the_contact_engine_asks_the_ends_what_shape_they_are`).

## Deliverables

1. **"[real] the whole live drawing is clear of the panel"** (suite
   `annotate flyout`): wait until the column has stopped moving before reading
   `svg.tv__rails`'s left edge. For example, poll until two consecutive frames
   report the same rect, under a deadline of seconds rather than
   milliseconds. The column moves through `syncSceneColumn`, the respine and
   the zoom fit.
2. **`testSeamLeaders`' P2 leader check, and the two checks after it that share
   `liveMeasure`:** wait until two consecutive `__lastAnchors` reads agree
   before measuring, instead of "one draw with any leader, then 600 ms".
3. **Crop lightbox "the launcher takes keyboard focus"** and the
   `annotate rail filter` "a real click on the face tints it" sub-check: poll
   for the focus or tint state with a deadline, in place of the fixed wait.
4. **Never loosen what a check asserts.** Only *when* it reads changes. A check
   that still fails once its state has settled is a real red: report it, and do
   not paper over it.

## Definition of done

- Run `node scripts/run_viewer_browser_tests.mjs` 5 times while a full default
  tier runs concurrently. Report the before and after failure counts for each
  of the four checks; the target is 0 after.
- The witnesses that cover these checks still WITNESS. Run them with
  `node scripts/run_mutation_witness_tests.mjs --changed-since master`.
- Run tolstack's default tier as its `CLAUDE.md` spells it. Record the times
  with `suite-time record`.
- All four issues are resolved, with the commit.
- Lesson (`docs/sessions/lessons/LESSONS_20261029_viewer_browser_checks_wait_on_settled_state.md`):
  - which settled-state signal each check uses;
  - the loaded-run counts.
