---
type: feature
priority: med
status: open
area: viewer/dag-layout
reporter: agent
audience: strategy
found_by: docs/sessions/active/HANDOFF_20261026_pitch_system_folds_into_the_pitch_linkage_model.md
---

# The one product graph is past the exact column search, and its DAG crosses itself

Folding `pitch_system` into `vpa_pitch_linkage` (2026-10-26) made the DAG Jeff
reads one graph: 47 interfaces, 59 edges, 19 branch points, 13 grounded loops.
`scripts/build_topology_projection.py` lays it out across 18 columns. That is
past `EXACT_ORDER_MAX_COLUMNS`, so the column order is the shortest-leg-first
heuristic and not a proved minimum (`layout.column_order: "shortest_first"`).
Measured with the projection's own counters on the committed document:

- crossings: branch 5, close **115**, leader 2. This is declared in
  `apps/viewer/README.md`'s `layout_crossings` claim. The old `pitch_system`
  page alone was 0 / 17 / 0.
- right-justifying the spine leaves **2** leader-vs-rail crossings. That is the
  first topology where the mirror does not reach zero (391 → 2 here).
- 106 walk rows at 26px is 2756px of DAG at comfortable density. The
  max-leader jog is 1157px top-aligned and 572px centred.
- selecting `pitch_system_gas_spring_branch` moves the grid block **down**
  (`gridOffset` 585 → 1508px), where on the old page it moved up.

None of this is wrong arithmetic: the README and the `[real]` tiers pin it as
measured. It is what the page draws now. The sibling handoff staged the same
day lights a study's edges (`the_kinematic_page_keeps_the_dag_and_says_each_contributor_once`),
and body containers are a design handoff still to be staged. Those two are the
natural places to decide how a product-sized DAG should read. Options seen, not chosen: collapse each body to
one swim-lane group with its internal edges folded (the `bodies[]` the
projection now carries make that drawable), raise the exact-search width for
one document, or draw only the studied subgraph by default.
