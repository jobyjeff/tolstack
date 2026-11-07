---
type: feature
priority: low
status: deferred
area: viewer/dag lengths
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261105_the_grid_and_the_dag_move_with_the_mechanism.md
defer_until: 2026-12-06
class: check_semantics
resolution: deferred 2026-11-06 (triage) -- low defers by default; 30 days
---

# The contribution length mode draws the linkage to scale and floors the stop's own terms

`the_grid_and_the_dag_move_with_the_mechanism` added a **contribution** length
mode to the DAG (`VA.EDGE_LENGTH_MODES`). It is the default on a kinematic study.
A bar's length is the term's |sensitivity| × band at the live pose, so the DAG
moves as the linkage cycles.

It draws only the **linkage** terms to scale (`VA.kinematicPoseLengths`), against
one yardstick for the whole sweep. The yardstick is the largest contribution any
linkage term reaches at any point. The **stop position** terms, the axial chain
to each stop's contact face, are floored and marked "not to scale".

The reason is measured on the live study. Drawn on one yardstick with the stop
terms (the cover's flange at ±0.864 deg, the piston's upper head at ±0.432 deg),
the largest linkage term (±0.156 deg at −7°, ±0.112 deg mid-sweep) is under one
row's floor. **Every bar that moves with the pose floored**, so the DAG did not
move at all. That is the first thing this handoff measured in contribution mode.
A per-pose yardstick, as the other modes use, would keep the largest linkage bar
at full length at every pose and hide how the terms swell and shrink. The
sweep-wide yardstick shows that change: `pitch_plate_attach_height` goes
0.156 → 0.112 → 0.149 across the sweep.

## The design question

What should the stop position's terms look like in this mode? They are the
stop's, the same at every pose, and they enter the stack only at their stop.

- **(recommended) Leave it as shipped.** In this mode the stop terms floor,
  marked. Their contributions are in the grid, and the contribution colouring
  shows them.
- Draw them to scale only at a stop pose, on their own yardstick. Two yardsticks
  on one drawing would need a legend.
- Draw everything on one yardstick with a much larger `maxRows` for this mode.
  The biggest stop bar becomes ~25 rows tall, and the smaller linkage terms
  still floor.
