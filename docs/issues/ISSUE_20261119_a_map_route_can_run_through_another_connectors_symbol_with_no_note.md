---
type: bug
priority: low
status: deferred
defer_until: 2026-12-21
resolution: deferred 2026-11-21 (triage) -- low, the default knob; map_routing has no program; v2 is clean on this today
area: apps/viewer/map
reporter: agent
found_by: docs/sessions/HANDOFF_20261119_a_map_pin_faces_each_partner_and_no_two_routes_share_a_run.md
class: map_routing
---

# A map route can run through another connector's symbol, and no note says so

Found while reviewing `a_map_pin_faces_each_partner_and_no_two_routes_share_a_run`.
Model v2 is clean on this today. Before that handoff it had two such routes; after it, none.
A synthetic model shows the rules do not prevent it, and `VA.mapRouteNotes` has no note for it.

**Repro (node, `VA.mapLayout`):** part M at `[1,0]`, with two features on its bottom joined to
parts at `[1,1]` and `[0,1]`, plus a child K (no place) joined to M by a press fit. K
sits beside M's bottom routes. The route from M to `[0,1]` leaves M's bottom, runs left at
`y = M.bottom + stub`, and crosses the press-fit drop at its symbol (`mid` y 237, the route at
y 235). `geo.notes` is `[]`.

With three bottom partners there is no room beside the routes, so the child is centred under
M. Its parent-side pin, placed straight over the child's (`toChild`), then sits 22 units from
the two spread bottom pins, half a pin pitch. No note fires for that either.

Only `viaCorners`'s `clean` callback checks for a drawn symbol. Plain routes and
detours do not, and the notes do not.

Fix shapes:
- add a "route passes through another connector's symbol" note to `VA.mapRouteNotes`. Then
  the repair and the `[real]` zero-notes checks see it, though v1, which is already dirty
  (59 such passes measured), gains more notes;
- place a `toChild` pin with the side's spread pins in mind, or widen the parent to make room.
