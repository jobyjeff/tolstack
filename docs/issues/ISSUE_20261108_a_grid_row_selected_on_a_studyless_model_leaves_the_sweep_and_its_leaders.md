---
type: bug
priority: med
status: open
area: viewer/pane-redrive
reporter: agent
audience: strategy
found_by: docs/sessions/active/HANDOFF_20261108_the_scene_draws_the_model_alone_and_every_node_it_places_has_a_leader.md
---

# A grid row selected on a studyless model leaves the sweep, and takes every leader with it

On v2 (`vpa_end_stop_v2`, no study open) with the 3D pane open and the P2 run
loaded **from the pane** (its run picker, or `sweep latest`), clicking a grid
row re-drives the pane: `VA.annotateParamsFor` maps a topology-mode edge
selection to `goto <topology> <edge>`, and `cmdGoto` leaves sweep mode for
bind mode before it does anything else. Measured 2026-11-08
(`tests/debug_scene_alone_and_leaders.mjs`, shot
`docs/sessions/lessons/shots/the_scene_draws_the_model_alone_and_every_node_it_places_has_a_leader/6_v2_row_selected.png`):

- the scene is back at the as-modelled pose, the sweep's bar gone;
- "In this model" lists the edge's one part (the hub) and "Other parts (48)";
- every leader across the seam goes: bind mode has the model layer off by
  default, so the scene posts no anchors (`.seam__leader` 21 → 0).

Selecting a **DAG node** does not re-drive (its params are unchanged), so the
pane stays in sweep mode and that node's leader takes the accent
(`5_v2_node_selected.png`). Jeff's DoD for the handoff asked for "a row
selected with its leader in the accent"; on a studyless model that is only
reachable from the DAG side today.

Out of that handoff's scope: the re-drive lives in `topology_app.js`'s
selection/launch code, not the seam functions it was fenced to.

Options, for a strategy call:

1. **A sweep the reader loaded is kept across a selection on the same
   topology** — the shell re-drives with `highlight <topology> <edge>` (what a
   kinematic page already posts) instead of `goto`, when the pane is in sweep
   mode on the page's own topology. Recommended: smallest, and it is the
   kinematic page's existing behaviour.
2. A studyless model page launches the pane in sweep mode on its newest run
   (as the model row in the nav already does), so the shell knows the pane is
   in sweep mode and selections there are highlights.
3. Bind mode turns the model layer on by default when embedded, so the
   leaders survive the jump (they then point at as-modelled positions).
