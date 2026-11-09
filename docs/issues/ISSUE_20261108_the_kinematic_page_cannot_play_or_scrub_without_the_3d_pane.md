---
type: feature
priority: low
status: deferred
class: pose_sync
area: viewer/pose
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261108_the_linkage_play_control_is_the_only_one_and_it_moves_everything.md
resolution: triage 2026-11-08: low, default 30-day defer
---

# With the 3D pane closed, the kinematic page has no way to play or scrub its pose

`the_linkage_play_control_is_the_only_one_and_it_moves_everything` made the 3D
pane's ◀ ▶ ▶| and scrub the only transport, as Jeff asked ("consolidate into the
original controls"). The page keeps a typed blade-angle field and the per-stop
buttons, which set the same pose. Where the pane is closed (or the mount has no
3D at all) the grid, the DAG and the chart can still be posed by those two, but
nothing animates them: the pane owns the clock, so no pane means no clock.

Options for a strategy session: leave it (the pane is one click away and is the
control Jeff named); or open the pane when the reader asks to play; or let the
chart itself be scrubbed (a drag on the cursor sets the same pose through the
typed-angle path, not a second transport). Recommendation: leave it until
someone is blocked by it.
