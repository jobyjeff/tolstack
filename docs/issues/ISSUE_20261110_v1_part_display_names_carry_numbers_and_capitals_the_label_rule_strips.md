---
type: chore
priority: low
status: open
area: topologies
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261110_the_model_is_derived_once_and_the_left_column_is_its_tree.md
---

# v1's part `display_name`s carry numbers and capitals the label rule strips

The one part-label rule (`tolerance_stack/model_view.py`, `part_label`:
number, then everyday name) was applied to every surface on 2026-11-10 and
v2's three `display_name`s were re-cut to lowercase, number-free words. v1
(`docs/topologies/topology_vpa_pitch_linkage.json`) was out of scope for
names: its parts still carry `"Pitch plate 215735-001/-002"`,
`"Pitch link 213862-002"`, `"Pitch anti-rotation link 212956-005"` and the
like. The rule strips the trailing number, so the label reads correctly
(`215177-001 Pitch plate`), but the capital differs from the lowercase names
beside it in the tree and the grid.

Make v1's `display_name`s lowercase and number-free, as v2's are; the
`naming_note` beside each already records the title-block story. Names only;
ids are frozen (the sweep and the bindings key on them).
