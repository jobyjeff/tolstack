---
type: chore
priority: med
status: open
area: topologies/kinematic
reporter: agent
found_by: docs/sessions/HANDOFF_20261022_a_general_profile_note_bands_a_model_defined_term.md
---

# The pitch plate's link hole has no axis in either topology, so its ⌖Ø0.2 stays a one-axis band

The 2026-10-22 SOP rule ("What a term cites when its drawing does not band it")
says a position zone `⌖Øw` is a kinematic `disk` of radius w/2 over the two
components normal to the feature's axis, and that an agent must not guess the
axis.

`docs/topologies/kinematic_study_vpa_pitch_linkage_blade_pitch_at_the_stops.json`,
contributor `pitch_plate_attach_height`, applies 215735-A's `⌖Ø0.2 A B C` (via
`topology_pitch_system.json`'s `pitch_plate_flange_to_link_hole`) as a `band` on
`pitch_link.point_a[2]` only. Neither topology states the hole's axis:
`vpa_pitch_linkage`'s `pitch_plate_link_attach_bore` and `pitch_system`'s
`pitch_plate_link_hole` carry none. So handoff
`a_general_profile_note_bands_a_model_defined_term` kept the band and named the
missing second in-plane component in both checks' `excluded_terms`; nothing was
converted and the verdicts did not move.

What would close it:

- a bore-axis fit of the plate's link hole (`scripts/fit_bound_features.py`),
  once the hole is bound in the annotator on `asm217755_215735_001` or the plate
  installation; or
- 215735-A's own views naming the hole's direction (radial or axial).

Then convert the contributor to a `disk` over the two components normal to that
axis and report the verdict delta. The 2026-10-21 brief estimated about +0.002°
at −7° and +0.005° at +72°, no verdict change; that figure is not re-measured.

Still open alongside it: F4 of `docs/tolerance_stacks/WORKSHEET_endstop_vision_baseline.md`
(one callout serving the plate's vertical and tangential rows, counted twice?).
It is Jeff's call. A disk over both in-plane components would make that question
concrete, because it would fold the vertical and the tangential row as one zone.
