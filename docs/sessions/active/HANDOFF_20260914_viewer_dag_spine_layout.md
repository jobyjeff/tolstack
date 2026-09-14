---
priority: high
depends_on: []
model: opus
---

# HANDOFF 2026-09-14 — viewer_dag_spine_layout: right-justified spine, viewport-height DAG, DAG/grid centering

Source: Jeff's live review of the shipped viewer arcs (strategy session
2026-09-14), first real use of `viewer_leader_line_grid` +
`viewer_edge_length_scaling` on the real `pitch_system`. Baseline:
`integration` (carries the whole 2026-09-10/11 viewer-arc wave; batch-merge
to master is pending — do not baseline on master). Scope: `apps/viewer/`
display code only (`topology.js`, `views/topology.js`, `topology_app.js`,
`topology.css`, tests). Do NOT touch `scripts/build_*_projection.py` or any
projection schema — every deliverable here is display-side. Do NOT touch
leader styling/options or grid column widths (owned by the follow-on
`viewer_leader_grid_legibility`) beyond what the geometry itself forces.

## Deliverables

1. **Right-justified spine as the DEFAULT layout.** Jeff, verbatim: "the DAG
   should start out as a right-justified linear chain with legs/branches
   extending to the left — that gets you more than halfway there in terms of
   the layout/crossed lines issues." Today the depth-first walk allocates
   branch columns away from the grid, so the trunk sits far from the jog zone
   and every leader crosses the branch rails. Mirror the column semantics:
   the walk's own mainline (the author-ordered spine — keep the "no heuristic
   root" rule from `apps/viewer/README.md` §"The rails" exactly as is)
   occupies the **rightmost** rail column, directly adjacent to the jog
   zone/grid; each fork allocates its branch column to the **left**. Rail
   continuity, column reuse and the one-dashed-curve-per-cycle invariant all
   survive unchanged — this is a mirroring of x-allocation, not a new layout
   engine. Expected observable: on the real `pitch_system`, leaders from
   spine nodes run essentially straight into the grid seams, and
   leader-vs-rail crossings drop sharply (count them before/after in the
   lesson).
2. **Total DAG height normalized to the viewport, in every edge-length
   mode.** Jeff, verbatim: "Scale by tolerance width is implemented, but it
   scales the dag to be much too large, it is now multiple times the page
   height hence impossible to make sense of. Total dag height should be
   normalized by page height so the entire topology is always visible. (same
   goes for all view styles)." Replace the absolute `EDGE_LENGTH_SCALE.maxRows`
   cap with a fit: compute the DAG's total vertical extent so it targets the
   viewport height (minus the page chrome above the pane), scaling
   proportions down to fit — in `tolerance width`, `feature size` AND
   `uniform` modes. Constraints that survive: the one-row-minimum floor
   (whole-edge hover is a landed contract; a floored bar keeps its break
   mark + "not to scale" title), and **the grid never moves** — normalization
   is DAG-side only (`VA.rowPositions`), the leaders absorb the difference,
   which is what they were built for. Honest overflow: when floor × edge
   count alone exceeds the viewport, the floor wins and the page scrolls —
   never an unclickable bar. Note `.tv__scroll` carries no `overflow-y` of
   its own and must not gain one (`testHeightBudget` pins this).
3. **Vertically center the DAG against the grid.** Jeff: "Center the dag and
   the grid view vertically with each other, this reduces the max amount of
   jog required." After (2) the DAG block and the grid block generally have
   different heights; center the shorter against the taller inside the shared
   scrollport instead of top-aligning both. Measurable: max |node-side leader
   y − grid-side seam y| decreases on the real `pitch_system` in every mode
   (record the numbers in the lesson).

## Suggestions (investigate, not binding)

- The keyed position store (`VA.rowPositions` → both geometry passes) is the
  intended seam for all three items; if the x-allocation mirror wants a
  second store dimension (column index → x), keep it in the same store —
  the staged study-respine animation interpolates between stores and should
  find everything it needs keyed there.
- The `CORRESPONDENCE_IN_PAGE` browser-tier check (leader ends on dot centres
  and row seams, per topology, both layouts, after scrolling, both densities)
  is the contract for all of this — extend its matrix with the new
  normalization rather than writing a parallel checker.

## Definition of done

- Real `pitch_system` (main checkout `data/projections/viewer/`, via
  `--repo C:\workspace\tolstack`): spine renders as the rightmost rail,
  branches extend left, whole topology visible within one viewport height in
  all three edge-length modes, DAG centered against the grid.
- Fast tier + truth tier green (`node apps\viewer\run_tests.cjs`,
  `node scripts\run_viewer_browser_tests.mjs --repo C:\workspace\tolstack`),
  with `CORRESPONDENCE_IN_PAGE` and `testHeightBudget` extended to the new
  geometry; value-level pins for the mirrored column allocation on the
  committed topologies.
- Lesson (`docs/sessions/lessons/LESSONS_20260914_viewer_dag_spine_layout.md`):
  before/after crossing counts and max-jog numbers on `pitch_system`, and
  what the store now keys that the animation handoff can rely on.
