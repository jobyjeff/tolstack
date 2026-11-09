---
type: chore
priority: low
status: deferred
area: design
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261108_the_scene_draws_the_model_alone_and_every_node_it_places_has_a_leader.md
class: topology_layout
defer_until: 2026-12-09
resolution: triage 2026-11-09 -- low, deferred by default; 30-day date
---

# Design: the end-stop model at rest frames a close-up of one large part in a tall pane

The handoff `the_scene_draws_the_model_alone_and_every_node_it_places_has_a_leader`
asked for the v2 pane at rest to be "framed on the mechanism". Its shot
`docs/sessions/lessons/shots/the_scene_draws_the_model_alone_and_every_node_it_places_has_a_leader/1_v2_pane_at_rest.png`
(1700×1500 viewport) shows the pane filled by one large translucent part. No
linkage is visible.

`scene.frameMechanism` already leaves out any occurrence more than
`SWEEP_CONTEXT_RATIO` times the median size. `_frameBox` then sets the camera
distance from the box's size, not from the canvas aspect, so a tall, narrow
pane crops the box sideways. The lesson notes this ("Tight in this tall
portrait pane; at 1100 tall it reads better") and did not file it.

Judgement call: fit the framed box to the canvas's narrower dimension.
