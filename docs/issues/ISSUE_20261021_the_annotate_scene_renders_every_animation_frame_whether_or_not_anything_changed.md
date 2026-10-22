---
type: bug
priority: low
status: open
area: apps/annotate/scene.js
reporter: agent
found_by: docs/sessions/HANDOFF_20261021_browser_runners_take_the_slot_and_free_the_box.md
---

# The annotate scene renders every animation frame whether or not anything changed

`AnnotateScene`'s constructor starts
`const animate = () => { requestAnimationFrame(animate); this.controls.update(); this.renderer.render(this.scene, this.camera); }`
and never stops it. Every frame is drawn, even when the camera, the parts and
the sweep are all still.

On a GPU that is invisible. Headless, on this workstation, WebGL is SwiftShader
(software, a thread per core). With the real pitch-linkage meshes open a frame
takes longer than a frame, so Chrome's GPU process never idles. Measured
2026-10-21: 3.6–5.9 cores busy through the annotate check's real rail pass, and
~13 cores in the incident that froze the box
(`ISSUE_20261021_a_browser_diagnostic_held_thirteen_cores_...`). The browser
runners now cap their Chrome at a few cores (`scripts/browser_runner.mjs`,
`scripts/browser_cpu_cap.py`), which bounds the damage but not the cause: the
page still asks for all the CPU it can get, and a capped page renders slower.

The fix is the usual one: render on demand. Mark the scene dirty on a camera
change, a part opening or closing, a highlight, a resize or a sweep frame, and
draw in the rAF only when it is dirty (OrbitControls' `change` event is the
camera half). The sweep clock already runs its own rAF loop in `app.js` and
would mark the scene dirty when the frame moves. Check against the screenshot
pass's "wait for a rendered frame" logic in `run_browser_check.mjs`, which
waits on rAF ticks and would need a forced render instead.

Also worth knowing: a real user's laptop without a capable GPU pays the same
cost.
