---
type: bug
priority: med
status: open
area: meshes/assembly-placement
reporter: agent
class: mesh_placement_disagrees_with_the_mechanism
found_by: docs/sessions/HANDOFF_20261103_the_slide_joint_is_the_mounts_bushings_against_the_piston_body.md
---

# The gas spring's mesh sits 51.54 mm from the plate it is pinned to

This is the stroke half of
`ISSUE_20261029_the_gas_spring_sits_at_another_stroke_and_its_mount_has_no_placement.md`,
refiled when that issue's placement half was resolved on 2026-11-03.
213668-002 now records its assembly occurrence.

`gas_spring_rod_to_pitch_plate` (`pin_in_bore`) is still `no_contact`, with a
nearest box gap of 51.54 mm. The contact projection was rebuilt from
`handoff/the_slide_joint_is_the_mounts_bushings_against_the_piston_body`.
The rod end is pinned to the plate, so either the gas spring (673d2ced) is
modelled at a different stroke from the plate's, or its recorded occurrence
is the wrong one.

Not fixable by a margin. Fixing it needs one of:

- a statement of which stroke the PMF200521 mesh is at, so that a sweep frame
  can place it;
- a STEP export at the as-modelled pose.
