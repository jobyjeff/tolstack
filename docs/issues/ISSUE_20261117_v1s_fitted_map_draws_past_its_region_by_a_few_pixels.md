---
type: bug
priority: low
status: open
area: viewer/map
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261117_the_map_is_the_only_drawing_and_classic_retires.md
---

# v1's fitted map draws past its region's left edge by a few pixels

Found while rewriting the map's browser suite for handoff
`the_map_is_the_only_drawing_and_classic_retires` (2026-11-17), the first
handoff in which v1 (`vpa_pitch_linkage`) draws a map (computed places, one
column per body).

**Measured:** v1, DAG view, after Fit (zoom 0.153): the map's world group
(`#topopane g.map__world`, its `getBoundingClientRect`) extends about 29 px
(about 190 world units) left of the region. v2 fits inside.

**Not the cause:** the layout's own geometry. Every box, district, pin, mark,
jumper path and connector point of both models lies inside `geo.bounds`
(checked by evaluating `VA.mapLayout` over the projection in node), so Fit is
centring the right rectangle. What extends further is something the browser
counts in the group's box and the layout does not: candidates are the
transparent hit strokes (`map__connectorhit`, `map__jumperhit`), the symbols'
`<use>` boxes (`overflow: visible`), and hidden pin labels.

**Repro:** `tests/debug_classic_retired_20261117.mjs --only regions` against a
projection built from that branch, or the map suite's v1 check.

**Fix shape:** either fit to the rendered group's own box (one measure after
paint), or pad `geo.bounds` by the widest hit stroke and the symbol's half
size. Cosmetic at Fit's zoom; a reader wheeling in never sees it.
