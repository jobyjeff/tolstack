# Lessons — the annotate scene renders only when something changed (2026-10-22)

## What shipped

`AnnotateScene` keeps its rAF loop (cheap) but draws only when `this.dirty`.
`scene.requestRender()` is the single way in; `scene.renderCount` counts frames
actually drawn. The loop still calls `controls.update()` every tick; the camera
reaches `dirty` through OrbitControls' `change` event, which `update()`
dispatches while the view moves — so damping and a drag are both covered by the
one listener (a second `if (update()) dirty` would have hidden a dropped
listener from the witness, so it is deliberately absent).

## Every dirty-marking site (all in `scene.js`)

Camera: the `change` listener; `frameParts` and `frameSweepScene` also call
`requestRender()` explicitly (they set the camera directly, then `update()`).
Size: `resize()`. Parts: `_loadPart` (after the part is added), `unloadPart`,
`setVisible`, `setGhost`, `_drawAt` (every placement change: rest placements,
sweep overrides, repeats). Tints and overlays: `restoreColors`,
`highlightFace`, `highlightFaces` (and `clearHighlight` through
`restoreColors`), `markFace`, `_disposeMarks` (so `clearMarks`/`unloadPart`).
Bind leader: `setBindLeader` (also takes one down). Sweep: `enterSweep`,
`exitSweep`, `setSweepFrame`, `setSweepLayer`, `setSweepEmphasis`,
`setSweepGhost`, `setPartMatrix`.

**The sweep clock in `app.js` needed no edit.** It advances the frame by
calling `setSweepFrame`/`setPartMatrix`/`setSweepGhost`, which mark the scene
themselves; an explicit mark in `app.js` would be a second way in.

Judged not to need one: `_layoutLeader` (runs inside a drawn frame; its inputs
are camera and canvas size, both marked), `autotestPick` and
`pickSameFaceBothWays` in the browser check (move the camera and restore it
before any frame; the raycast reads the camera, not a drawn frame),
`pick`/`sweepHover` (read-only; `pick` refreshes matrices itself).
Grep for scene-object mutation outside `scene.js`: none in `app.js`; only the
browser check reaches into `scene.camera`/`parts` (above).

## Browser check frame waits

Three sites assumed "an rAF tick = a drawn frame": the two settle waits
(lines ~937/~1127) now use `framesRendered(page, 2)` (forces a render, waits on
`renderCount`); the real-mesh playback rate (`countFrames`) now reports
`renderCount` over wall clock, i.e. drawn frames, which is what the report
meant. The reduced-motion pass overrides rAF and reads `sweep.fps` from the
sweep clock, so it was untouched and still passes (79.5 fps vs 15.2 fps, both
index 70).

## Witnesses

Enrollable browser guards live in `scripts/run_viewer_browser_tests.mjs`, not
in `apps/annotate/run_browser_check.mjs` (not a guard source). The two new
guards are a new suite there, `testAnnotateRenderOnDemand`; the pin in
`guard_enumeration.mjs` moved 581/548 → 583/550. Both specs run `WITNESSED`
with `--only <hash>`; a spec's `suite` is the **full** registry label (a
substring that `--only` accepts is rejected by
`test_every_browser_spec_names_a_suite_the_registry_dispatches_on`).
A worktree has no `node_modules`; I junctioned the main checkout's in for the
runs and it is gitignored.

## CPU (cores busy, all Chrome processes, 1 s samples, whole annotate check)

| | mean | max | result |
|---|---|---|---|
| before (HEAD scene + check) | 3.64 | 5.12 | 66/67 (one miss under load) |
| after | 2.61 | 4.06 | 67/67 |

Honest caveat: this is the **whole** check, not the idle slices of it — the
check legitimately renders while it plays a sweep or scrubs, and the sampler
sums every Chrome on the box (other agents' included), so it understates the
idle win. The cleaner fact is the witness: a still scene draws 0 frames/s
where it drew every tick. The `[real]` rail pass was within that run.

## Screenshots

`LESSONS_20261022_…changed.shots/`: `2_sweep_frame40.png` (after `seek #40`,
the stick figure at that frame) and `3_after_orbit.png` (same frame after a
mouse orbit) — the view differs, so both a sweep-frame advance and an orbit
still draw. Scene counter in that run: 3 at rest, 4 after the seek, 14 after
the drag.

## Verified

- `node apps/annotate/run_tests.cjs`: 213/213 (worktree).
- `node apps/annotate/run_browser_check.mjs`: 67/67 (worktree, own slot,
  data from the main checkout; real rail pass ran).
- Both new witness specs `WITNESSED` (`--only`, not `--full`).
- `pytest -q` in the worktree: 1561 passed, 1 skipped, 1 failed (10m36s); the one failure is `tests/test_viewer_js_suite.py` (no projection in a worktree, by design)
  (red on `tests/test_viewer_js_suite.py` by design when the viewer's real
  tier cannot run here).

## Not run

The whole mutation-witness registry (`--full`), the viewer browser tier and
the viewer fast tier's `[real]` checks — the batch merge owns them. This
change touches no `apps/viewer/` file, but a registry-wide witness whose find
string sits in `scene.js` is the one to watch there.
