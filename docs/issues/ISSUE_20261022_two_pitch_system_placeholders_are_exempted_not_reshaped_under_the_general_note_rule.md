---
type: chore
priority: low
status: open
area: topologies/pitch-system
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261022_a_general_profile_note_bands_a_model_defined_term.md
---

# Two pitch-system placeholders are exempted from the retired-stand-in rule, not re-shaped by it

Since 2026-10-22 a topology refuses an `assumed` band on an edge whose part has
a `drawing`, unless the citation's `no_drawing_governs` says why no drawing
governs that quantity (`tolerance_stack/topology.py`; the SOP's "What a term
cites when its drawing does not band it"). Two committed edges in
`docs/topologies/topology_pitch_system.json` would have tripped it. They now
carry an explicit `no_drawing_governs` instead of being re-shaped:

| edge | part / drawing | why it was exempted |
| --- | --- | --- |
| `vpa_mount_to_end_stop_feature` | `vpa_208510_007` / 208510-007 | the supplier actuator's drawing is in no inbox and no drawing-checker run |
| `pitch_plate_flange_to_brake_attachment` | `pitch_plate_215177_001` / 215177-001 | the hydraulic brake is a design concept; no run of 215177 mentions a brake |

`tests/test_general_note_band.py::test_every_committed_assumed_band_on_a_drawn_part_says_why`
pins exactly these two, so a third exemption is a visible decision.

The question for strategy is whether either should become a `gap` under the
rule's last row ("nothing governs it → a gap, and the study is incomplete").
Doing that removes a ±0.1 band from `study_pitch_system_end_stop_minus7`,
`_plus72`, `_blade_angle_average`, `_blade_angle_worst` and
`_vertical_hub_to_pitch_arm`, and from `WORKSHEET_endstop_vision_baseline.md`'s
numbers. That is a model change, so this handoff did not make it.

Recommendation: the brake edge is a design-concept alternative, and I would
leave it exempt. The VPA edge waits on the same VPA identity question as
`ISSUE_20261016_two_vpa_part_facts_the_pitch_stacks_wait_on.md`, so re-shape it in
the handoff that acts on Jeff's answer there.
