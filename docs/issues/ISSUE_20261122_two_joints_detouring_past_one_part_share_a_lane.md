---
type: bug
priority: low
status: deferred
area: viewer/map
reporter: agent
found_by: docs/sessions/HANDOFF_20261122_the_lug_stacks_line_up_and_each_link_is_a_row_on_the_map.md
class: map_routing
defer_until: 2026-12-25
resolution: deferred 2026-11-25 (triage) -- low, deferred by default
---

# Two joints detouring past the same part share a lane

`apps/viewer/map.js` `detour` / `rowDetour` place a lane from the boxes
between and the joint's own constraint index only. Two *different* joints
whose detours pass the same boxes on the same flank get the same lane, and the
route notes then report shared runs and symbols on each other's routes.

Measured 2026-11-22 with `tests/debug_map_arrangement.mjs` on candidate v2
arrangements that put a straight bushing in its lug's column (the "TC", "TD",
"TG" variants in the handoff's lesson): 7 to 10 notes each, every one from
lanes of the inner race's flange seat, clamp seat and the bolt's straight
bushing fit landing on one line. Not reachable on the shipped v2 layout (zero
notes), and v1's computed map carries notes anyway.

Fix shape: when a detour's lane would share a run with a route already laid,
step it outward by a pin pitch (the routes are laid in id order, so the result
stays independent of `edges[]`). A fast-tier fixture with two joints round one
part pins it.
