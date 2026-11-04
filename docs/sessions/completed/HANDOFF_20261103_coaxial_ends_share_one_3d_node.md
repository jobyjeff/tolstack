---
priority: med
depends_on: []
model: opus
hitl: false
---

# HANDOFF 2026-11-03 — coaxial_ends_share_one_3d_node: a joint whose features are concentric is one node in the scene, and the 2D DAG keeps its components apart

Source: Jeff's forge note `20261103T165357_43vf96` (2026-11-03): *"cylindrical
features (pivot points vs radial stacks): The issue is that cylindrical
features may be used for position (such as the linkage mount points) but may
also have multiple concentric features (bushings etc) chained together. This
means if you use the center point as the 3d DAG node then all of the coaxial
nodes sit in the same location on top of each other. This is probably fine for
these simpler joints, just let the entire joint be represented with a single
node and split the components up (thickness of bushing, clearance to fastener,
etc) in the 2d DAG."* That is the ruling.

Baseline: `master` with `the_model_is_drawn_in_the_scene` (10-26) and
`a_leader_starts_at_the_mark_it_names_on_every_tier` (10-30) landed. The
anchor rule as expanded 2026-10-26
(`C:\workspace\dispatch\docs\strategy\HANDOFF_20261026_one_graph_drawn_twice_strategy.md`):
per node an anchor = the bound face's fitted feature when a binding exists
(sphere centre, bore-axis midpoint), else the body's +X-bias section centre;
lines per edge; the scene exports anchors to the shell for the seam leaders.
Scope: the scene's model layer in `apps/annotate/scene.js` (and whichever
module builds the anchor set and the `model anchors` message), the shell's
seam-leader consumer in `apps/viewer/topology_app.js` only where a merged
node changes what it receives, `docs/DAG_TOPOLOGY.md` / `docs/ANNOTATION_SURFACE.md`
for the rule, tests and browser checks. Do NOT touch the 2D DAG's layout
(`views/topology.js`), the rail rows, the grid or the chart.

## Deliverables

1. **Concentric ends merge into one 3D node.** When two or more nodes' anchors
   are **coaxial** (fitted axes parallel within a small angle and the axis
   midpoints within a radius-scaled distance of a common axis) or **coincident**
   (centres within ε), the scene draws **one** node at the joint — the merged
   anchor — and the edges between the merged members (a bushing's thickness,
   a clearance to a fastener, a coaxiality) are **not drawn as 3D lines**: they
   have no length to show. Edges leaving the joint to other nodes attach to
   the merged node. The thresholds are two named constants with the
   measurement that chose them in the lesson (take the live P2 scene: the
   pitch plate spindle bore vs hub spindle bore, the gas-spring mount
   bushings vs the piston body once `the_slide_joint_is_the_mounts_bushings_against_the_piston_body`
   lands, the pitch-link spherical centres) — calibrated so the linkage mount
   points stay distinct nodes and only genuinely concentric stacks merge.
2. **The 2D DAG is untouched**, and the seam leaders still read: every 2D
   node of a merged joint leads to the one 3D node (fan-in at the scene side),
   drawn by the existing leader code from the anchors message, which now
   carries the merged anchor for each member node id. Hovering any member
   lights the one 3D node; hovering the 3D node lights every member's 2D
   node and grid row.
3. **A node with no anchor is not drawn at the origin.** Nodes whose parts
   have no installed mesh (P2: `piston_cover_*`, `vpa_end_stop_feature`,
   `piston_end_stop_face`, `piston_rod_end_bore`, `ring_gear_hub_seat`,
   `brake_hub_mount` — `ISSUE_20261027_design_the_model_layer_draws_a_star_at_the_assembly_origin_and_runs_the_blade_lines_1400mm_outboard.md`)
   draw no node and no line; the edges that touch them are listed in the
   pane's head line count ("7 nodes not placed") rather than fanned from the
   hub centre. The blade's mid-span anchors (x ≈ 1388 mm) stay unless the same
   issue's option for a near-root anchor is cheap; decide and record.
4. **The rule is written** in `docs/DAG_TOPOLOGY.md` ("one graph drawn twice"
   or where the 3D anchor rule lives): one paragraph — a joint is one 3D node;
   its internal components are 2D-only edges; unplaced nodes are absent, not
   at the origin.

## Definition of done

- On P2 (`http://127.0.0.1:8000/tolstack/viewer/` → Blade pitch at the end
  stops → 3D pane): the spindle coaxiality pair is one node; the pitch-link
  centres remain distinct; no star at the origin; hovering a merged member's
  grid row lights the one 3D node. Before/after screenshots at the as-modelled
  frame and one sweep frame in the lesson.
- `node apps/annotate/run_tests.cjs` green with value-level pins on the live
  P2 anchor set (which node ids merged, the merged anchor coordinates to
  0.01 mm); `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`
  green (the seam-leader checks for a merged member);
  `node scripts/run_mutation_witness_tests.mjs --changed-since integration`
  witnesses the thresholds; `venv-win/Scripts/python.exe -m pytest -q` green.
- Issue routed here (`triaged` + `handoff:` first, `resolved` after):
  `ISSUE_20261027_design_the_model_layer_draws_a_star_at_the_assembly_origin_and_runs_the_blade_lines_1400mm_outboard.md`.
- Lesson (`docs/sessions/lessons/LESSONS_20261103_coaxial_ends_share_one_3d_node.md`):
  the two thresholds and the P2 measurements that set them; the merged-node
  table; what happened to the blade anchors.
