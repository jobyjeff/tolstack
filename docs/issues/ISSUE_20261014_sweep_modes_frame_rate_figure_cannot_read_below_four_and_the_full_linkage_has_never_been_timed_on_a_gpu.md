---
type: chore
priority: low
status: deferred
area: apps/annotate
reporter: agent
found_by: docs/sessions/HANDOFF_20261014_parts_sit_where_the_assembly_puts_them.md
todo: 20261015T015550_cp6rqz
audience: strategy
defer_until: 2026-11-20
class: unmeasured_on_target_hardware
resolution: triage 2026-10-21: low, deferred to 2026-11-20 by default
---

# Sweep mode's frame-rate figure cannot read below 4, and the whole placed linkage has never been timed on a GPU

## What was found

`app.js`'s `tickSweep` keeps a rolling `sweep.fps` (exposed on the dev handle
`window.__sweep`, never on the surface). It is built from the frame interval
**after** the background-tab guard caps it at 0.25 s
(`Math.min((now - last) / 1000, 0.25)`), so it can never read below **4 fps**.
`LESSONS_20261001_kinematic_sweep_animation.md` and
`LESSONS_20261001_the_sweep_frame_loop_does_only_per_frame_work.md` both report
"4 fps headless" from it — which was that floor, not a measurement.

Measured 2026-10-14 by counting `requestAnimationFrame` callbacks over wall
clock (`apps/annotate/run_browser_check.mjs --real`, headless Chrome on
SwiftShader):

| scene | triangles drawn | measured | `sweep.fps` read |
|---|---:|---:|---:|
| 10-01's (7 meshes, run P1 of 10-01) | about 1.15 M | 0.75 fps | 4.0 |
| this handoff's (16 meshes, the pitch linkage placed) | 2,029,770 | 0.37 fps | 4.0 |

The check now reports the counted figure. What is still true:

1. `sweep.fps` itself still reads 4 at any frame rate below 4. Either compute it
   from the uncapped interval (the cap is right for *advancing* playback and
   wrong for *measuring* it), or delete it in favour of the check's counter.
2. **Nobody has timed sweep mode with the linkage placed on real hardware.**
   Software rasterisation is a floor; 2 M triangles is nothing to a GPU, but
   "nothing" is a guess. If Jeff finds it sluggish, the levers are already
   known: the hub (286 solids, of which the mechanism needs none) and the
   design blade, which is now drawn at blade 2 as well as moving at blade 1 —
   `manifest.json`'s per-face `solid_id` allows drawing a subset.

## Done when

`sweep.fps` reads what it measures below 4 fps (or is gone), and one GPU
measurement of `?sweep=<a P1 run>` with the linkage opened is written down.

> **Moved to the strategy backlog 2026-10-16.** This was escalated as a task on Jeff's list (`20261015T015550_cp6rqz`). That was wrong: a todo has no reply box, and its answer would have to be hand-carried into a strategy session. The strategy session that takes this up asks Jeff directly and acts on the answer.

## Addendum 2026-10-27 (the_model_is_drawn_in_the_scene)

The new `model` layer (47 dots, 59 lines, all drawn over the parts) measured
headless (SwiftShader) on P2 embedded in the shell at 1600x1000, playing, by
the TRUTH suite `annotate model in the scene (...)`, which prints and does not
assert: **58.1 drawn fps with the layer, 60.3 without, 56.9 with it again.**
The cost is inside the run-to-run noise of a shared box. Both figures sit far
above the 4 fps floor this issue is about, so the floor is still unread; and
still nothing has been timed on a GPU.
