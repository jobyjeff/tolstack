---
type: feature
priority: low
status: deferred
area: viewer/map
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261122_the_lug_stacks_line_up_and_each_link_is_a_row_on_the_map.md
class: topology_layout
defer_until: 2026-12-25
resolution: deferred 2026-11-25 (triage) -- low, deferred by default
---

# A lug stack cannot be one straight line through the plate while each body is one rectangle

Jeff's note of 2026-11-22 asked for the radial stack -- inner race, bolt,
bushing, plate -- to be lined up. The handoff delivered each lug as a column
(inner race, bolt, flanged bushing) with the plate *beside* the flanged
bushing: one corner, not a straight line. A straight line through the plate
is not reachable under the map's three rules (body rectangles do not overlap,
every box inside its district, no outline taking in a foreign box), within
today's area:

- the plate's two inner races belong to the pitch plate body, so the pitch
  plate's district (one rectangle) contains them, and each link must leave
  that rectangle from a corner;
- the gas-spring mount must meet the piston body and lower head (feather stop,
  slide), which pins the pitch plate's rectangle to the base's side, while the
  tangential link's far inner race belongs to the base and must sit in the
  base's rectangle;
- the plate has four sides and five parts meet it (piston body, two flanged
  and two straight bushings).

A structured search (the handoff's lesson has the counts) found no arrangement
with both lug stacks and both links straight inside 7 x 10 or 8 x 10 cells;
the only 7 x 10 shapes with all of them straight route the end stop through
the plate.

## The options, for a strategy session

1. **Keep the rule; accept the corner** (today). Each lug is a column and the
   plate sits beside its flanged bushing.
2. **Let a district be a union of rectangles** (an L or a T) rather than one.
   The pitch plate's district could then wrap its lug rows without taking in
   the links, and both stacks could run straight through the plate. A change to
   `apps/viewer/map.js` step 8 and to the overlap note, and to the docs'
   "a district per body".
3. **Let the map grow** past today's bounds (the handoff capped it there).

Recommendation: 1 until Jeff has seen the 11-22 arrangement; 2 is the only one
that reaches his sentence, and it is a design change to what a district is.
