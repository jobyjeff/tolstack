---
type: chore
priority: low
status: open
area: viewer/topology
reporter: agent
class: unmeasured_cost
found_by: docs/sessions/HANDOFF_20261029_a_leader_starts_at_the_mark_it_names_on_every_tier.md
---

# A wheel zoom repaints the whole topology pane on every wheel event, and nobody has timed it

Since `a_leader_starts_at_the_mark_it_names_on_every_tier` (deliverable 0, the
DAG zooms alone) a zoom no longer changes a CSS transform. It redraws: the
wheel handler (`apps/viewer/topology_app.js`, `wireZoom`) calls `zoomDagAt`,
which calls `VA.applyTopoZoom`, which calls `root.topoRezoom(k)`, which runs a
full `VA.renderTopoPane` (`apps/viewer/views/topology.js`). This happens
synchronously, once per `wheel` event. A trackpad pinch or a fast wheel sends
tens of events a second. Each one now rebuilds the rails SVG, the grid and the
header, and re-centres them.

No timing was recorded. The browser tier's zoom checks only assert where things
end up after a wheel. The review measured nothing either: the browser slot was
busy, and the box must not be loaded on purpose. A paint can also replace the
element under the pointer partway through a gesture, so it is worth checking
that the hover light survives a zoom.

Fix shape, once it has been measured: coalesce the repaint to one per animation
frame (record `state.dagZoom` per event and repaint in `requestAnimationFrame`),
or keep the in-SVG `g.tv__dag` transform update cheap. In the second option a
zoom rewrites only the two layers' `transform` and the leaders' `d`, and runs a
full paint only at rest. Start by timing `renderTopoPane` on P2
(`topology_vpa_pitch_linkage`) at 1600x1000.
