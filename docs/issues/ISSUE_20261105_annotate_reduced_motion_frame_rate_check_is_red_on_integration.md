---
type: bug
priority: med
status: triaged
area: apps/annotate (sweep playback, browser check)
reporter: agent
found_by: docs/sessions/HANDOFF_20261105_everything_in_3d_is_transparent_until_an_action_needs_a_face.md
handoff: docs/sessions/HANDOFF_20261106_the_annotate_pacing_checks_step_a_virtual_clock.md
class: timing_assertion_under_load
resolution: triaged 2026-11-06 (triage) -- class-scoped handoff the_annotate_pacing_checks_step_a_virtual_clock (timing_assertion_under_load, 4 new arrivals since 11-05)
---

# The annotate browser check's reduced-motion frame-rate check is red on integration

`node apps/annotate/run_browser_check.mjs --repo C:/workspace/tolstack`, run on
2026-11-05 twice from the handoff branch and once from a `git archive
integration` copy of `apps/ scripts/ tests/` (same command, `node_modules`
junctioned from the main checkout), fails the same check all three times:

```
FAIL  reduced-motion playback covers (nearly) the same distance in the same wall-clock time regardless of frame rate
      fast: 143.1 fps -> index 48; slow: 11.6 fps -> index 35
```

So it is not caused by that handoff, which does not touch the playback clock.
48 vs 35 points in the same 3000 ms is well outside "nearly". Either the
playback's reduced-motion branch is advancing per frame again somewhere (the
class `ISSUE_20261001_reduced_motion_playback_advances_one_point_per_animation_frame_so_it_ignores_the_speed_control.md`
fixed), or the slow arm's frame throttle is now so slow (11.6 fps, under the
CPU-capped Chrome `scripts/browser_runner.mjs` launches) that whole-point
rounding loses distance. Start by reading the check's slow arm and
`tickSweep`'s reduced-motion path side by side; do not "fix" it by widening
the tolerance before knowing which.

**Addendum, same day — both reduced-motion checks flip run to run.** Five
complete runs (three on the branch, two on the `integration` copy; a sixth
aborted on the box at 4 fps): the frame-rate check above was red in four, and
green on the second integration run; its sibling `the speed control changes reduced-motion
playback's rate` (500 ms, 1x vs 4x) was red in three, one of them the
integration copy (`speed 1x -> index 0; speed 4x -> index 0`, where a passing
run reads `-> index 2`). The same 3000 ms fast arm reached index 48, 56, 58 and
63 at ~140 fps. So these are wall-clock windows the box's load moves, not a
deterministic defect — a check of reduced-motion pacing that steps the page's
clock (`scripts/virtual_clock.mjs`, as `scripts/filmstrip.mjs` does) instead of
sleeping would stop guessing.

The other two reds in the same run are already
`docs/issues/ISSUE_20261028_annotate_browser_check_mock_anchor_checks_are_red_on_integration.md`.
