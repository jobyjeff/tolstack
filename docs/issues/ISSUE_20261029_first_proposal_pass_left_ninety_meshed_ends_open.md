---
type: chore
priority: med
status: deferred
area: feature-identity
reporter: agent
found_by: docs/sessions/HANDOFF_20261028_an_agent_proposes_a_face_binding_and_a_human_ratifies_it.md
class: contact_engine_ignores_end_geometry
defer_until: docs/sessions/HANDOFF_20261029_the_contact_engine_asks_the_ends_what_shape_they_are.md
resolution: triage 2026-10-29: med beyond the budget; deferred onto the_contact_engine_asks_the_ends_what_shape_they_are, whose engine changes this issue's premise
---

# The first agent proposal pass left 90 meshed edge ends unproposed

The first pass (2026-10-29) wrote 55 proposals into
`data/inbox/feature-identity/` across the 190 edge ends of
`vpa_pitch_linkage`. 45 ends have no installed mesh. The other **90 have a
mesh and were left open on purpose**, each for a stated reason. The full
end-by-end list with candidates is in
`docs/sessions/lessons/LESSONS_20261028_an_agent_proposes_a_face_binding_and_a_human_ratifies_it.md`,
"Gap list". By cause:

- **The hub (e28285d1), ~25 ends**: flanges, top deck, spindle bore, blade
  root bearing bore. The hub's 363k-triangle mesh was not searched. Its
  structural edges carry no nominal (variation-only) and so give no distance
  to discriminate faces by. The next pass needs a drawing crop with a zone, or
  axis relations to faces already proposed (the plate spindle bore 439 is the
  assembly Z axis).
- **The pitch plate's lug and attachment bores, ~12 ends**: which blade's lug,
  which of bushing bore vs machined hole (see
  `ISSUE_20261029_contact_engine_ranks_a_balls_seat_without_its_radius_and_the_drawing_refutes_its_plate_bores.md`).
- **Gas spring, its mount and the tangential link mount's seats, ~14 ends**:
  the mount has no assembly placement; the gas spring sits 51 mm from the plate
  (`ISSUE_20261029_contact_exists_and_the_engine_finds_none.md`).
- **Blade root and pitch arm clocking holes, ~12 ends**: no nominal, rule
  silent on several node names.
- **"End of the full shank", bolt point and cotter hole, ~8 ends**: the node is
  a position along a cylinder, which a face binding cannot say. Needs a
  decision about whether such a node is bound at all.
- **Rotor-stack washers and straight bushings, ~8 ends**: both flat faces fit
  the thickness, and no contact decides which is which end.

Done when: a second pass (or Jeff in the annotator) has either proposed each
end or recorded why it cannot be.
