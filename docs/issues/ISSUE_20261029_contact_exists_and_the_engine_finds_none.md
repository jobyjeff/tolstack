---
type: bug
priority: med
status: triaged
area: contact-suggestions
reporter: agent
found_by: docs/sessions/HANDOFF_20261028_an_agent_proposes_a_face_binding_and_a_human_ratifies_it.md
class: contact_engine_ignores_end_geometry
handoff: docs/sessions/HANDOFF_20261029_the_contact_engine_asks_the_ends_what_shape_they_are.md
---

# Three gap edges whose parts are joined report no contact, and structural interfaces are never compared at all

Measured 2026-10-29 (first agent proposal pass), from
`data/projections/feature-identity/contact_suggestions.json`:

- **`gas_spring_rod_to_pitch_plate`** (`pin_in_bore`): `no_contact`, nearest
  51.54 mm. The rod end is pinned to the plate, so a 51 mm gap means the gas
  spring (673d2ced) is modelled at another stroke than the assembly
  places the plate, or its occurrence is the wrong one. Either way it is not
  "these parts do not touch".
- **`hub_to_pitch_plate_spindle_coaxiality`** (`cylindrical_slide`):
  `no_contact`, nearest 1.04 mm against a 1.0 mm `reach_mm`. A coaxiality edge
  is an axis relation. Gating it on a surface distance throws it away
  whenever there is radial clearance or a sleeve between the parts.
- **`gas_spring_bushing_coaxiality`**: `no_occurrence`, because
  `gas_spring_mount_213668_002` (6d5b1321) records no assembly placement. The
  same missing placement blocks the mount's contact with the hub
  (`gas_spring_mount_hub_face`) and the lower piston head
  (`endstop_feather_contact`). So the mount's base face 83 could only be proposed
  by its 76.86 mm distance to face 1080, at medium.

**Feature gap, same area.** The engine runs on gap edges only. The first pass
ran `interface_contact.edge_candidates` by hand on the 16 interface nodes that
name two parts. It found the contact that decides direction on seven of them,
e.g. bolt face 31 on bushing face 13 at 99% overlap, washer face 5 on lug face
1432, and mount face 134 on hub face 526. That decided which flat face of each
washer, bushing and head is which end. That step belongs in the projection,
not in an agent's scratch script.
