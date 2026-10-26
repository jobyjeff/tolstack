---
type: chore
priority: low
status: deferred
area: topologies/vpa_pitch_linkage
reporter: agent
found_by: docs/sessions/HANDOFF_20261016_a_kinematic_study_folds_the_sweeps_jacobian.md
defer_until: 2026-11-20
class: kinematic_term_without_cited_band
handoff: docs/sessions/HANDOFF_20261026_the_tangential_link_cites_its_drawing.md
resolution: triage 2026-10-21: low, deferred to 2026-11-20 by default
---

# Two tangential-link contributors have a sensitivity and no cited band

`docs/topologies/kinematic_study_vpa_pitch_linkage_blade_pitch_at_the_stops.json`
carries two gap rows: `tan_link_length` (band) and
`pitch_plate_tan_link_attach_radius` (sphere). P2's Jacobian gives both a real
blade-pitch sensitivity at each stop (see the lesson's tables), larger at +72
than at -7, so a cited band on either would enter the study at once -- no
code change, only a `dimension_ref` or an inline `dimension` with a
`source_ref`. Sources to read: the 212956-005 drawing for the link's
centre-to-centre length, and the 215177-001 pitch plate drawing for the
tangential-link attach position. Neither is read into any topology yet.

## Addendum 2026-10-26 (handoff the_tangential_link_cites_its_drawing)

Both contributors are now cited; the study has no gap row.

- `tan_link_length`: **61.40 basic, ⌖Ø0.1 B** on 213863-004 A (the bare link body, in
  drawing-checker's inbox, run `20260910_154233_213863-004-A`), so ±0.05. 212956-005 A
  carries only reference lengths (overall (81.43)) and no centre distance.
- `pitch_plate_tan_link_attach_radius`: 215735-A sheet 2, 3X Ø7.950 with ⌖Ø0.2 A B, read as
  a sphere of radius 0.10.

Not closed by this (filed separately): the bearings' ball-centre offsets from the bore axes
(`ISSUE_20261026_the_tangential_link_ball_centre_offsets_are_not_in_its_band.md`).
