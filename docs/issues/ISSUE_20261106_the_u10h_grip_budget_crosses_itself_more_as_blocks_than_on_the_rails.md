---
type: chore
priority: low
status: deferred
area: viewer/dag-layout
reporter: agent
class: dag_layout_policy
found_by: docs/sessions/HANDOFF_20261105_a_part_with_many_interfaces_is_drawn_as_a_component_with_pins.md
defer_until: class:dag_layout_policy
resolution: deferred 2026-11-06 (triage) -- low defers by default; class trigger (the topology-layout brief)
---

# The U10H grip budget crosses itself more as blocks than on the rails

With **Parts: Blocks** (the page's default since 2026-11-06), the chain study
`rotor_fastener_grip_u10h` draws 24/58/80 = 162 crossings
(`VA.layoutCrossings` of the drawn band, branch/close/leader). On the rails
it draws 16/70/50 = 136. Every other page measured went down: the whole walk
136 → 120, the kinematic page 188 → 113, shank-out 136 → 127, cotter hole
140 → 124. The lesson has the table.

The band is re-laid out of the gathered walk, and `VA.blockColumns` runs a
local search from two starts (the band's columns and their mirror image). On
this band it stops at a local minimum that is worse than the builder's
columns. The likely fixes, cheapest first:

1. Add the builder's own band (VA.bandLayout of the un-gathered walk, marked
   with VA.blockLayout) as a third candidate, and keep whichever crosses less.
2. Seed the search from the walk's searched columns instead of the band's
   re-lay.
3. Accept it and say so.

Re-measure with the scratch script the lesson describes (VA.layoutCrossings
over VA.blockLayout(VA.blockColumns(VA.bandLayout(VA.gatherParts(...)))).
