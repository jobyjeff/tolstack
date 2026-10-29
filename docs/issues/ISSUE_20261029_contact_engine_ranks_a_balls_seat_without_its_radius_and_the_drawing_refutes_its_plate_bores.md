---
type: bug
priority: med
status: triaged
area: contact-suggestions
reporter: agent
found_by: docs/sessions/HANDOFF_20261028_an_agent_proposes_a_face_binding_and_a_human_ratifies_it.md
class: contact_engine_ignores_end_geometry
handoff: docs/sessions/HANDOFF_20261029_the_contact_engine_asks_the_ends_what_shape_they_are.md
---

# The contact engine ranks a ball's cylindrical seat without the seat's radius, and the drawing refutes its top two pitch-plate bores

Measured 2026-10-29 against `data/projections/feature-identity/contact_suggestions.json`
by the first agent proposal pass. `ball_in_seat` with a cylindrical seat scores
only "ball centre on the axis" and the distance along it
(`interface_contact.rank_score`). Every cylinder whose axis passes through the
ball therefore ranks, whatever its radius:

- **`pitch_arm_link_joint`**: rank 1 is pitch arm e1c41692 faces 78/79/275/276
  (r 2.413 mm) and rank 2 is faces 64/290 (r 6.35 mm). The scores are 1.693589
  and 1.693595, a 6e-6 tie. Only the radius tells the .190 in bolt hole from
  the other cylinder; the proposal pass used it (face 78, medium).
- **`tan_link_mount_joint`**: rank 1 r 2.415 (faces 1569…), rank 2 r 7.66. Ranks
  3 and 4 are **planar** seats (mount faces 810, 1594) at `seat_gap_mm`
  -0.0186: a flat face grazing the ball's sphere, ranked as a seat.
- **`pitch_plate_link_joint`** and **`tan_link_plate_joint`**: rank 1 is plate
  37e9f606 r 5.5499 (faces 1559/1560, 1502/1503), and rank 2 is r 2.413.
  Drawing 215735 rev A sheet 2, Section A-A (the crop both edges cite)
  dimensions the lug holes as 5X ⌀7.950 +0.015/-0 and 5X ⌀8.520 ±0.008
  (3X each for the tangential-link lugs), i.e. r 3.975 and r 4.26. Those
  are ranks 3/4 (r 4.26 faces 1435/1436 and 1496/1497; r 3.98 faces 1553/1554
  and 1390/1391). r 5.55 and r 2.413 are most likely the pressed bushing's OD
  and bore, which the plate assembly mesh carries. Which of them the topology's
  "attachment bore" means is a naming question. Either way, the engine's
  rank 1 is not the bore the drawing calls out.

Neither plate end was proposed. Both are on the gap list, with these
candidates, in `docs/sessions/lessons/LESSONS_20261028_an_agent_proposes_a_face_binding_and_a_human_ratifies_it.md`.
Which blade's lug the edge means is a separate issue that is already filed:
`ISSUE_20261028_contact_suggestions_cannot_say_which_blade_a_topology_edge_means.md`.
It reproduced here too: for one pitch-link joint stack, the bolt head contact
resolved at fastener group `prd-e-03481962.1` and the washer-on-lug contact at
`.3`.

Suggested: score a cylindrical seat by `|seat_radius - expected|`, where the
expected radius is the bearing's bore when the ball carries one (the ball's own
bore face is on the same mesh). Refuse a planar seat whose gap is negative
against a truncated sphere.
