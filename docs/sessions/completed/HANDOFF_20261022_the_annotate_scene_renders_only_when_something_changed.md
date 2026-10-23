---
priority: low
depends_on: []
model: sonnet
---

# HANDOFF 2026-10-22 — the_annotate_scene_renders_only_when_something_changed: the annotator draws a frame only when the camera, the parts, a highlight, the size or the sweep frame changed

Source: the 2026-10-22 triage sweep, from
`docs/issues/ISSUE_20261021_the_annotate_scene_renders_every_animation_frame_whether_or_not_anything_changed.md`
(bug, low). It is staged on spare budget because it is the root of the CPU
load the browser slot only bounds on this shared workstation. Baseline:
master at or after `d209fc6`. Scope: `apps/annotate/scene.js`,
`apps/annotate/app.js` (the sweep clock's own rAF loop),
`apps/annotate/run_browser_check.mjs` (its frame waits), and tests. Do NOT
touch `apps/viewer/`, the mutation-witness runner except to add specs, or
`apps/annotate/commands.js` and `suggestions.js`.

## Deliverables

1. **Render on demand.** `AnnotateScene`'s constructor (`apps/annotate/scene.js`,
   around line 263) runs `requestAnimationFrame(animate)` forever,
   calling `controls.update()` and `renderer.render(...)` on every frame.
   Headless on this box, WebGL is SwiftShader (software, a thread per core),
   and a frame with the real pitch-linkage meshes takes longer than a frame.
   Measured 2026-10-21: 3.6–5.9 cores busy through the annotate check's real
   rail pass. Add a dirty flag, set on:
   - an OrbitControls `change` event (the camera; keep damping working: while
     `controls.update()` returns true, stay dirty);
   - a part opened or closed, or a highlight or suggestion tint changed;
   - a resize;
   - a sweep frame advance. The sweep clock in `app.js` marks the scene dirty
     when the frame index moves.

   Draw in the rAF only when the flag is dirty. Name every site that changes
   what is drawn, and grep for any mutation of scene objects outside
   `scene.js`. A forgotten site is a stale frame, which is a correctness bug.
   Expose `scene.requestRender()` as the single way in.
2. **Keep the browser check's frame waits honest.** `apps/annotate/run_browser_check.mjs`
   waits on rAF ticks before it reads pixels or takes screenshots (around
   lines 937, 1127 and 1292–1299; the reduced-motion timing pass overrides
   `requestAnimationFrame` itself). Where a wait assumed "a tick means a new
   frame was drawn", make it force a render or wait on a rendered-frame
   counter the scene exposes. The reduced-motion pass still has to measure
   playback rate against the sweep clock, not the render loop.
3. **Witness it.** Add one browser check that a still scene (no input, sweep
   paused) renders no frames over about 1 s, using a counter on the scene.
   Add another that an orbit drag renders at least one. Enroll both under
   `scripts/mutation_witnesses/`: one spec plants `this.dirty = true` at the
   end of each frame, and one drops the `change` listener.

## Definition of done

- `node apps/annotate/run_tests.cjs` and `node apps/annotate/run_browser_check.mjs`
  are green (67/67 plus your new checks, as of `d209fc6`), run under
  `dispatch slot run --class browser`.
- In the lesson: CPU, measured the same way as the issue (cores busy during
  the real rail pass, before and after), and one screenshot pair showing
  that orbit and sweep playback still draw.
- `venv-win/Scripts/python.exe -m pytest -q` is green after the merge.
- Lesson (`docs/sessions/lessons/LESSONS_20261022_the_annotate_scene_renders_only_when_something_changed.md`):
  every dirty-marking site you found, and any you decided did not need one.
