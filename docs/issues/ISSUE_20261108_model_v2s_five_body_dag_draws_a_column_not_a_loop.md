---
type: bug
priority: med
status: deferred
class: dag_layout_policy
area: viewer/dag-layout
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261108_model_v2_is_the_end_stop_linkage_in_five_bodies_and_the_nav_switches_models.md
resolution: triage 2026-11-08: med beyond budget (3/3 spent on highs); 14 days. Strategy 2026-11-08 evening: option (a) is deliverable 2 of the handoff below; labels and nesting are the DAG/grid sibling
handoff: docs/sessions/HANDOFF_20261108_the_end_stop_model_names_its_datums_right_and_folds_its_riders.md
---

# Model v2's five-body DAG draws a column, not a loop

Model v2 (`topology_vpa_end_stop_v2.json`, 15 parts, 23 interfaces, 27 edges)
was built small so the DAG layout could be judged on a graph a person can hold
in their head. Its handoff asked for "five body containers in one loop (base —
blade — pitch link — plate — tan link — base, the stop pairs hanging off base
and plate) ... no edge spanning the graph's height, and no label overprinting a
label at the default zoom", and said to state, not fix, what the layout gets
wrong at this size. Measured on the merged tree's projection, shots in
`docs/sessions/lessons/shots/model_v2_is_the_end_stop_linkage_in_five_bodies_and_the_nav_switches_models/`
(`2_v2_dag_1600_full.png`, `2_v2_dag_2560_full.png`):

1. **No loop is drawn.** The walk is body-major and top to bottom: base, tan
   link, pitch plate, lower head, upper head, cover, pitch link, blade
   (`layout.bodies`). The loop closes only through joint rails down the left.
2. **An edge spans the graph's height.** The blade hinge is a joint node
   (`hub_blade1_root_bearing_bore`, hub and blade root), the walk reaches the
   blade last, so its rail runs from the base block at the top to the blade
   block at the bottom.
3. **Labels overprint.** The lower head's container label sits on the pitch
   plate container's lower edge; the upper head's and the cover's labels sit
   on their one-row pills and the rail glyphs there.
4. **The grid floats.** At 1600 wide the grid starts half way down the graph
   and its element column is clipped at the pane's right edge; at 2560 it
   starts at the same height with an empty band above it.
5. **No container around the whole model** — this one holds.

Options for M2 (the draft's next rung), recommendation first: (a) let the walk
order bodies by the joint cycle (base → blade → pitch link → plate → tan link)
so the loop's closing rail is the one short edge; (b) draw the five mechanism
bodies as a ring layout distinct from the walk (a new renderer, not a tweak);
(c) leave the walk and fold riders into their hosts' blocks so the column is
shorter. (a) is the smallest change that addresses 1 and 2 together.
