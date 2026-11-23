---
type: bug
priority: med
status: deferred
class: serial_queue_head_of_line_blocking
defer_until: 2026-12-05
resolution: deferred 2026-11-21 (triage) -- med beyond tolstack's budget of 3 (spent on the three batch-merge handoffs plus one unroutable high); a design call with options, re-triage on wake
area: annotate/exec-queue
audience: strategy
reporter: agent
found_by: docs/sessions/HANDOFF_20261119_the_map_pin_hover_lights_its_bound_face_in_the_scene.md
---

# A hover waits behind the pane opening its model before the scene lights it

The 3D pane runs every command the page posts through one serial queue
(`AA.ExecQueue`, `apps/annotate/exec_queue.js`; `apps/annotate/app.js`'s
`annotate:exec` listener). Opening a model posts `isolate parts <the model's
parts>`, and `scopeToParts` opens the named parts one after another and then
**the rest of the mesh store** as faint context, all inside that one queue
entry. Every later `light` (the page's hover and selection) waits for it.

Measured on the real end-stop model (`vpa_end_stop_v2`), main checkout's data,
by timing each `loadPart` and each `annotate:exec` / `annotate:result` from the
map suite (2026-11-19):

| run | `isolate parts` posted → answered | a pin hover posted → drawn in the scene |
|---|---:|---:|
| quiet box | 3.0 s → 20.9 s | 15.4 s → 20.9 s (5.5 s) |
| busy box | 23.8 s → ~110 s (one part alone 25.5 s) | 76.0 s → 109.9 s (34 s) |

So for the first tens of seconds after the pane opens, hovering anything on
the map, the tree or the grid lights the page's three surfaces at once and the
scene not at all, then all at once later. Nothing tells the reader the pane is
still opening.

Not a regression: the queue and `scopeToParts` were unchanged across the
window in which the map suite's pin-hover check went red; that check was
fixed by waiting for the queue to drain (the handoff above). This is the
product side the check was hiding.

**Options** (a design call, so strategy's):

1. Let `light` skip the queue. It sets `state.light` and redraws overlays.
   Whether `setLightLayers` tolerates a part that is not open yet is
   unchecked. `applyLight` would also need re-running when each part finishes
   loading.
2. Answer `isolate parts` once the named parts are open, and load the store's
   context parts outside the queue.
3. Show that the pane is still opening, in the pane's status word.

Recommendation: 2. It is what made the wait long, and both 1 and 3 leave a
queue that is tens of seconds deep. The staged
`a_bind_on_the_pitch_plate_writes_in_seconds_and_says_so_while_it_waits`
measures bind latency on the same pane. If its timing table finds a press
waiting in this queue, this issue is the same cause.

## Sighting 2026-11-22 -- a_body_row_in_the_nav_takes_a_resting_hover_every_time

The same queue, on the kinematic page (v1, the pitch linkage's sweep, main
checkout's data, `--only "3D pane follows"`). After the run's bodies were up
(`__sweep.bodies`, 0.5 s) a `scene-view` posted behind everything the page had
posted took **14.9 s** to be answered. A body row hovered in that window was not
lit in the scene for the whole 20 s the check allows.

New here: the wait is not only the `light` queued. The pane is a same-origin
iframe, so it runs on **the page's own main thread**, and the opening work
(a CPU profile over the window: `_loadPart` 2.8 s, `classifyFaces` 2.7 s,
`setLightLayers`/`AA.faceSubGeometry` 1.3 s, three.js `render` 2.6 s, long
tasks of 0.3-3.1 s back to back) starves the page too: Playwright's
`locator.hover` stalled at "performing hover action" (the input event was not
acknowledged) and a 1.5 s `waitForFunction` poll returned after 15 s. A reader
would feel the whole page, nav included, lag for those seconds. So option 2
shortens the queue but, if the context parts still load on this thread, not
the lag; whatever is chosen should be measured by input latency on the page,
not only by when the light lands.
