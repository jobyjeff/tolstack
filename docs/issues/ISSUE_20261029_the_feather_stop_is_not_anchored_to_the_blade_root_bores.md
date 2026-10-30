---
type: feature
priority: med
status: open
area: kinematic study / travel between end stops
reporter: agent
found_by: docs/sessions/HANDOFF_20261029_the_plus72_stop_is_the_travel_datum.md
---

# The feather stop is not anchored to the blade-root bores: author the chain the declared gap names

`the_plus72_stop_is_the_travel_datum` (2026-10-29) declared, and did not
author, the chain that locates the +72° feather stop (the blade-pitch study's
datum) relative to the hub datum the blade angle is indexed to. It is the
`study_ref` contributor `vpa_pitch_linkage_hub_to_feather_stop` in
`docs/topologies/kinematic_study_vpa_pitch_linkage_blade_pitch_at_the_stops.json`,
carried as a **declared gap** (`gap` + `title`, no study behind it):
`applies_to: ["plus72", "minus7"]`, so both S461-607 checks are
`complete: false` naming it, and it sits on the projection's gap list. Today
its x-interval is zero at both stops, so nothing is drawn for it.

Jeff, 2026-10-29: *"the nominal location of both end stops is really indexed
relative to the blade root bores, since shifting those features relative to
each other along the z-axis actually shifts the blade angle."*

## What the authoring session needs

- A chain study (`study/v0`) of `vpa_pitch_linkage` whose output is the
  feather end-stop face's position along CAD Z (the spindle axis, the sweep's
  frame) relative to the blade-root bearing bores, in mm: blade-root bearing
  bores → hub → actuator mount / cover → feather end-stop face. Which edges
  exist already: the hub-to-gas-spring-mount and mount-to-end-stop edges the
  travel study and the lit-set bridge use
  (`hub_spindle_to_gas_spring_mount_face`, `gas_spring_mount_datum_a_to_end_stop`)
  are candidates, and the topology already joins the blade-root bore node
  `hub_blade1_root_bearing_bore` to the spindle by `hub_blade_axis_offset`
  (from `hub_spindle_bore_axis`) -- but that edge is the bore's offset from
  the spindle axis, and whether any edge carries the bore's **axial (CAD Z)**
  position against the mount face was not checked in this session.
- Its id must be `vpa_pitch_linkage_hub_to_feather_stop` (or the contributor
  re-pointed), and `parameter: actuator.value` with its sign read off the
  sweep: a +Z shift of the stop face is a shift of the driver's zero.
- When the study exists, **the loader refuses the gap** (`declared a gap, but a
  document ... declares that study`): delete `gap` and `title` from the
  contributor in the same change, and its leaves enter both stops' x-intervals.
- Every value cites a drawing callout or is an explicit gap (the repo's rule);
  the hub and blade-root bore drawings are what has to be read.
