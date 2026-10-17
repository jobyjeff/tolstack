---
type: chore
priority: low
status: open
area: topologies/vpa_pitch_linkage
reporter: agent
found_by: docs/sessions/HANDOFF_20261016_a_kinematic_study_folds_the_sweeps_jacobian.md
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
