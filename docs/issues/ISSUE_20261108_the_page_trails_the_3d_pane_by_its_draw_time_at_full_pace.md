---
type: chore
priority: med
status: open
area: viewer/pose
reporter: agent
found_by: docs/sessions/HANDOFF_20261108_the_linkage_play_control_is_the_only_one_and_it_moves_everything.md
class: pose_sync
---

# The kinematic page trails the 3D pane by its own per-frame draw time at the pane's full pace

With the pane's play running at 1x on a loaded box, the page's angle read-out, grid
and chart cursor were 0.1–0.5 s (3–12 sweep points) behind the pane's frame and caught
up on pause; the first frame after pressing play can stall about a second. The page
draws the latest pose it was told once per display frame (`onPanePose` /
`applyPanePose` / `livePose` in `apps/viewer/topology_app.js`), so the lag is the cost
of one `livePose` (stack build, `VA.applyStackText`, film apply, seam redraw) — it does
not accumulate. At a slow pace the page was on the pane's frame in 27 of 28 readings
(`tests/debug_pane_play_filmstrip.mjs`).

Worth a profile of one `livePose` on the real projection, and of the first frame after
play. No fix attempted here; Jeff has not reported it on his own machine.
