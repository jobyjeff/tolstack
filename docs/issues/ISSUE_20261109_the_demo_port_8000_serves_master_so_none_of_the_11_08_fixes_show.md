---
type: chore
priority: high
status: open
area: ops/batch-merge
reporter: agent
needs: jeff
ask: Batch-merge integration into master before the demo, so the page on port 8000 shows the 11-08 fixes
found_by: docs/sessions/HANDOFF_20261108_the_integration_walk_reads_the_merged_page_against_jeffs_sentences.md
---

# The page on port 8000 serves master, so none of the 11-08 fixes show there

drawing-checker's mount (`http://127.0.0.1:8000/tolstack/viewer/topology.html`)
serves the **main checkout's** `apps/` — master, at `5d6edb5c` on 2026-11-09 —
and the three 11-08 UI handoffs are on `integration` only (`4abddff3`).
Checked by hash: the served `topology.js` is byte-identical to the main
checkout's and differs from integration's.

The walk's demo clicks run against 8000
(`docs/sessions/lessons/shots/the_integration_walk_reads_the_merged_page_against_jeffs_sentences/demo_8000_*.png`) show every complaint Jeff made on 11-08 coming back:
zebra bands under the DAG, bleached grey/teal containers, Colour by defaulting to
None, and **0 leaders** across the seam with the sweep playing (integration draws
17 at the same click).

The projections in `data/projections/` were rebuilt from integration's tree on
2026-11-09 for the walk, so 8000 is now master code over integration-built data.

Once integration is batch-merged to master, 8000 serves the fixed page with
nothing else to do.
