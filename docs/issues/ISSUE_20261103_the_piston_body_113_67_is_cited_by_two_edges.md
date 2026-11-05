---
type: chore
priority: low
status: deferred
area: topology / vpa_pitch_linkage
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261103_each_stop_is_its_own_stack.md
class: one_fact_written_twice
defer_until: 2026-12-05
resolution: triage 2026-11-05: low deferred by default (30d; class row has no program, so a date)
---

# The gas-spring mount's base face and the piston body's length are each stated twice in vpa_pitch_linkage

Two pitch-system-era duplicates the feather stop's axial chain
(`study_vpa_pitch_linkage_feather_stop_axial_position.json`, 2026-11-03) had to
walk around.

1. **The piston body's 113.67 is cited by two edges.** `piston_body_flange_to_top`
   (new, `gas_spring_piston_214700_002`, flange face to top face, 113.67 ±0.10,
   `inferred`) and the legacy `piston_length` (`vpa_piston`, between
   `piston_end_stop_face` and `piston_rod_end_bore`, authored about 0, ±0.10,
   `inferred`) cite the same printed dimension of 214700-002 A. The legacy edge
   is on a different part id (`vpa_piston`, "part identity not established")
   whose node names describe an actuator piston, not the gas-spring piston
   body. The new edge could not reuse it: a structural edge must sit on two
   interfaces of its own part, and `piston_rod_end_bore` is not on
   `gas_spring_piston_214700_002`.
2. **The gas-spring mount's base face is two nodes.** `gas_spring_mount_hub_face`
   says 213668-002 bolts to the hub, and `tan_link_mount_gas_spring_seat` says
   it seats on the tangential link mount. Jeff's 2026-11-03 statement ("if the
   hub ... or tan link mount thickness changes, then both housing end stops
   move the same amount") is the second, so
   `gas_spring_mount_datum_a_to_end_stop` was re-anchored to it; the first
   still carries `gas_spring_mount_height`,
   `hub_spindle_to_gas_spring_mount_face` and
   `gas_spring_mount_hub_face_to_cover_seat`. Related:
   `gas_spring_mount_position` (213668-002's ⌖Ø0.2 A B frame read as ±0.1,
   `untraced`, "which feature it controls is not establishable") ends on
   `gas_spring_mount_flange`, which the chain does not reach, so it is not in
   the feather stack.

What to decide: whether the pitch-system-era `vpa_piston` /
`gas_spring_mount_hub_face` modelling is retired in favour of the parts the end-stop
worksheet identified, which would merge each pair into one edge or node (and
move the pitch-system studies that select the legacy ones).
