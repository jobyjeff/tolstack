---
type: feature
priority: low
status: resolved
area: annotate/contact-suggestions
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261121_a_take_on_a_lug_feature_binds_that_lugs_own_face.md
resolution: fixed by a_seat_and_a_pattern_get_contact_suggestions_too (review da4e158f): a one-mesh ball joint is compared with itself, a face never with itself; v2's four inner-race ball joints read ok. The solid-based pairing (b) is unasked until a second mesh needs it
---

# Two parts that are solids of one mesh at one place are never compared for contact

v2 authors a bearing's two races as two parts on the bearing's one mesh
(`pitch_link_lower_inner_race` and `pitch_link_lower_outer_race` are solids 1
and 0 of `asm217755_MS14101_3_815597cb`). Since 2026-11-21 each race is
measured at its bearing's occurrence (`part_occurrence` in
`scripts/build_contact_suggestions.py`), so a ball-joint edge between the two
races is one mesh at one occurrence, and `interface_contact.edge_candidates`
never compares an occurrence with itself. Such an edge says `no_contact`
with the note "both parts are one 3D model at one place; its faces are not
compared with each other".

Before 2026-11-21 these edges were also `no_contact`, for a worse reason: the
inner race at one bearing was compared with the outer race at another.

**Options** (strategy's call): (a) compare a mesh with itself at one
occurrence when the two ends are different parts, every face against every
other -- cheap, and a ball can only sit in a seat that is another face; (b)
first teach the engine which faces are which solid (the parts' notes name
solid indices; `data/meshes/` carries per-face solids for the annotator's
`faceSolids`) and pair only solid against solid. Recommendation: (b) -- (a)
would offer the MS14103-3's one-solid sphere as its own seat.

## Addendum 2026-11-23 (review of `a_seat_and_a_pattern_get_contact_suggestions_too`)

That handoff (deliverable 4) addressed this with neither (a) nor (b) as written.
A ball joint whose two ends are one mesh at one place is compared with itself,
a face never with itself, and only when exactly one end's node name says "ball"
(`build_contact_suggestions.ball_side`, `interface_contact.edge_candidates(ball=…)`).
For a mesh with no concave sphere and exactly one ball (MS14103-3), that ball is
offered at both ends, with `seat_modelled: false`
(`interface_contact._lone_ball`). This is the outcome option (b)'s
recommendation warned about. It was offered on purpose: Jeff had bound the outer
race's centre to that sphere by hand. On the review's scratch rebuild, v2's four
inner-race ball joints read `ok`. Left `open` for triage to disposition (resolved,
or kept for the solid-based pairing of (b)).
