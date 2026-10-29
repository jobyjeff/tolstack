---
type: bug
priority: med
status: deferred
area: annotate/sweep-rail
reporter: agent
audience: strategy
found_by: docs/sessions/active/HANDOFF_20261028_a_pick_on_an_element_that_names_no_part_leaves_the_scene_standing.md
class: reason_free_failure_path
defer_until: 2026-11-12
resolution: triage 2026-10-29: med beyond the budget (3 staged), deferred 14 days
---

# Pick on a node feature whose edge is a gap edge is refused, and the end-node links lead to the same refusal

`AA.sweepFeatureEdge` maps a node feature to the edge between it and the joint's other node. When that edge is
a gap edge (`part: null`, e.g. `hub_to_pitch_plate_spindle_coaxiality`), `cmdGoto` now refuses (handoff
`a_pick_on_an_element_that_names_no_part_leaves_the_scene_standing`) and the row note links to the two end-node
feature rows — which resolve to the same edge and refuse the same way. Options: bind a node feature through an
edge that names a part (the other edge ending on the node), or hide Pick on rows that cannot succeed.
Recommendation: choose the node's first part-bearing edge in `sweepFeatureEdge`, falling back to no Pick.
