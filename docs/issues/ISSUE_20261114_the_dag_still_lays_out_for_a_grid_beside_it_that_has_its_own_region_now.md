---
type: chore
priority: med
status: deferred
area: viewer/dag
reporter: agent
audience: strategy
found_by: docs/sessions/active/HANDOFF_20261112_the_page_is_a_fixed_layout_and_nothing_scrolls_the_document.md
defer_until: 2026-11-29
resolution: deferred 2026-11-15 (triage) -- med beyond budget; the 11-12 chain rule allows one viewer handoff at a time, and most of these are inputs to the strategy session's map handoff (REVIEW_20261112_the_merged_page.md)
class: merged_page_walk_20261112
---

# The DAG still lays itself out for a grid beside it, and the grid has its own region now

Since the fixed shell (handoff
`the_page_is_a_fixed_layout_and_nothing_scrolls_the_document`, 2026-11-14)
the grid is in its own scroll region, in the column right of the DAG. The
handoff fenced the DAG's own layout out of scope ("do not change what the DAG
draws or how it is laid out inside its region -- the map is a later
handoff"), so three pieces of the one-strip design are still in the DAG and
now do nothing a reader can see:

| What | Where | What it costs now |
|---|---|---|
| The DAG↔grid leaders. `renderTopoPane` passes `style: "off"`, so none is built, but the geometry and the drawing path for them remain (`VA.leaderGeometry`'s leaders and lanes, the `jogged`/`angled` path builders, `railsSvg`'s leader layer, `VA.respineX`'s zone interpolation). | `apps/viewer/topology.js`, `apps/viewer/views/topology.js` | Code reached only by the fast tier. |
| The jog zone's width. `VA.leaderGeometry` still sizes the SVG to the rails plus a zone for leaders the grid no longer has. | same | Empty pixels on the drawing's right, inside the DAG's region. |
| The centring. `VA.rowPositions` centres the DAG block against the grid block (`offset` / `gridOffset`, `VA.centreOffsets`); the grid no longer reads `gridOffset`, but the DAG is still pushed down by `offset` when the grid is the taller block. | `apps/viewer/topology.js` | A gap above the drawing on a model whose grid is longer than its DAG. |

The `seam` leaders (DAG↔3D) and `boundaryEdge` (the row a selected node
scrolls into view) read the same plan and must survive whatever replaces
these.

**Recommendation:** the map handoff, which redraws the DAG anyway, removes all
three with the layout it replaces, rather than a cleanup ahead of it that the
map would rewrite again.
