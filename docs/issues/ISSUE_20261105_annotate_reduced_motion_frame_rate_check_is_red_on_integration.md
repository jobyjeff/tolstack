---
type: bug
priority: med
status: open
area: apps/annotate (sweep playback, browser check)
reporter: agent
found_by: docs/sessions/HANDOFF_20261105_everything_in_3d_is_transparent_until_an_action_needs_a_face.md
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

The other two reds in the same run are already
`docs/issues/ISSUE_20261028_annotate_browser_check_mock_anchor_checks_are_red_on_integration.md`.
