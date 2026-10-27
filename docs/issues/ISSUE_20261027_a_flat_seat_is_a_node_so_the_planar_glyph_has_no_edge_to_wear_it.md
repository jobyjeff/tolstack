---
type: feature
priority: low
status: open
area: tolerance_stack/topology
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261026_the_dag_draws_bodies_as_containers_and_joints_as_symbols.md
---

# A flat seat is a node, so the planar glyph has no edge to wear it

The handoff expected "the hub-face seats `planar`" among the product model's
gap edges. There are none. A face-to-face seat between two parts is **one
`mating_surface` node** in this model (`tolerance_stack/topology.py`, the
comment on `EDGE_KINDS`, and `docs/DAG_TOPOLOGY.md`, "What a hard contact is
*not*"), so no gap edge stands there to carry an `interface`. The product
model has fourteen such nodes between two bodies (`tan_link_mount_hub_face`,
`hub_vpa_mount`, `piston_cover_mount_flange_seat` and others). Each is a
joint the DAG now draws only as a dot on a body boundary.

So `planar` and `thread` ship as glyphs with no live example (the glyph table
in `docs/DAG_TOPOLOGY.md` says so). The glyph is ready. What is open is where
a planar contact should show:

1. On a `mating_surface` node whose two parts are in two bodies. This needs an
   optional `interface` on a node (only `planar` makes sense there today), and
   the DAG draws the glyph beside the dot.
2. Keep `interface` on gap edges only. A planar gap edge then exists only for
   two flat faces with a measured clearance between them, which no committed
   topology has.

Recommendation: 1. It is a small schema addition, and it is where Jeff's
"interface between two flat parts" is in this model.
