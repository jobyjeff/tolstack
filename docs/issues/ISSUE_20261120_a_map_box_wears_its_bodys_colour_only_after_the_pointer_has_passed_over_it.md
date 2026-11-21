---
type: bug
priority: med
status: open
area: viewer/map
reporter: agent
found_by: docs/sessions/HANDOFF_20261119_the_walk_reads_the_links_and_the_pitch_plate_stack_on_the_merged_page.md
---

# A map box wears its body's colour only after the pointer has passed over it

## What happens

On a fresh load every part box on the map is drawn in the neutral part colour
(teal). Hover a box once and move away: it is now drawn in its body's ink
(orange in the pitch plate) and stays that way until the page reloads. So the
map's colours depend on where the pointer has been. Jeff's 11-19 screenshot
shows the plate region all orange; the walk's fresh load shows it teal, with
one bolt orange because a probe had hovered it.

Measured on integration `8082bad0`, v2, 3840 × 2160: after load,
`rect.map__box[data-map-id="pitch_plate_215735_001"]` had class `map__box` and
stroke `rgb(166,230,218)`. After one hover over the plate and a move away it had
`map__box tv__fill--t2` and stroke `rgb(255,197,153)`.

## Why

`apps/viewer/views/map.js`, the box loop: the visible rect is created as
`rect("map__box", box, …)`, and `register(reg, r, base, …)` stores
`base = "map__box" + tint` but writes no class. The tint first reaches the
element in `paint()`, which runs only when a hover or a selection lights the
entry, and un-lighting repaints `entry.base`, tint included. The same holds
for every entry whose base differs from the class it was created with. The
code has been this way since `3393e9b8` (2026-11-16).

## Fix shape

Write `base` as the element's class at `register` time (or create the rect
with `base`). A fast check: after `renderTopoMap`, every `rect.map__box` of a
part in a body carries that body's `tv__fill--t*` class before any hover.

## Shots

`docs/sessions/lessons/shots/the_walk_reads_the_links_and_the_pitch_plate_stack_on_the_merged_page/02_map_3840_pitch_plate_region.png`
(fresh load: teal boxes, the NAS6403U11D box orange after a probe hover) and
`08_map_1536_dag_zoomed_tangential_link.png` (the MS14103-3 inner race orange,
its neighbours teal).
