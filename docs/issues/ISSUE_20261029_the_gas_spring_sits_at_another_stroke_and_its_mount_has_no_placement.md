---
type: bug
priority: med
status: open
area: meshes/assembly-placement
reporter: agent
found_by: docs/sessions/HANDOFF_20261029_the_contact_engine_asks_the_ends_what_shape_they_are.md
class: mesh_placement_disagrees_with_the_mechanism
---

# The gas spring sits 51.54 mm from the plate it is pinned to, and its mount records no assembly placement

The data half of `ISSUE_20261029_contact_exists_and_the_engine_finds_none.md`,
refiled when that issue's engine half was fixed. The contact engine now asks
the ends what shape they are and judges coaxiality as axes, and these two
edges still find nothing. Their cause is the meshes' placements, not the
engine. Re-measured 2026-10-29 against a projection rebuilt from
`handoff/the_contact_engine_asks_the_ends_what_shape_they_are` @ `43a45961`:

- **`gas_spring_rod_to_pitch_plate`** (`pin_in_bore`; both ends ask for a
  cylinder): `no_contact`, nearest box gap **51.54 mm**. The rod end is pinned
  to the plate. A 51 mm gap means the gas spring (673d2ced) is modelled at a
  different stroke from the one the assembly places the plate at, or its
  recorded occurrence is the wrong one.
- **`gas_spring_bushing_coaxiality`** (`cylindrical_slide`): `no_occurrence`.
  `gas_spring_mount_213668_002` (6d5b1321) records no assembly placement. The
  same gap blocks the mount's contacts with the hub
  (`gas_spring_mount_hub_face`) and the lower piston head
  (`endstop_feather_contact`).

Neither is fixable by a margin. It needs either a STEP export that places the
mount, or a statement of which stroke the gas spring's mesh is at, so a
sweep frame can place it.
