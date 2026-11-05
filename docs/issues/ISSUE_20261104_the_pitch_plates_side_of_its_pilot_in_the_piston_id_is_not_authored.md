---
type: feature
priority: low
status: open
area: topology/vpa_pitch_linkage
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261104_the_viewer_real_tier_follows_the_slide_re_author.md
---

# The pitch plate's boss and the piston's ID datum are not joined by any edge

`pitch_plate_pilot_in_piston_id` was authored as a mating surface of the plate and the
piston body, but only the piston's `piston_body_id_datum_to_od` touched it, so the
viewer's declared-part check refused it. The handoff fixed that by making it the
piston's ID datum alone (parts, face and the pinned test in `tests/test_topology.py`).

The physical statement Jeff gave (plate boss 41.04 mm in piston ID 41.072 mm, bolted 5X)
is the pilot clearance, a `gap` edge from `pitch_plate_spindle_bore_axis` to the piston
ID datum. It is not authored. Tried as a structural plate edge, the added loop moved
the product layout's close crossings 70 -> 89 and the branch crossings 16 -> 20, and
moved many pins; a gap edge would close the same loop.

Options for a strategy session: author the gap edge and take the layout cost (and
re-pin), or leave the clearance to a study's own selection, or find the walk order
that closes the loop without the crossings. Recommendation: author it only with the
layout work that makes the loop cheap; no value exists to put on it today.
