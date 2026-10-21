---
type: bug
priority: med
status: open
area: annotate/sweep-rail
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261020_the_sweep_rail_shows_the_mechanism.md
---

# The sweep rail lists a kinematic study's contributors on a run the study did not fold

`sweep <run> <study>` (and `?sweep=<run>&kinematic=<study>`) accepts any pair.
`cmdSweep` in `apps/annotate/app.js` looks the study up by id in the kinematic
projection and never compares `study.sweep.run_id` with the run it is loading.
The rail then shows the study's ranked rows, with their magnitudes, under the
other run's animation. Nothing marks the mismatch.

This happens on real data today, and the browser TRUTH tier relies on it:
`testAnnotateSweepRail` in `scripts/run_viewer_browser_tests.mjs` boots
`?sweep=vpa-pitch-p2-20261016-235852&kinematic=vpa_pitch_linkage_blade_pitch_at_the_stops`,
but that study folds `vpa-pitch-p2-20261015-013931`
(`ISSUE_20261020_the_blade_pitch_kinematic_study_folds_the_older_p2_run.md`).
So the "six contributor rows at the −7° stop" that the tier checks are 10-15
numbers shown beside the 10-16 linkage. The stop is picked by the frame's
measure value, which hides the mismatch for P2: both runs sweep the same
blade-pitch range.

The viewer's pane cannot hit this, because `VA.annotateParamsFor` sends the
study's own `run_id`. A hand-typed or bookmarked deep link can, and so can any
later caller of the three-word verb.

**What would close it** (the fix needs a test, so it is not the reviewer's to
make inline): when `study.sweep.run_id !== artifact.runId`, either leave the
contributor group out and say why in the console line (the "absent → the group
is absent" rule the handoff set), or show the group with a muted head naming the
run the numbers come from. Then point the TRUTH tier at the study's own run, or
re-point the study at 1016 first (the older-run issue above), so the tier stops
depending on the mismatch.
