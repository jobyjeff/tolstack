---
type: feature
priority: med
status: open
area: kinematic study / S461-607
reporter: agent
audience: strategy
found_by: docs/sessions/active/HANDOFF_20261026_a_contributor_may_be_a_study.md
---

# The travel term dominates the blade-pitch budget, and both stops now read `marginal`

With the travel between the end stops entering the blade-pitch study by its terms
(`a_contributor_may_be_a_study`), run P2's worst case at the stops is ±1.707 deg
(−7) and ±1.339 deg (+72), against ±0.290 / ±0.315 before, and the S461-607
margins go from +0.210 / +0.185 to −1.207 / −0.839 (verdict `marginal`, budget
scope). The motion ratio is 1.728 and 1.249 deg per mm there; the travel
study's worst case is ±0.82 mm, of which ±0.75 is the two terms banded by
their drawings' general profile notes (`piston_head_upper_thickness`,
`gas_spring_mount_flange_to_end_stop`, the 2026-10-22 re-banding).

So the verdict is now almost entirely a statement about two general notes, judged
against a limit (S461-607's ±0.5 deg blade-to-blade variation) that the check's own
`source_ref` already calls "the closest available numeric acceptance criterion", not
a limit on this chain. Options, for a strategy session:

1. Leave it: the number is honest, the check says what it is, and the travel
   study's own worksheet follow-ups (explicit tolerances on 214698-002 and
   213668-002) are what moves it.
2. Re-read what the stop location does to blade-to-blade variation: every blade
   shares one driver, so the travel's error is common to all blades and may not
   belong in a blade-to-blade limit at all. That is a reading of S461-607, not of
   the arithmetic.

Recommendation: 2 first -- it decides whether the term belongs under this limit,
and nothing else here can.
