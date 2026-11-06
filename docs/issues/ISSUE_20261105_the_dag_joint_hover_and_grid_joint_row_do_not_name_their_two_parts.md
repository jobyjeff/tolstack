---
type: feature
priority: med
status: open
area: viewer/dag-joints
reporter: agent
audience: strategy
found_by: docs/sessions/active/HANDOFF_20261105_the_rail_holds_still_and_takes_the_face_jeff_picked.md
---

# The DAG's joint hover and the grid's joint row do not name their two parts yet

Deliverable 5 of the handoff asked for one set of words on three surfaces.
The sweep rail's joint row now reads `<part> <joint word> <part>` (for example
`213668-002 slide 214700-002`), from `AA.sweepJointEndParts` and
`AA.sweepJointRowWords` in `apps/annotate/sweep.js`. The same handoff wanted
those words in the grid's joint row and the DAG's joint hover. That part was
not done, for two reasons:

1. **The grid is fenced** by the same handoff ("do not touch … the grid").
2. **They are different joints.** A rail row is a linkage *sweep* joint
   (`pitch_link`: a two-force member joining the pitch plate and the pitch arm).
   A DAG joint node is an end of a topology *joint edge* (`pitch_plate_link_joint`,
   `interface: spherical`). One sweep link is two topology ball joints.
   The viewer also has no part-number source: it does not read mesh labels, and
   ids like `hub` or `pitch_link` carry no number.

Options:

- **A.** Name the topology joint edge `<from part> <interface word> <to part>` in
  the viewer (DAG node hover and grid row), with numbers from
  `data/projections/parts/names.json` plus `docs/topologies/part_mesh_aliases.json`
  carried into the viewer projection by Python. The words follow the same rule
  as the rail's, but not the same joints.
- **B.** Have the topology declare which joint edges make up each sweep joint
  (today that mapping exists only in `tests/test_topology.py`'s
  `SWEPT_JOINT_EDGES`), then show the sweep joint's words on those edges.

Recommendation: A, with the part numbers built in Python, so one function owns
the words and the generated JS vocabulary carries the interface words.
