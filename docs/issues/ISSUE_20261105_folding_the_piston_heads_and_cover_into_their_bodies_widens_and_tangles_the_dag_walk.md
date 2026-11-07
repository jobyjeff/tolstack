---
type: feature
priority: low
status: deferred
area: viewer/dag-layout
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261105_the_piston_heads_and_cover_ride_with_their_bodies_in_the_kinematic_model.md
class: dag_layout_policy
defer_until: class:dag_layout_policy
resolution: deferred 2026-11-06 (triage) -- low defers by default; class trigger (the topology-layout brief)
---

# Folding the piston heads and cover into their bodies widens and tangles the DAG walk

`the_piston_heads_and_cover_ride_with_their_bodies_in_the_kinematic_model` wanted
the two piston heads in `pitch_plate` and the cover in `base` (the handoff's
preferred fold) and measured it: on `topology_vpa_pitch_linkage.json` the body-major
walk went from 14 to **15 columns**, and `layout_crossings` from
`branch 16 / close 70 / leader 50` to **`24 / 84 / 74`**, while the plate went
from five blocks to four. Both are pinned in `tests/test_topology_projection.py`
(`test_the_product_models_crossings_and_width_are_pinned`,
`test_every_body_of_the_product_model_is_one_block_of_the_walk`).

So the three parts are declared `rides_with` their hosts instead
(`docs/DAG_TOPOLOGY.md`, "Bodies"): still three single-part containers on the DAG,
posed with their hosts in 3D. The honest model is the fold, since they *are* parts
of those rigid bodies; the cost is the layout, which is a local-search result
(`_improved` stops at a local minimum), not something the fold does to the graph.

For a strategy session: whether the walk should be improved so a fold costs
nothing (then drop `rides_with` from the three bodies and put the parts in their
hosts — the 3D model's rider rule is then dead code and can go), or whether
`rides_with` stays as the way to say "moves with, drawn apart".
