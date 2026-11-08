---
type: bug
priority: low
status: resolved
area: annotate/browser-check
reporter: agent
class: timing_assertion_under_load
found_by: docs/sessions/active/HANDOFF_20261105_the_rail_holds_still_and_takes_the_face_jeff_picked.md
handoff: docs/sessions/HANDOFF_20261106_the_annotate_pacing_checks_step_a_virtual_clock.md
resolution: triaged 2026-11-06 (triage) -- folded into the class-scoped the_annotate_pacing_checks_step_a_virtual_clock -- handoff completed 2026-11-08 -- closed automatically by dispatch when handoff `the_annotate_pacing_checks_step_a_virtual_clock` moved to completed/; not independently verified.
---

# The annotate speed-control check reads index 0 at both speeds under load

`node apps/annotate/run_browser_check.mjs`, in the "reduced motion playback
timing" pass (`reducedMotionTimingPass`), failed on 2026-11-05 with:

    FAIL  the speed control changes reduced-motion playback's rate
          speed 1x -> index 0; speed 4x -> index 0

The two 3000 ms runs just before it in the same pass moved normally, and both of
their checks passed. The 500 ms runs use uncapped `requestAnimationFrame`
(`rafIntervalMs: null`). On a box with several headless browser runs queued
behind each other, the software-rasterised first frames can take longer than
the whole 500 ms window, so neither speed advances at all. The branch that hit
it (`the_rail_holds_still_and_takes_the_face_jeff_picked`) does not touch
playback.

Fix shape: give the speed pair the 3000 ms window, or pin `rafIntervalMs` the
way the frame-rate pair does, so the check compares two runs that both moved.
