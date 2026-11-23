---
type: bug
priority: low
status: open
area: contact suggestions
reporter: agent
found_by: docs/sessions/HANDOFF_20261122_a_seat_and_a_pattern_get_contact_suggestions_too.md
---

# A fastener pattern node offers single counterbore faces as pattern rows, each with a Take

Found in review of `a_seat_and_a_pattern_get_contact_suggestions_too`, in that
handoff's own shot
`docs/sessions/lessons/shots/a_seat_and_a_pattern_get_contact_suggestions_too/05_pattern_plate_holes_framed.png`.
The pitch plate's side of the piston body fastener pattern lists four rows. The
first is right: "10 faces · round · r 2.6000 · lines up with the mating holes",
which is the five Ø5.2 holes. Rows 3 and 4 are "face 857 · round · r 8.5054"
and "face 883 · round · r 8.5173". Each is ONE face of the Ø17.5 counterbores,
offered with the same "lines up with the mating holes" wording and a Take. A
Take on either one binds the pattern feature to a single counterbore face, which
is the wrong bind the handoff's DoD exists to prevent.

**Cause.** `interface_contact.pair_patterns` puts holes into size classes with
`_size_classes`, which uses the like-hole radius rule
(`feature_geometry.PATTERN_TOLERANCES["radius_fraction"]`, 1e-3). Fitted radii
of the Ø17.5 counterbores scatter by about 1.4e-3 (8.5054 vs 8.5173). So the
five counterbores break up into several one-hole classes, and each class that
lines up with a body hole becomes a candidate of its own.

**Options.** (a) Drop a pattern candidate whose `holes` count is below the top
candidate's, while keeping a lone one-hole candidate (the pitch arm clocking
really is one hole line). (b) Merge size classes using the fit's own scatter
rather than 1e-3. (c) Leave the rows, and have a one-hole row say "1 hole"
rather than "lines up with the mating holes". Recommendation: (a). It is the
smallest change, and the ranking already puts the row it would drop below the
real one.
