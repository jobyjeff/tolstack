---
type: feature
priority: med
status: triaged
strategy: dispatch/docs/strategy/drafts/DRAFT_tolerance_analysis_over_the_kinematic_model.md
area: viewer/grid
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261119_the_groups_switches_reach_the_map_and_the_grid_brackets_an_assembly_in_two_bodies.md
---

# A folded assembly in two bodies sits in one body's bracket, and a sub-assembly's name is on hover only

Two grid behaviours the Groups-switches handoff left as they fell. No
committed model has an assembly in two bodies yet, so neither is visible on
v1 or v2. Link 4 (`a_link_is_a_machined_part_and_two_bearings_each_two_races`)
authors the first ones and will show both. Both reproduce on
`tests/fixtures/topology_assembly_in_two_bodies_rows.json`. The shots are in
`docs/sessions/lessons/shots/the_groups_switches_reach_the_map_and_the_grid_brackets_an_assembly_in_two_bodies/`.

| What | Where | Today | Options |
|---|---|---|---|
| A folded assembly whose rows are in two bodies, with **Bodies** outermost | `VA.gridPlan`'s rollup row takes the first folded row's `body` | The one row sits in the first body's bracket (inner race A's, ground). The rows that were in the link and the arm vanish from those brackets. | (a) keep it: the fold is the assembly's and a body bracket is not; (b) with Bodies outermost, fold only within a body (one rolled row per body, each the fold of that body's subset — needs `assembly_rollups` per body, a value question); (c) switch the grid to Assemblies outermost when the reader folds one. **Recommend (a)** plus a muted mark on the row: it is the smallest change that says no lie. |
| A sub-assembly (a bearing round its races) with **Assemblies** outermost | `VA.gridBraces` `named` | Its bracket carries its name only where its first row is its own. A race starts every bearing run, so the bearing's name is on its fold's hover only. | (a) keep it; (b) give sub-assemblies a second, narrower strip (widens PART by ~60px); (c) put the name on the bracket's bottom cap row when the run has two or more rows. **Recommend (c)** once v2's real bearings show how many rows a run has. |

The row backgrounds also keep their body tints when the assemblies are
outermost. That is harmless on the fixture. Note it when judging the first
real model.
