---
type: bug
priority: low
status: deferred
area: contact suggestions
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261122_a_seat_and_a_pattern_get_contact_suggestions_too.md
class: mesh_placement_disagrees_with_the_mechanism
defer_until: 2026-12-25
resolution: deferred 2026-11-25 (triage) -- low, deferred by default
---

# The tangential link's MS14103-3 sits six degrees off its bolt, so its race seats get no contact row

After seats got contact rows (2026-11-23), two of v2's seats still read
`no_contact`: `tan_link_upper_inner_race_flange_seat` and
`tan_link_upper_inner_race_clamp_seat` (four ends). Measured in the assembly
frame at the declared occurrences: the MS14103-3 mesh (`e44145483cfa`, one
solid) has its race faces 11 (x 75.45) and 10 (x 86.55) with normal
(±1.0, ±0.019, ±0.018); the flanged bushing's flange top (face 18, x 75.49)
and the straight bushing's end (face 13, x 86.50) have normal
(±0.992, ±0.127, 0). Gaps 0.04 mm, angle about 6.2 degrees. The margin is
2.0 degrees (`interface_contact.CONTACT_TOLERANCES["angle_deg"]`, chosen
against articulated balls at 1.07-1.76 degrees). The CAD places this bearing
articulated on its bolt.

Options: (a) leave it, the faces are one click each for a human; (b) a seat
whose faces touch (gap within `plane_gap_mm`) with an angle past the margin is
offered with the angle in its evidence and never as "clear"; (c) widen the
margin. Recommendation: (a) until a second model shows the same shape; (c)
would admit the near misses the 2026-10-28 measurement separated by angle.
