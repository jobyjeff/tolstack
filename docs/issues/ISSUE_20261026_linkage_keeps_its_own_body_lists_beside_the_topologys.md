---
type: chore
priority: low
status: deferred
area: linkage/bodies
reporter: agent
audience: strategy
found_by: docs/sessions/active/HANDOFF_20261026_pitch_system_folds_into_the_pitch_linkage_model.md
class: one_fact_written_twice
defer_until: 2026-11-26
resolution: deferred 2026-10-27 (triage) -- low by default
---

# linkage keeps its own body lists beside the topology's

Since 2026-10-26 `docs/topologies/topology_vpa_pitch_linkage.json` declares its
rigid bodies (`bodies[]`, `docs/DAG_TOPOLOGY.md` "Bodies"). The five the solver
poses (`base`, `blade`, `pitch_plate`, `pitch_link`, `tan_link`) carry the part
lists of `C:\workspace\linkage\linkage\vpa.py`'s `BODY_PARTS` / `LINK_PARTS`.
`tests/test_topology.py::test_the_mechanism_bodies_are_linkages_own` pairs them
whole when the sibling is on disk. Two copies of one fact are now held equal by
a test. The handoff that founded `bodies[]` called the fix "a linkage handoff,
later": linkage reads the five from this file, by `kind`, instead of declaring
them.

One declared difference that linkage handoff has to carry: this topology puts
the tangential link's two bearings (`spherical_bearing_tan_link`,
`spherical_bearing_tan_link_ms14103_3`) in `tan_link`, because they are pressed
into 212956-005 and move with it. Linkage lists the assembly alone because its
mesh already draws them (`BODY_PARTS_LINKAGE_DOES_NOT_LIST` in the test). So
linkage reading the topology needs a "draw" list separate from the "moves
with" list, or it draws those two bearings twice. That is the shape
`ISSUE_20261001_the_pitch_link_assembly_mesh_and_its_own_two_bearings_are_both_drawn_in_sweep_mode`
recorded once already.

The topology's non-mechanism bodies (one per part linkage does not place: ring
gear, brake, actuator body and piston, gas spring, piston heads, piston cover)
are `kind: body` with a note, and linkage should ignore them.
