---
type: bug
priority: med
status: triaged
area: topologies/kinematic
reporter: agent
audience: strategy
handoff: docs/sessions/HANDOFF_20261022_a_general_profile_note_bands_a_model_defined_term.md
found_by: docs/sessions/HANDOFF_20261016_a_kinematic_study_folds_the_sweeps_jacobian.md
strategy: docs/strategy/BRIEF_20261021_what_a_term_cites_when_its_drawing_does_not_band_it.md
---

# A kinematic contributor reads a diametral position zone as a one-axis band

`docs/topologies/kinematic_study_vpa_pitch_linkage_blade_pitch_at_the_stops.json`,
contributor `pitch_plate_attach_height`, takes its band from
`topology_pitch_system.json` / `pitch_plate_flange_to_link_hole` and applies it
as a `band` on `pitch_link.point_a[2]` (the spindle-axis component) only. The
callout behind that band is `5X Ø 7.950 +0.015/0.000 with ⌖Ø0.2 A B C`
(215735-A). That is a **cylindrical position zone of diameter 0.2**. It lets the
hole axis sit anywhere within radius 0.1 in *both* directions perpendicular to
the hole axis, not along CAD Z alone. The band's own `source_ref.note` says so:
"this SAME callout also serves the pitch plate's vertical (row 32) and
tangential (row 48) position rows" (F4 of `WORKSHEET_endstop_vision_baseline.md`,
still open and Jeff's to resolve).

The handoff staged this pairing as "spindle-axis component only". The study
followed it, and the lesson says "None of the handoff's pairings was wrong on
inspection".

**What it moves today:** P2's Jacobian has a real tangential entry for the same
point (`pitch_link.point_a[1]`: −0.238 deg/mm at −7°, −0.399 at +72°). If the
zone were a `disk` of radius 0.1 over the Z and tangential components, this
row's magnitude would go 0.1555 → 0.1574 deg at −7° and 0.1489 → 0.1542 at
+72°. The worst case would go up by about 0.002° and 0.005°. The verdicts would
not change: the margins stay above 0.25°. So the size of the error is small. The
cost is in the modelling: the one traced drawing band, which dominates the
study, reads less of its own callout than the callout allows.

**What to decide** (needs design, not a patch): first, which component is the
hole's axis (the plate's link holes may be radial). That settles which two
components the zone spans: a `disk` over the two components perpendicular to
the hole axis, or Z plus tangential. Then decide whether F4's "one tolerance
counted twice" question has to be answered before the zone is widened. Then
re-pin `tests/test_kinematic.py::test_real_the_first_study_pins_both_stops_against_p2`
and the lesson's tables.
