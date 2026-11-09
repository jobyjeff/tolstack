---
type: chore
priority: low
status: open
area: design
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261108_the_dag_and_grid_nest_coloured_bodies_and_compact_means_denser_rows.md
---

# Design: a long body name runs past its DAG container's right edge, with rails drawn through it

Seen in the review of `the_dag_and_grid_nest_coloured_bodies_and_compact_means_denser_rows`,
in its own shots (`docs/sessions/lessons/shots/the_dag_and_grid_nest_coloured_bodies_and_compact_means_denser_rows/v2_default_1600.png`
and `_2560.png`).

On v2 at the default zoom, two body names are wider than their containers:
"ground: the hub, the two mounts and the piston cover" ends about 50px right of
the ground body's border, and "pitch plate, gas-spring piston and piston heads"
about 35px past its own. The name sits in the label band the store keeps above
the body's first row (`VA.CONTAINER_LABEL`), so it never sits on a glyph, which
is what the handoff asked for. But it is not clipped to its container the way a
part's name is (`fitText` in `partName`, `apps/viewer/views/topology.js`), and
the vertical rails and the jog zone's lines run through the letters where they
cross the band.

The DoD's "no label overprints a label or a glyph" holds. What a reader sees is
a label that belongs to no box and has lines through it. Options: clip the body
name to its field with `fitText` (the full name is already on its hover title),
or widen the body field to its label. Clipping is the smaller change and matches
the parts.
