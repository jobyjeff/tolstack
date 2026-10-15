---
type: chore
priority: med
status: triaged
area: topology/aliases
reporter: agent
found_by: docs/sessions/HANDOFF_20261014_parts_sit_where_the_assembly_puts_them.md
handoff: docs/sessions/HANDOFF_20261015_annotate_texts_follow_the_installed_mesh_store.md
class: prose_states_a_live_store_count
---

# The gas-spring piston mesh is installed, and it has no alias row

Handoff `parts_sit_where_the_assembly_puts_them` added the topology part
`gas_spring_piston_214700_002` to `docs/topologies/topology_vpa_pitch_linkage.json`.
Its note says the piston body "is not yet" installed, that it is "coming from
rotorkit's `extract_the_gas_spring_piston`", and that until then it has no alias
row, so the annotator's "no 3D model" state is the honest answer.

The mesh landed during that same session. `data/meshes/ed1010fe02c9ade7984d69749b1acd3e4b9ffb14e853d2e63fedcbc5465f7b5b/`
was written 2026-10-14 20:21 (the topology row was committed at 19:55), and its
`provenance.json` has `extraction.product_name: "214700-002"`. It was one of 13
meshes installed at that time.

## To do

- Add the alias row in `docs/topologies/part_mesh_aliases.json`, with evidence,
  following that file's conventions. `tests/test_part_mesh_aliases.py` says what
  else must move.
- Rewrite the topology row's note, which will then describe a state that no
  longer exists.
- Check the annotate `[real]` tier: run P2's `pitch_plate / gas_spring_piston_214700_002`
  should move from `no-mesh` to an anchored row. Also update
  `apps/annotate/README.md`'s sweep paragraph, which names the piston as the
  example of a part with no installed mesh.
