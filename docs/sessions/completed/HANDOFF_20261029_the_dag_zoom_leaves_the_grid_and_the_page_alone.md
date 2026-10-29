---
priority: high
depends_on: [the_grid_header_rides_its_rows_on_merged_trunk]
model: sonnet
hitl: false
---

# HANDOFF 2026-10-29 — the_dag_zoom_leaves_the_grid_and_the_page_alone: zoom scopes to the DAG, the grid fits its frame, the component column is never under the DAG, and Fit fits

Source: Jeff's forge note `20261029T120929_5ysvll` (superseded 13:58, two
screenshots at `C:\workspace\forge\data\inbox\atomic-notes\attachments\20261029T120929_5ysvll\paste-20261029T120915.png`
and `...\20261029T135845_jdy8k2\paste-20261029T131206.png`), consumed by the
2026-10-29 strategy session (`dispatch/docs/strategy/HANDOFF_20261029_strategy.md`).
Baseline: `master` with `the_grid_header_rides_its_rows_on_merged_trunk`
landed (it touches the same three files; wait for it). Scope:
`apps/viewer/views/topology.js` (zoom/Fit/toolbar only), `apps/viewer/topology_app.js`
(layout of DAG vs grid), `apps/viewer/topology.css`, `apps/viewer/tests.js`,
`scripts/run_viewer_browser_tests.mjs` (the zoom/Fit suite). Do NOT touch
`apps/viewer/views/kinematic.js`, the annotator, the leader-drawing code, or
`#detail`'s contents — owned by the sibling 2026-10-29 handoffs.

Jeff's words:

> The 2d dag view zoom is a little screwy, it zooms the grid view (tolerance
> rollup) along with the dag, and simultaneously scrolls the entire page. Let's
> make it only zoom the dag. The grid view should ideally not need to zoom/pan
> (the entire thing should fit in the frame under most normal circumstances).
> - The component column of the grid view is overlapping/obscured by the dag
> - fit button doesn't seem to do anything other than cause the page to jump slightly

## Deliverables

1. **Wheel/pinch zoom acts on the DAG canvas only.** The grid (tolerance
   rollup) keeps its own scale; the page does not scroll as a side effect
   (`preventDefault` on the DAG's wheel when zooming; the grid scrolls its
   rows vertically as today). Measured on the first screenshot: the grid's
   COMPONENT column sits under the DAG's right rail at the page's default zoom.
2. **The grid fits its frame.** At default zoom and a 1600×1000 viewport the
   grid's columns (COMPONENT · # · ELEMENT · NOMINAL · MIN · MAX · CONTRIBUTION
   · SOURCING) fit the frame without horizontal scroll on the product model;
   where they cannot (a narrow pane), the COMPONENT column truncates with a
   tooltip rather than hiding under the DAG. The DAG and the grid never
   overlap: the DAG's box ends where the grid's begins.
3. **Fit fits.** The toolbar Fit (`views/topology.js` ~line 94) fits the whole
   lit layout (the active band, or the whole walk when nothing is lit) into
   the DAG's box, both axes, and nothing else moves. If the page scrolled
   because Fit changed the DAG's height, pin the box height first.
4. The zoom/Fit browser suite ("the DAG zoom, Fit and the grid header")
   asserts: grid scale unchanged across a DAG zoom; `scrollY` unchanged
   across a zoom; the COMPONENT column's left edge ≥ the DAG box's right edge;
   Fit's resulting bbox inside the box.

## Definition of done

- `scripts/rebuild_projections.ps1`; `node scripts/run_viewer_browser_tests.mjs`
  green including the four new assertions; `node apps/viewer/run_tests.cjs`
  green; `PYTHONIOENCODING=utf-8 venv-win/Scripts/python.exe -m pytest -q`
  green; `node scripts/run_mutation_witness_tests.mjs --changed-since
  integration` clean.
- A before/after screenshot pair at 1600×1000 in the lesson's shots folder,
  the same study as Jeff's (`vpa_pitch_linkage_blade_pitch_at_the_stops`).
- Lesson: what was zooming the grid (the transform's root), and why Fit
  "jumped the page" before.
