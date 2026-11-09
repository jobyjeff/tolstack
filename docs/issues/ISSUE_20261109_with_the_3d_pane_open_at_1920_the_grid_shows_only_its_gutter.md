---
type: bug
priority: high
status: triaged
area: viewer/layout
reporter: agent
found_by: docs/sessions/HANDOFF_20261108_the_integration_walk_reads_the_merged_page_against_jeffs_sentences.md
handoff: docs/sessions/HANDOFF_20261109_the_demo_path_reads_cleanly_on_a_projector.md
---

# With the 3D pane open at 1920 wide, the grid shows only its brace gutter

At a 1920×1200 viewport (the projector case), opening the 3D pane narrows the
topology column until the grid shows only its body-label gutter at the right edge.
The PART, DESCRIPTION and ELEMENT columns are scrolled out of view
(`docs/sessions/lessons/shots/the_integration_walk_reads_the_merged_page_against_jeffs_sentences/demo_3_pane_open.png`, `demo_4_sweep_playing.png`). The leaders run to a
strip of body names, and the audience cannot read a single row while the sweep
plays.

Related, not the same: `ISSUE_20261108_the_grid_prints_a_parts_number_twice_and_its_label_gutter_costs_152px.md`
(the doubled number is part of why the gutter is wide).
