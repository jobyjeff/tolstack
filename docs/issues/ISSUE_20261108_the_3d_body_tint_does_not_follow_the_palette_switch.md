---
type: feature
priority: low
status: deferred
area: annotate/scene tint
reporter: agent
found_by: docs/sessions/HANDOFF_20261108_the_dag_and_grid_nest_coloured_bodies_and_compact_means_denser_rows.md
class: topology_layout
defer_until: 2026-12-09
resolution: triage 2026-11-09 -- low, deferred by default; 30-day date
---

# The 3D body tint does not follow View → Palette

The DAG and grid now draw each body in one ink from `--tv-body-ink-*`, with two
palettes (`VA.PALETTES`: Bold at `:root`, Colour-blind under
`html[data-palette="cvd"]`). The 3D pane's body colour is sent once by
`sceneTintCommand` (`apps/viewer/topology_app.js`, `bodyInk`). It reads the same
tokens off the document, so it gets the new Bold values. A palette switch sends no
new tint command, so the scene keeps whichever palette was active when it was tinted.
The handoff fenced this out (M2, the 3D tint is not its work), and the sibling handoff
owns the scene wiring. The fix is to re-send the tint on `onDagView("palette")`.
