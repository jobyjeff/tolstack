---
type: bug
priority: med
status: deferred
area: viewer/dag
reporter: agent
found_by: docs/sessions/HANDOFF_20261108_the_dag_and_grid_nest_coloured_bodies_and_compact_means_denser_rows.md
class: topology_layout
defer_until: 2026-11-23
resolution: triage 2026-11-09 -- med beyond budget (v1 is no longer the default model); 14-day date
---

# v1's chain-study names overprint each other on the DAG

On `vpa_pitch_linkage` (v1) at the default zoom, two chain-study group labels
start at the same point and print on top of each other: "Gas" and "Blade pitch a…"
near the pitch arm, and "Pitch arm link…" just under them. The overlap was already
there before 2026-11-08 (`docs/sessions/lessons/shots/the_dag_and_grid_nest_coloured_bodies_and_compact_means_denser_rows/v1_default_1600.png`
next to the same region of the 11-08 baseline). v2 has no chain studies, so it does not show it.

The labels are `text.tv__studyname`, placed at a study span's top-left in
`apps/viewer/views/topology.js` (the "0c'. the study groups" block). Two studies
whose first spans share a top-left get the same anchor. The fix is the label-band
approach the body and part names now use (`VA.CONTAINER_LABEL`), or stepping
the later names along.
