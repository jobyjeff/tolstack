---
type: feature
priority: med
status: triaged
strategy: docs/strategy/BRIEF_20261030_topology_layout_questions_the_redesign_left_open.md
area: viewer/map
reporter: agent
audience: strategy
found_by: docs/sessions/active/HANDOFF_20261115_the_map_draws_the_end_stop_model.md
---

# What the map does not draw yet, each fenced out of its handoff by name

Handoff `the_map_draws_the_end_stop_model` (2026-11-16) built the map beside
the present DAG and fenced these out so none was half-built. The handoff's
owner ends at Complete; this issue carries them. The strategy draft
(`dispatch/docs/strategy/drafts/DRAFT_tolerance_analysis_over_the_kinematic_model.md`,
"2026-11-15 -- the chain to the map", step 6) says they are written after
Jeff's review of the map.

| What | What the map's code gives it | Open question |
| --- | --- | --- |
| **A fold control on an assembly's outline** (the "+" on a group, and the collapsed / expanded shortcuts) | `VA.mapLayout` already draws an assembly's outline round its own box and its children's (`geo.assemblies`), and the grid's fold store (`VA.readCollapsedAssemblies`) is the state to share. Folded, the children's boxes go and the parent's box takes the outline's place; a pin a child owns moves to the parent's perimeter -- today no child in v2 has a feature, so nothing moves. | Where the control sits (the outline's corner, as Jeff drew the "+"), and whether a folded assembly's district shrinks with it. Tracked with the three surfaces in `ISSUE_20261114_assembly_folding_left_out_of_three_surfaces`. |
| **A study lit as a route** (the strategy sketch's view 2) | Every jumper and connector is keyed by the model's dimension and interface ids, and the page's lit set (`VA.studyLitSet`, `ctx.lit`) is edge ids -- the map can wear a `--route` class on the chain's jumpers and connectors and fade the rest, as the DAG dims its unlit part. | A chain study's order along the route (its ordinals), and whether the rest of the map dims or hides (the DAG's Unused control). v2 has no study yet, so no fixture. |
| **A layout for v1** | `VA.dagDrawingFor` draws Classic for a model with no `map_<id>.json`; writing one for `vpa_pitch_linkage` (its parts on a grid) is all it takes, and the builder refuses one that leaves a part unplaced. | v1 has many more parts and the fastener grip stacks; whether it wants a map at all before it retires, or Classic is its drawing. |
| **Retiring Classic** and rewriting its browser suites once | The runner's `newPage` wrapper seeds Classic for every suite; removing it and the `dagDrawing` switch, then re-pointing the suites that read `svg.tv__rails`, is the work. The region's zoom, Fit, seam leaders and the landing (`fitDagTo`) are the DAG's and would follow it out. | Jeff's yes to the map, and what of the DAG's own layout (`ISSUE_20261114_the_dag_still_lays_out_for_a_grid_beside_it_that_has_its_own_region_now`) goes with it. |
| **The compound joints** the model does not author yet | A joint with several constraints is a bundle -- parallel pins in one order at both ends, one route each with its own symbol -- so each joint draws itself as it is authored; the hub ↔ tangential-link mount is the one example. | The authoring itself, one joint a handoff (the strategy draft's step 7), and the pattern word (`ISSUE_20261116_the_model_has_no_interface_word_for_a_fastener_pattern`). |
| ~~**A second, portrait arrangement**~~ | ~~The layout file is one arrangement; a second file per region shape would need the loader to pick one.~~ | ~~Only if the six-region table in the map's lesson says the wide one does not read side by side (the strategy draft's decision 81).~~ **Answered 2026-11-17** by Jeff: the one arrangement is portrait. Handoff `the_map_is_portrait_as_jeff_drew_it` re-placed v2 tall; there is still one arrangement and no second file. |
