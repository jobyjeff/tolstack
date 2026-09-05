---
priority: high
depends_on: [dag_viewer_vertical_budget]
---

# HANDOFF 2026-09-04 — viewer_consolidation: one viewer — the topology page absorbs the stack viewer, which retires

Source: Jeff, 2026-09-04 (strategy session): "my intention was that the
dagview was an addition to the existing display, not a separate presentation
altogether... the two pages are largely presenting the same information,
let's move towards consolidating into one. The newer dag/topology page is
farther along since it got the most recent feedback — figure out what info
needs to be moved into it from the stack viewer and then retire the old one.
It's still pretty hard to make sense of both pages as they largely just look
like a wall of text. We should definitely prioritize the thumbnail previews."
Baseline: `integration` with `dag_viewer_vertical_budget` merged (it owns the
height contract + density control; build on it, don't re-fight it). Scope:
`apps/viewer/` + browser tests; do NOT change
`scripts/build_topology_projection.py` layout semantics or the stack JSON
schemas; the export script is owned by the parallel `stack_export_tabular`
handoff — do NOT build an exporter here.

## Deliverables

1. **Inventory, then move.** Diff what the stack viewer
   (`apps/viewer/index.html` + `viewer.js`) shows against what the topology
   page shows. The lesson lists exactly what moved, what was judged duplicate,
   and what was dropped with Jeff-visible justification. Known movers to
   check first:
   - **Drawing-crop thumbnail previews / hovers** (the stack viewer has them;
     Jeff names thumbnails as the priority — the workspace
     visualization-first principle: evidence next to every value). Mind the
     projection-provenance gate (`build_viewer_crops.py`, tree-matched
     projections) and the CSS-px-not-viewBox-units lesson from
     drawing-checker if any sizing is involved.
   - Provenance coloring / confidence rendering (traced vs untraced vs gap —
     the repo's headline number; it must not get lost in the move).
   - Check totals/summary content against what `dag_viewer_vertical_budget`
     did with the totals footer — don't reintroduce an unbounded block.
2. **Spreadsheet-shaped grid.** Push the row grid toward a standard table:
   decompose the combined `value [min … max]` cell into **three separate
   columns** (nominal / min / max) — Jeff needs cell-level copy into Excel
   for sharing and cert artifacts. Column headers become real headers. Keep
   the rail alignment contract (row height moves as one number in its three
   places — the vertical_budget handoff documents the trap).
3. **Retire the stack viewer** once parity is real: the old page's entry
   points redirect or point to the topology page; browser tests move over;
   dead code deleted, not stranded. If some stack-viewer capability cannot
   move this session, the lesson says which, why, and the old page survives
   only as long as that gap — named, not silent.
4. **De-wall the text.** Within the moved content, apply visual hierarchy so
   the page reads at a glance (the DAG marks + thumbnails + provenance color
   should carry more of the load than prose). No paragraph explanations —
   Jeff's standing UI-copy rule applies to tolstack too.

## Definition of done

- The pitch-system topology page shows everything a reviewer previously
  needed the stack viewer for (thumbnails included), demonstrated against the
  real projection; the old page is retired or its survival is scoped and
  named.
- min/nom/max render as three columns; a rectangular selection of the grid
  pastes into Excel as columns (manually verified; say how it behaves).
- `node scripts/run_viewer_browser_tests.mjs` + `node apps/viewer/run_tests.cjs`
  + pytest all green; alignment guard untouched.
- Lesson: the moved/dropped inventory, thumbnail wiring notes, and what the
  export handoff should reuse from the new column model.
