---
type: chore
priority: low
status: deferred
area: viewer/performance
reporter: agent
found_by: docs/sessions/HANDOFF_20261105_a_part_with_many_interfaces_is_drawn_as_a_component_with_pins.md
defer_until: 2026-12-06
class: unclaimed_perf_headroom
resolution: deferred 2026-11-06 (triage) -- low defers by default; 30 days
---

# The block column search costs half a second on a study's first paint

`VA.blockColumns` (apps/viewer/topology.js) searches a band's columns for
the fewest crossings it will draw as blocks. Every swap and every move of one
column is scored through `VA.blockLayout` + `VA.layoutCrossings`, for up to
12 passes, from two starts. On the product model this took 0.35–0.5 s in
node per study, measured on its first paint (kinematic page 0.49 s, chain
studies about 0.37 s). It is memoised on the band's rows and the lit set, so
a repaint, a hover or a respine frame does not repeat it. The walk's own
search (`VA.gatherParts`) runs once per topology.

Options:

- score incrementally: only the rails and links a swap touches change;
- cap the passes;
- move the walk's search to the builder, which already owns
  `order_columns`. The band's search would still run on the page.
