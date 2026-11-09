---
type: bug
priority: high
status: open
area: annotate/sweep
reporter: agent
found_by: docs/sessions/HANDOFF_20261108_the_integration_walk_reads_the_merged_page_against_jeffs_sentences.md
---

# The 3D pane's Bodies list still leaves the piston cover and the piston heads out of their bodies

Jeff, 2026-11-08 (S10, S13): the piston cover belongs to the base, and the two
piston heads belong to the pitch plate's body. The 2D DAG and grid now show this.
The 3D pane's own **Bodies (5)** list, in sweep mode on `vpa_end_stop_v2`, still
does not:

- `base · 3 parts`: hub, tan-link mount, gas-spring mount. **No piston cover.**
- `pitch plate · 2 parts`: plate and piston body. **No piston heads.**
- `pitch link · 2 parts` lists a bearing named
  `MS14101-3 (extracted from 217755-001 A.1 PROPULSION ASSEMBLY, PROPELLER, CW Released.stp)`.

The list reads the run's own subjects (linkage's part lists), not v2's `bodies`.
That is the same root cause as
`ISSUE_20261108_the_sweep_leaves_model_v2s_folded_piston_heads_standing_still.md`,
which covers the heads not moving. This issue covers the list, which a viewer reads
two clicks from a DAG that says the opposite.

Shots: `docs/sessions/lessons/shots/the_integration_walk_reads_the_merged_page_against_jeffs_sentences/s10_s13_nav_bodies_in_sweep_1600.png`, `_2560.png`, `demo_4_sweep_playing.png`.
