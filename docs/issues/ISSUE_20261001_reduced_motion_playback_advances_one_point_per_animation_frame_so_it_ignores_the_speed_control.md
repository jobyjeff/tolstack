---
type: bug
priority: med
status: resolved
area: apps/annotate
reporter: agent
found_by: docs/sessions/reviews/REVIEW_20261001_kinematic_sweep_animation.md
class: a_rate_bound_to_the_frame_clock
handoff: docs/sessions/HANDOFF_20261001_the_sweep_frame_loop_does_only_per_frame_work.md
resolution: handoff completed 2026-10-01 -- closed automatically by dispatch when handoff `the_sweep_frame_loop_does_only_per_frame_work` moved to completed/; not independently verified.
---

# Under `prefers-reduced-motion`, sweep playback advances one point per animation frame — so it ignores the speed control and runs at whatever rate the display gives

`apps/annotate/app.js::tickSweep`:

```
const next = prefersReducedMotion()
  ? Object.assign({}, AA.sweepAdvance(sweep, dt, count),
    { index: AA.sweepStepIndex(sweep.index, sweep.direction, count) })
  : AA.sweepAdvance(sweep, dt, count);
```

The reduced-motion arm computes `AA.sweepAdvance` (which is the wall-clock
one, `SWEEP_POINTS_PER_SECOND * speed * dt`) and then **overwrites its
index** with a whole-point step. So under reduced motion the sweep advances
exactly one point per animation frame, and three things follow:

* **It is faster than the animation it replaces, not slower.** 80 points at
  60 Hz is 1.3 s end to end; the ordinary path is
  `AA.SWEEP_POINTS_PER_SECOND` = 24 points/s at 1×, i.e. 3.3 s. A reader who
  asked for less motion gets the same sweep in 40% of the time.
* **The speed control does nothing.** `0.25×` and `4×` produce identical
  playback, while the select still shows the value and the `speed` verb
  still reports it.
* **The rate is the display's.** 144 Hz plays it twice as fast as 60 Hz, and
  the 4 fps measured with seven real meshes loaded plays it at 4 points/s.

The *intent* is right and is the handoff's own ("`prefers-reduced-motion`
means step, not animate — same answer the viewer gave"); it is the
implementation that is tied to the frame clock. What reduced motion wants is
the same wall-clock pace with the index snapped to whole points, which is
`AA.sweepAdvance`'s own answer rounded — not its answer thrown away.

Nothing catches it: `AA.sweepAdvance` and `AA.sweepStepIndex` are both pinned
in `apps/annotate/run_tests.cjs`, but their *composition* lives in `app.js`,
which that runner cannot boot, and `run_browser_check.mjs` does not emulate
the media query.

## Done when

Reduced-motion playback advances on the wall clock and honours `speed`
(`Math.round(AA.sweepAdvance(...).index)` is the shape), and
`run_browser_check.mjs` runs one of its playback checks under
`page.emulateMedia({ reducedMotion: "reduce" })` so the composition is
observed rather than argued.
