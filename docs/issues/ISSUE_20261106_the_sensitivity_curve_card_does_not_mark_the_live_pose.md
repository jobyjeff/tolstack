---
type: feature
priority: low
status: open
area: viewer/kinematic
reporter: agent
found_by: docs/sessions/HANDOFF_20261105_the_grid_and_the_dag_move_with_the_mechanism.md
---

# The sensitivity hover curve marks the stops, not the live pose

On a kinematic study the grid's sensitivity cell opens a hover card: the
coefficient across the whole sweep (`VA.kinematicCurve`, `views/kinematic.js`).
The card marks the two stops and highlights the grid's stop.

Since `the_grid_and_the_dag_move_with_the_mechanism` the grid is read at a
**pose** (`VA.kinematicPose`), and the cell shows the coefficient there. The
curve has no mark for that pose, so the number in the cell has no place on the
curve under it.

Two parts to a fix:

- `VA.kinematicCurve` takes the pose's driver value and returns an x for it.
  The chart already does this (`VA.kinematicChartX`).
- `edgeRow`'s curve card (`views/topology.js`) is built once and cached. It has
  to be rebuilt, or moved, when the pose changes.
