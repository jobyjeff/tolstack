---
priority: med
depends_on: []
model: sonnet
hitl: false
---

# HANDOFF 2026-11-06 — the_annotate_pacing_checks_step_a_virtual_clock: the reduced-motion and speed checks stop measuring the box's load

Source: class `timing_assertion_under_load`, which had four new tolstack arrivals since the
11-05 sweep. That is over the three-arrival threshold, so this is the sweep's one class-scoped
handoff. Its lever is the 10-29 one: wait on settled state, or step a clock, instead of sleeping
on wall time. The 11-05 class port, `the_seam_and_rail_checks_wait_on_settled_state`, landed it
for the viewer. This handoff takes it to the annotate check. Issues:
- `docs/issues/ISSUE_20261105_annotate_reduced_motion_frame_rate_check_is_red_on_integration.md` (med)
- `docs/issues/ISSUE_20261105_the_annotate_speed_control_check_reads_index_0_at_both_speeds_under_load.md` (low)

Baseline: tolstack master `15dae286`. Scope: `apps/annotate/run_browser_check.mjs`'s two
reduced-motion checks and their mutation specs. Use `scripts/virtual_clock.mjs` the way
`scripts/filmstrip.mjs` does. Do NOT touch the playback code unless deliverable 1 finds a real
defect, and do NOT touch the kinematic suite in `scripts/run_viewer_browser_tests.mjs` (owned
by `the_kinematic_study_reads_the_republished_sweep_and_its_checks_match_by_id`).

## Why

The two checks flip from run to run. Over five runs, `reduced-motion playback covers (nearly)
the same distance in the same wall-clock time regardless of frame rate` was red in four
(fast 143 fps → index 48, slow 11.6 fps → index 35). Its sibling `the speed control changes
reduced-motion playback's rate` was red in three (`1x → index 0; 4x → index 0`). The same
3000 ms fast arm reached index 48, 56, 58 and 63. Those are wall-clock windows that the box's
load moves.

## Deliverables

1. **First, rule out a real defect.** Read the slow arm and `tickSweep`'s reduced-motion path
   side by side. The 10-01 class (`ISSUE_20261001_reduced_motion_playback_advances_one_point_per_animation_frame…`)
   was "advances per frame". If the playback is per-frame again, fix that, and that is the
   finding.
2. **Then step the page's clock.** Both checks drive playback from a stepped virtual clock and
   assert on index after N simulated ms at two frame rates, or two speeds. They must not sleep
   wall time. Assertions stay as strict as today's intent ("nearly the same distance";
   "4x is faster than 1x"). **Never widen a tolerance to clear it.**
3. Each check's mutation spec still witnesses it. Prove it with the witness tier
   `--changed-since master`.

## Definition of done

- The annotate browser check passes the two checks in 5 consecutive runs. Run them at least
  once while another suite is running, and quote the counts.
- Default and annotate tiers green per CLAUDE.md.
- Lesson (`docs/sessions/lessons/LESSONS_20261106_the_annotate_pacing_checks_step_a_virtual_clock.md`):
  defect or not (deliverable 1), and the 5-run record.
