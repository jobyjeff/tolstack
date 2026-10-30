---
type: feature
priority: high
status: resolved
area: viewer/topology
reporter: agent
audience: strategy
found_by: docs/sessions/active/HANDOFF_20261029_the_dag_zoom_leaves_the_grid_and_the_page_alone.md
---

# Zooming only the DAG needs the in-SVG leaders to bridge two scales

Jeff asked (2026-10-29 note `20261029T120929_5ysvll`) that wheel zoom scale the
DAG only, the grid keep its own scale, the COMPONENT column never sit under the
DAG, and Fit fit. The handoff fences off the leader-drawing code. The two do not
fit together as written.

## Why the first ask cannot be done inside the fence

- `views/topology.js` `renderTopoPane` puts the head, the rails SVG and the grid
  rows under ONE transform (`.tv__zoom`, `VA.applyTopoZoom`). That shared root is
  what zooms the grid.
- The in-SVG leaders (`railsSvg`, step 2b; `VA.leaderGeometry`) run from a node's
  dot to a seam y between two grid rows, in coordinates the SVG and the grid
  share. Scale the SVG alone and every leader's seam end misses its row.
- The page-level overlay (`drawSeamLeaders`, topology_app.js) already reads the
  scaled SVG rect, so it would survive. The in-SVG leaders would not.

## Options (for a strategy session)

1. **Recommended.** Leave the grid at scale 1 and give the leaders a y-map from
   scaled DAG space to unscaled grid space. Redraw the SVG at k in its own
   coordinates (geometry times k, not a CSS transform) and make
   `VA.leaderGeometry` take the seam y values from the grid's row pitch. It
   touches the leader code, and the handoff fenced that off.
2. Keep one transform but let the grid reflow at 1/k so it appears unscaled.
   Pitch and row height then change with zoom, which defeats "fits the frame".
3. Drop DAG zoom for vertical and zoom horizontally only. Rows stay aligned, but
   Fit loses its vertical axis.

## Parts that do not depend on the decision

- The wheel's `preventDefault` and `scrollY` stability (wheel handler,
  topology_app.js ~1855).
- The COMPONENT column sitting under the sticky rails (`.tv__rails` sticky +
  `.tv__hscroll`).
- Fit's both-axis fit and the page jump from the height change (`fitDagTo`).

These could ship alone as a smaller handoff.

## Resolved 2026-10-30

Option 1, in handoff `a_leader_starts_at_the_mark_it_names_on_every_tier`
(`docs/sessions/lessons/LESSONS_20261030_a_leader_starts_at_the_mark_it_names_on_every_tier.md`).
`.tv__zoom` is no longer transformed: the DAG is drawn at the zoom in two
layers of the rails SVG (`g.tv__dag`), the grid and its header stay at 1, and
`VA.leaderGeometry`'s `zoom` option runs each leader from the scaled dot to
the unscaled seam. A zoom change repaints the pane (`VA.applyTopoZoom` →
`topoRezoom`). Fit fits the DAG's lit part; the "every grid column inside the
frame at Fit" check became "Fit leaves the grid at its own scale".
