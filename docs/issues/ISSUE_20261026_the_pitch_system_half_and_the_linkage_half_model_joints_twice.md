---
type: chore
priority: med
status: deferred
area: topologies/vpa-pitch-linkage
reporter: agent
audience: strategy
found_by: docs/sessions/active/HANDOFF_20261026_pitch_system_folds_into_the_pitch_linkage_model.md
defer_until: 2026-11-10
resolution: deferred 2026-10-27 (triage) -- med beyond BUDGET=3
class: one_joint_modelled_at_two_granularities
---

# The pitch-system half and the linkage half still model some joints twice

Handoff `pitch_system_folds_into_the_pitch_linkage_model` (2026-10-26) folded
`topology_pitch_system.json` into `docs/topologies/topology_vpa_pitch_linkage.json`.
Ids merged only where one physical feature had two (the lesson's collision
table). The two halves were authored at different granularities. The
pitch-system half draws a joint as **one mating interface on both parts**. The
linkage half draws the same joint as **an interface on each part plus a `gap`**
between them. A chain crosses a gap only if the gap carries a value.

**Reconciled, with an assumed zero:** the two pitch-link joints. The
pitch-system studies cross `pitch_plate_link_joint` and `pitch_arm_link_joint`,
which now carry an `assumed` 0/0/0 band (`PLACEHOLDER` in the note). That is the
zero-clearance assumption the old document made silently, now a listed open
term. Totals are unchanged, but four studies' open-term counts rose by two.

**Not reconciled.** Both shapes stand side by side, and choosing one is a
modelling decision, not an id merge:

| joint | pitch-system half | linkage half | what is unclear |
| --- | --- | --- | --- |
| gas spring at the pitch plate | `pitch_plate_gas_spring_bushing` (plate + gas spring) | `pitch_plate_gas_spring_bore` + `gas_spring_rod_end` + gap `gas_spring_rod_to_pitch_plate` | same joint; pick one shape and re-point `pitch_plate_flange_to_gas_spring_bushing` / `gas_spring_body_height` |
| blade root in the hub | `blade_root_hub_seat` ("seated in the hub") | `hub_blade1_root_bearing_bore` ("root bearing bore") | a seat face or a bore axis? Same part pair, maybe different features |
| gas-spring mount's ground | `tan_link_mount_gas_spring_seat`: the gas-spring mount sits **on the tangential-link mount** | `gas_spring_mount_hub_face`: the gas-spring mount sits **on the hub** | the two documents contradict each other on the assembly |
| pitch arm on the blade root | `pitch_arm_blade_root_clocking` (clocking hole) | `pitch_arm_root_seat` (clamp face) | probably two features. The kinematic study borrows the clocking-hole edge's band for `pitch_arm_radius` |
| pitch plate's actuator connection | `piston_rod_end_bore` (vpa piston + plate) | `pitch_plate_spindle_bore_axis` (plate) | is the rod-end connection the spindle bore? The kinematic study borrows `pitch_plate_flange_to_link_hole`'s band for `pitch_plate_attach_height` across this difference |

Recommendation: take the gas-spring mount row first. It is a contradiction, not
a granularity difference, and Jeff can settle it from the CAD in a minute. The
gas-spring-at-plate row is the same shape as the pitch-link joints and can take
the same treatment once someone decides whether the pitch-system studies should
cross a joint gap at all.
