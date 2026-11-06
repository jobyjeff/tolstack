# Lessons — stack wording drops filler and the hover says the same thing (2026-11-05)

## What changed

- 147 of 160 element / edge `name`s rewritten (13 already conformed), across the
  seven stacks and the one topology. Table below.
- **One phrase, two lengths.** `VA.elementDisplayLabel` (and its helpers and two
  tests) is deleted. The grid cell prints `record.title` = `edge.name`, and the
  cell's `title` is always that same string. Nothing between the document and the
  cell shortens a name any more.
- The rule is in `docs/SOP_TOLERANCE_STACK.md`, "Titling an artifact", once.
  `tests/test_element_names_follow_the_rule.py` checks the mechanical half
  (article/`its`, comma, dash clause, parenthesis); its witness is
  `scripts/mutation_witnesses/python__test-no-element-or-edge-name-carries-filler__4917a891.json`.
  The viewer guard `the element cell prints the authored name whole, and its
  hover title is the same string` is enrolled too (fast tier).
- The `[real]` check that "no element cell repeats its component's words" became
  "every element cell is its edge's name and its hover is the same string"; the
  blade_root-specific `[real]` check went (its subject, the trimming, is gone).
  Reason for the re-pin: those tests asserted the output of the deleted display
  rule, not a name fixture. Fast-tier pin is now 632 declared.

## The brief's `name` question

`BRIEF_20260915_prose_field_rules_names_and_derivable_counts.md` asked what a
`name` may carry. Answer (its `name` half only): the span, `<from> to <to>` or a
single word, no articles, no comma/dash clause, no parenthesis, no part name where
a column carries it. What a name used to carry goes to `note` (explanation),
`dimension` (a value) or `hardware_ref` / the part (an identifier). The
`description`/`note` fields were not touched, so nothing was demoted in this pass;
the dropped words are in the table below.

## Names the rule could not fully express

- **Stacks have no part column**, only `role` + `hardware_ref`. The SOP says part
  words stay where nothing else names the part (thermal stacks: `lower sleeve
  bore`) and a feature word separates collisions (`thin washer thickness`,
  `bushing flange thickness` vs `pitch flange thickness`, `under-head washer
  thickness`). Topology names for the same element are shorter (`thickness`)
  because its component column carries the part.
- **Variant codes**: the nine rotor grips, and the tan-link stack's -13/-14 grips,
  are separated only by the code the drawing prints (`U2H grip length`). Treated as
  a feature word, not a number; stated in the SOP.
- `travel between end stops`, `thread run-out and point region`,
  `ID datum to outer cylinder`: spans with no single from/to pair the drawing
  names; kept in the author's own words minus filler.
- `datum A` was used where the old name itself said the feature was the A datum
  (hub, gas-spring mount, the pitch plate's link-hole edge). The two sibling pitch
  plate edges still say `piston flange` because their old names did not say A.
- `shank protrusion` (was `worst-case protrusion -- full-diameter shank ...`) and
  `barrel L thickness` keep a word the annotator's shape rule
  (`feature_geometry.SUGGESTION_RULE_WORDS`) reads: edge names are its fallback, so
  a rename that lost `shank`/`barrel` would have changed which faces get suggested.
  Every rename was checked: required surface class before == after, except five
  stack elements whose old names had no class word (`straight bushing` -> `length`
  now answers planar) and the stack's `L thickness`, which now follows the
  topology's cylindrical `barrel`.

## Gotchas

- `PROVENANCE.md` rows for three stack files had to be amended again (the
  provenance guard reads the diff).
- The `[real]` viewer tier cannot run in a worktree against main's projections.
  I copied `data/inbox`, `data/projections`, `data/meshes` into this worktree's
  own (gitignored) `data/` and rebuilt there after committing -- nothing shared
  was written. The reviewer's main-checkout run still needs
  `scripts/rebuild_projections.ps1` first.
- Not done: no screenshot of the stop sub-stack was taken (see report).

## Old -> new
| file | id | old | new |
|---|---|---|---|
| hub_bearing_thermal_fit_m1 | `hub_bore_lower` | hub lower bearing-seat bore, M1 hub 212966-004 | hub lower bearing-seat bore |
| hub_bearing_thermal_fit_m1 | `sleeve_bore_lower` | M1 lower sleeve bore, 214955-002 | lower sleeve bore |
| hub_bearing_thermal_fit_m1 | `sleeve_wall_lower` | M1 lower sleeve radial wall thickness, 214955-002 | lower sleeve radial wall thickness |
| hub_bearing_thermal_fit_m1 | `bearing_od_lower` | lower bearing outer-ring OD (214589-002, ID 160 / OD 200) | lower bearing outer-ring OD |
| hub_bearing_thermal_fit_m1 | `hub_bore_upper` | hub upper bearing-seat bore, M1 hub 212966-004 | hub upper bearing-seat bore |
| hub_bearing_thermal_fit_m1 | `sleeve_bore_upper` | upper sleeve bore, 214959-002 (unchanged into M2) | upper sleeve bore |
| hub_bearing_thermal_fit_m1 | `sleeve_wall_upper` | upper sleeve radial wall thickness, 214959-002 (unchanged into M2) | upper sleeve radial wall thickness |
| hub_bearing_thermal_fit_m1 | `bearing_od_upper` | upper bearing outer-ring OD (214588-002, ID 95 / OD 130) | upper bearing outer-ring OD |
| hub_bearing_thermal_fit_m2 | `hub_bore_lower` | hub lower bearing-seat bore (LOWER seat, stage 1 outer member) | hub lower bearing-seat bore |
| hub_bearing_thermal_fit_m2 | `sleeve_bore_lower` | lower sleeve bore (stage 1 inner member, stage 2 outer member) | lower sleeve bore |
| hub_bearing_thermal_fit_m2 | `bearing_od_lower` | lower bearing outer-ring OD (214589-002, ID 160 / OD 200) | lower bearing outer-ring OD |
| hub_bearing_thermal_fit_m2 | `hub_bore_upper` | hub upper bearing-seat bore (UPPER seat, stage 1 outer member) | hub upper bearing-seat bore |
| hub_bearing_thermal_fit_m2 | `sleeve_bore_upper` | upper sleeve bore (stage 1 inner member, stage 2 outer member) | upper sleeve bore |
| hub_bearing_thermal_fit_m2 | `bearing_od_upper` | upper bearing outer-ring OD (214588-002, ID 95 / OD 130) | upper bearing outer-ring OD |
| pitch_link_to_pitch_plate | `bushing_214820` | plain bushing length (214820-002) | length |
| pitch_link_to_pitch_plate | `pitch_link_eye` | pitch-link eye: spherical bearing ball width (bearing identity UNCONFIRMED) | ball width |
| pitch_link_to_pitch_plate | `flange_bushing_flange` | flanged bushing flange thickness (NAS77A3-015A) | flange thickness |
| pitch_link_to_pitch_plate | `pitch_plate_flange` | pitch plate lug thickness (5X group) | lug thickness |
| pitch_link_to_pitch_plate | `washer_nas1149v0332` | washer thickness, NAS1149V0332H (.032 in) | thickness |
| pitch_link_to_pitch_plate | `bolt_grip_11` | NAS6403U11D grip length (.688 in) | grip length |
| pitch_link_to_pitch_plate | `bolt_length_11` | NAS6403U11D overall length, head bearing face to point (1.011 in) | head bearing face to point |
| pitch_link_to_pitch_plate | `cotter_hole_from_point` | cotter-hole centreline to bolt point (dimension M) | cotter-hole centreline to point |
| rotor_fastener_length | `washer_ms21299c3` | washer thickness, MS21299C3 (.063 in), under the bolt head | under-head washer thickness |
| rotor_fastener_length | `washer_nas1149v0332_tt` | washer thickness, NAS1149V0332H (.032 in), rotor balance-mass bolt | balance-mass washer thickness |
| rotor_fastener_length | `fastener_grip_u2h` | NAS6403U2H grip length (.125 in) -- shortest of nine options | U2H grip length |
| rotor_fastener_length | `fastener_grip_u3h` | NAS6403U3H grip length (.188 in) | U3H grip length |
| rotor_fastener_length | `fastener_grip_u4h` | NAS6403U4H grip length (.250 in) | U4H grip length |
| rotor_fastener_length | `fastener_grip_u5h` | NAS6403U5H grip length (.312 in) | U5H grip length |
| rotor_fastener_length | `fastener_grip_u6h` | NAS6403U6H grip length (.375 in) | U6H grip length |
| rotor_fastener_length | `fastener_grip_u7h` | NAS6403U7H grip length (.438 in) | U7H grip length |
| rotor_fastener_length | `fastener_grip_u8h` | NAS6403U8H grip length (.500 in) | U8H grip length |
| rotor_fastener_length | `fastener_grip_u9h` | NAS6403U9H grip length (.562 in) | U9H grip length |
| rotor_fastener_length | `fastener_grip_u10h` | NAS6403U10H grip length (.625 in) -- longest of nine options | U10H grip length |
| tan_link_to_pitch_plate | `flange_bushing_L` | flange bushing L thickness | barrel L thickness |
| tan_link_to_pitch_plate | `bushing_chamfer` | bushing chamfer size | chamfer size |
| tan_link_to_pitch_plate | `flange_bushing_flange` | flange bushing flange thickness | flange thickness |
| tan_link_to_pitch_plate | `straight_bushing` | straight bushing | length |
| tan_link_to_pitch_plate | `spherical_bearing` | spherical bearing width | width |
| tan_link_to_pitch_plate | `pitch_plate_flange` | pitch plate flange thickness | flange thickness |
| tan_link_to_pitch_plate | `washer_thin` | washer thickness (thin, .032 in) | thin washer thickness |
| tan_link_to_pitch_plate | `washer_thick` | washer thickness (thick, .063 in) | thick washer thickness |
| tan_link_to_pitch_plate | `thread_transition` | thread transition allowance (all fasteners) | thread transition allowance |
| tan_link_to_pitch_plate | `fastener_grip_13` | fastener grip, -13 (.812 in) | U13H grip length |
| tan_link_to_pitch_plate | `fastener_grip_14` | fastener grip, -14 (.875 in) | U14D grip length |
| tan_link_to_pitch_plate_take2 | `straight_bushing` | straight bushing | length |
| tan_link_to_pitch_plate_take2 | `spherical_bearing` | spherical bearing width | width |
| tan_link_to_pitch_plate_take2 | `flange_bushing_flange` | flange bushing flange thickness | flange thickness |
| tan_link_to_pitch_plate_take2 | `flange_bushing_L` | flange bushing L thickness | barrel L thickness |
| tan_link_to_pitch_plate_take2 | `bushing_chamfer` | bushing chamfer size | chamfer size |
| tan_link_to_pitch_plate_take2 | `fastener_grip_13` | fastener grip, -13 (.812 in) | grip length |
| tan_link_to_pitch_plate_take2 | `nut_minor_diameter` | nut minor diameter (.19-32 UNJF) | nut minor diameter |
| vpa_output_to_pitch_plate | `straight_bushing` | straight bushing | length |
| vpa_output_to_pitch_plate | `spherical_bearing` | spherical bearing width | width |
| vpa_output_to_pitch_plate | `fastener_grip` | fastener grip (.812 in) | grip length |
| topology | `pitch_link_length` | pitch link length between spherical-bearing centres | length |
| topology | `pitch_link_bearing_ball_centre_offset` | MS14101-3 ball centre offset from its outer-race seat | ball centre to outer-race seat |
| topology | `pitch_link_bearing_bore_to_ball_centre` | MS14101-3 ball bore axis to ball centre | bore axis to ball centre |
| topology | `pitch_arm_radius` | pitch arm radius, blade root clamp face to link bore | clamp face to link bore |
| topology | `blade_root_bearing_to_pitch_arm_seat` | blade root bearing bore to pitch arm clamp face | bearing bore to pitch arm clamp face |
| topology | `hub_blade_axis_offset` | hub spindle axis to blade-1 root bearing axis offset | spindle axis to blade-1 root bearing axis |
| topology | `pitch_plate_attach_radius` | pitch plate spindle axis to pitch-link attachment bore, radius | spindle axis to pitch-link bore radius |
| topology | `pitch_plate_attach_height` | pitch plate spindle axis to pitch-link attachment bore, height | spindle axis to pitch-link bore height |
| topology | `pitch_plate_gas_spring_offset` | pitch plate spindle axis to gas-spring attachment bore | spindle axis to gas-spring bore |
| topology | `pitch_plate_tan_link_attach_radius` | pitch plate spindle axis to tangential-link attachment bore | spindle axis to tangential-link bore |
| topology | `gas_spring_installed_length` | gas-spring mounting flange to rod-end bore | mounting flange to rod-end bore |
| topology | `pitch_plate_slide_bushings_to_piston_body` | gas-spring mount bushings to piston body -- the pitch plate's slide | gas-spring mount bushings to piston body |
| topology | `piston_body_id_datum_to_od` | piston body ID datum to its outer cylinder, coaxiality | ID datum to outer cylinder |
| topology | `tan_link_length` | tangential link length between spherical-bearing centres | length |
| topology | `tan_link_ms14101_ball_centre_offset` | MS14101-3 ball centre offset from its seat, tangential link | ball centre to seat |
| topology | `tan_link_ms14103_ball_centre_offset` | MS14103-3 ball centre offset from its seat, tangential link | ball centre to seat |
| topology | `gas_spring_mount_height` | gas-spring mount base face to bushing bore | base face to bushing bore |
| topology | `hub_spindle_to_gas_spring_mount_face` | hub spindle bore axis to gas-spring mount seat | spindle bore axis to gas-spring mount seat |
| topology | `tan_link_mount_height` | tangential link mount base face to attachment bore | base face to attachment bore |
| topology | `hub_spindle_to_tan_link_mount_face` | hub spindle bore axis to tangential link mount seat | spindle bore axis to tangential link mount seat |
| topology | `pitch_link_lower_centre_is_this_bearing` | MS14101-3 ball centre to the pitch link's lower joint centre | MS14101-3 ball centre to pitch link lower joint centre |
| topology | `pitch_link_upper_centre_is_this_bearing` | MS14101-3 ball centre to the pitch link's upper joint centre | MS14101-3 ball centre to pitch link upper joint centre |
| topology | `tan_link_mount_end_centre_is_this_bearing` | MS14101-3 ball centre to the tangential link's mount-end joint centre | MS14101-3 ball centre to tangential link mount-end joint centre |
| topology | `tan_link_plate_end_centre_is_this_bearing` | MS14103-3 ball centre to the tangential link's plate-end joint centre | MS14103-3 ball centre to tangential link plate-end joint centre |
| topology | `piston_head_lower_thickness` | lower piston head thickness | thickness |
| topology | `piston_head_upper_thickness` | upper piston head height, lower face to step face | lower face to step face |
| topology | `piston_cover_flange_to_end_stop` | piston cover bottom flange to internal end-stop shoulder | bottom flange to internal end-stop shoulder |
| topology | `gas_spring_mount_flange_to_end_stop` | gas-spring mount cover flange to end-stop surface | cover flange to end-stop surface |
| topology | `travel_between_end_stops` | travel between the two end stops | travel between end stops |
| topology | `gas_spring_mount_hub_face_to_cover_seat` | gas-spring mount base face to cover flange | base face to cover flange |
| topology | `gas_spring_mount_datum_a_to_end_stop` | gas-spring mount datum A to its top face, the feather-direction stop | datum A to top face |
| topology | `hub_lower_to_top_bearing_flange` | hub lower bearing flange (A datum) to top bearing flange | datum A to top bearing flange |
| topology | `hub_top_flange_to_top_deck` | hub top bearing flange to hub top deck | top bearing flange to top deck |
| topology | `hub_top_deck_to_tan_link_mount_seat` | hub top deck to tangential link mount seat | top deck to tangential link mount seat |
| topology | `hub_top_deck_to_vpa_mount` | hub top deck to actuator mounting face | top deck to actuator mounting face |
| topology | `hub_blade_root_seat_position` | hub A datum to blade root seat position | datum A to blade root seat position |
| topology | `hub_ring_gear_seat_position` | hub A datum to ring gear seat position | datum A to ring gear seat position |
| topology | `vpa_mount_to_end_stop_feature` | actuator mounting face to the end-stop feature | actuator mounting face to end-stop feature |
| topology | `end_stop_clearance` | piston end to end-stop feature -- the end stop | piston end to end-stop feature |
| topology | `piston_length` | piston length | length |
| topology | `pitch_plate_flange_to_link_hole` | pitch plate piston flange (A datum) to pitch link hole position | datum A to pitch link hole position |
| topology | `pitch_plate_flange_to_gas_spring_bushing` | pitch plate piston flange to gas-spring bushing position | piston flange to gas-spring bushing position |
| topology | `pitch_plate_flange_to_brake_attachment` | pitch plate piston flange to hydraulic brake attachment | piston flange to hydraulic brake attachment |
| topology | `pitch_arm_link_hole_to_clocking_hole` | pitch arm link hole to blade-root clocking holes | link hole to blade-root clocking holes |
| topology | `blade_root_clocking_to_oml` | clocking holes to the blade outer mould line | clocking holes to blade outer mould line |
| topology | `blade_root_clocking_to_hub_seat` | clocking holes to the hub bearing seat | clocking holes to hub bearing seat |
| topology | `blade_root_clocking_to_ring_gear_mesh` | clocking holes to the ring gear | clocking holes to ring gear |
| topology | `ring_gear_mesh_to_hub_seat` | ring gear pitch line to its hub seat | pitch line to hub seat |
| topology | `gas_spring_body_height` | gas-spring bushing to its mounting flange | bushing to mounting flange |
| topology | `gas_spring_mechanical_stroke` | gas spring mechanical stroke (full extension to full retraction) | full extension to full retraction |
| topology | `gas_spring_mount_position` | gas-spring mount flange to its seat on the tangential link mount | flange to tangential link mount seat |
| topology | `tan_link_mount_overall_height` | tangential link mount height | overall height |
| topology | `hydraulic_brake_body_height` | hydraulic brake attachment to its hub mount | attachment to hub mount |
| topology | `hub_top_deck_to_brake_mount` | hub top deck to hydraulic brake mounting face | top deck to hydraulic brake mounting face |
| topology | `bushing_214820` | plain bushing length (214820-002) | length |
| topology | `pitch_link_eye` | pitch-link eye: spherical bearing ball width (bearing identity UNCONFIRMED) | ball width |
| topology | `flange_bushing_flange_pitch_link` | flanged bushing flange thickness (NAS77A3-015A) | flange thickness |
| topology | `pitch_plate_flange` | pitch plate lug thickness (5X group) | lug thickness |
| topology | `washer_nas1149v0332` | washer thickness, NAS1149V0332H (.032 in) | thickness |
| topology | `fastener_grip_pitch_link` | fastener grip, NAS6403U11D (.688 in) | grip length |
| topology | `bolt_length_11` | NAS6403U11D overall length, head bearing face to point (1.011 in) | head bearing face to point |
| topology | `cotter_hole_from_point` | cotter-hole centreline to bolt point (dimension M) | cotter-hole centreline to point |
| topology | `shank_out_pitch_link` | shank out -- full-diameter shank beyond the modelled clamped stack | shank out |
| topology | `thread_region` | thread run-out and point region beyond the full-diameter shank | thread run-out and point region |
| topology | `washer_ms21299c3` | washer thickness, MS21299C3 (.063 in) | thickness |
| topology | `washer_nas1149v0332_tt` | washer thickness, NAS1149V0332H (.032 in), rotor balance-mass bolt | thickness |
| topology | `fastener_grip_u2h` | NAS6403U2H grip length (.125 in) -- shortest of nine options | U2H grip length |
| topology | `fastener_grip_u3h` | NAS6403U3H grip length (.188 in) | U3H grip length |
| topology | `fastener_grip_u4h` | NAS6403U4H grip length (.250 in) | U4H grip length |
| topology | `fastener_grip_u5h` | NAS6403U5H grip length (.312 in) | U5H grip length |
| topology | `fastener_grip_u6h` | NAS6403U6H grip length (.375 in) | U6H grip length |
| topology | `fastener_grip_u7h` | NAS6403U7H grip length (.438 in) | U7H grip length |
| topology | `fastener_grip_u8h` | NAS6403U8H grip length (.500 in) | U8H grip length |
| topology | `fastener_grip_u9h` | NAS6403U9H grip length (.562 in) | U9H grip length |
| topology | `fastener_grip_u10h` | NAS6403U10H grip length (.625 in) -- longest of nine options | U10H grip length |
| topology | `shank_out_rotor` | shank out -- full-diameter shank beyond the modelled clamped stack | shank out |
| topology | `straight_bushing_tan_link` | straight bushing length | length |
| topology | `spherical_bearing_tan_link` | spherical bearing width | width |
| topology | `flange_bushing_flange_tan_link` | flange bushing flange thickness | flange thickness |
| topology | `flange_bushing_L` | flange bushing L (barrel) thickness | barrel L thickness |
| topology | `bushing_chamfer` | bushing chamfer size | chamfer size |
| topology | `fastener_grip_13` | fastener grip, NAS6403U13H (.812 in) | grip length |
| topology | `protrusion` | worst-case protrusion -- full-diameter shank beyond the modelled clamped stack | shank protrusion |
| topology | `under_head_chamfer_washer` | under head chamfer washer thickness | thickness |
| topology | `pitch_flange_thickness` | pitch flange thickness | flange thickness |
| topology | `bushing_flange_thickness` | bushing flange thickness | flange thickness |
| topology | `spherical_bearing_vpa_out` | spherical bearing width | width |
| topology | `straight_bushing_vpa_out` | straight bushing length | length |
| topology | `fastener_grip_vpa_out` | fastener grip (.812 in) | grip length |
| topology | `shank_out_vpa_out` | shank out -- full-diameter shank beyond the clamped stack | shank out |
| topology | `piston_body_shoulder_to_top` | piston body shoulder to top face | shoulder to top face |
| topology | `piston_body_flange_to_top` | piston body flange to top face | flange to top face |
| topology | `piston_head_lower_face_flatness` | lower piston head lower face, mount contact to body seat | lower face mount contact to body seat |
