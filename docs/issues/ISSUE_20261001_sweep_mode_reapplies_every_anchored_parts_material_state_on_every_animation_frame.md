---
type: bug
priority: med
status: open
area: apps/annotate
reporter: agent
found_by: docs/sessions/reviews/REVIEW_20261001_kinematic_sweep_animation.md
class: per_frame_work_that_is_not_per_frame
---

# Sweep mode re-applies every anchored part's material and ghost state on every animation frame, and with the ghost layer on it reallocates a mesh and a material per part per frame

`apps/annotate/app.js::applySweepFrame` runs once per `requestAnimationFrame`
while a sweep is playing (`tickSweep` → `applySweepFrame`). For **every**
anchored part it calls, every frame:

```
state.scene.setGhost(row.sha256, state.transparentParts);
state.scene.setSweepGhost(row.sha256,
  sweep.layers.ghost ? row.placements.map((p) => p.placement) : null);
```

Neither input changes between frames. `state.transparentParts` is a stored
preference, and `p.placement` is the occurrence's recorded `placement_world`,
which is by definition the as-modelled one — the whole point of the ghost
layer is that it does **not** move. Two costs follow:

* **`scene.setGhost` sets `mesh.material.needsUpdate = true`** every frame
  (`apps/annotate/scene.js`, `setGhost`). In three.js that bumps the
  material's version, which makes the renderer release and re-acquire the
  program and re-derive the uniforms for that material on the next render —
  per part, per frame. Seven parts at 60 Hz is 420 of those a second for a
  state nobody changed.
* **`scene.setSweepGhost` is not kept in step, it is rebuilt**: it removes and
  `material.dispose()`s every existing ghost, then allocates a fresh
  `THREE.Mesh` and a fresh `THREE.MeshStandardMaterial` per placement. With
  `layer ghost on` that is an allocate-and-dispose cycle per part per frame.
  `scene._setRepeats`, three functions above it, takes exactly the opposite
  and correct approach, and says why in its own comment ("allocating a
  THREE.Mesh per frame is the one thing here that would show up as a frame
  rate").

Nothing is drawn wrongly — this is cost, not incorrectness — but the measured
playback rate with seven real meshes loaded is 4 fps
(`LESSONS_20261001_kinematic_sweep_animation.md`, "The frame rate"), the one
number Jeff is most likely to feel, and this is work the frame did not need to
do. The ghost-layer half is worse than the measurement suggests, because the
4 fps was measured with `ghost` off (its default).

## Done when

`applySweepFrame` applies ghost/transparency state when it *changes* (the
`transparency` verb, the `layer ghost` verb, a body resolving) rather than on
every frame, or `setGhost`/`setSweepGhost` are made idempotent cheaply — a
`setGhost` that returns early when the material is already in the asked-for
state, and a `setSweepGhost` that keeps its ghosts in step with the list the
way `_setRepeats` does. The frame rate with the ghost layer **on** against
`vpa-pitch-p1-20261001-203656` is reported before and after
(`node apps/annotate/run_browser_check.mjs --real <run-id>` prints it).
