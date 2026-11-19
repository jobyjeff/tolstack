---
type: bug
priority: low
status: open
area: annotate / binding flow
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261118_the_walk_reads_the_binding_flow_and_the_pitch_plate_on_the_merged_page.md
---

# Small findings of the binding-flow and pitch-plate walk (2026-11-19)

These were found on the merged page (`integration` `a7a05123`, scratch root
`data/scratch/walk1118`, model v2) while binding blade root ↔ pitch arm in a
copy of Jeff's log. The review page is
`docs/sessions/lessons/REVIEW_20261118_the_binding_flow_and_the_pitch_plate.md`.
The shots are in
`docs/sessions/lessons/shots/the_walk_reads_the_binding_flow_and_the_pitch_plate_on_the_merged_page/`.
None of these blocks a bind.

| # | Finding | Evidence |
|---|---|---|
| F1 | Armed on the blade root, one scene pick costs about 370 ms (the average of 10 `__scene.pick` calls). Pre-selection runs a pick on every pointer move, so hovering lags on that part. The pitch arm and the piston parts answer at once. The blade mesh is 20 solids (see `ISSUE_20261117_the_blade_root_mesh_carries_near_copies_of_four_of_its_solids`) | `06a_blade_boss_armed` |
| F2 | The armed pick's framing does not bring the feature into view. The pitch arm's bore sits inside its ring, so it took one orbit. The clamp face (250) is on the side away from the camera: six orbit drags missed it, and it took two zoom-out notches and a half turn. The pick knows the feature's kind, and for a pin-in-bore edge it holds the contact faces, but it frames the whole part from a fixed side | `05a_arm_bore_armed`, `07_arm_seat_not_found`, `07d_arm_seat_hover` |
| F3 | A bind toast names one face of a set. "Bound pitch arm locating boss to face 6440 of 216332-001 blade bonded assembly" was written for a 4-face set, and "… clocking holes to face 4558" for an 11-face one. The toast also stays up through the next part's pick (the offer bar covers it, already filed as `ISSUE_20261114_design_the_group_offer_bar_covers_the_write_toast_in_the_pane_header`) | `10b_take_all_bar`, `07d_arm_seat_hover` |
| F4 | On the blade root, taking the offered "2 of 2 holes Ø6.35" bound 11 faces: 4558, 4559, 4561, 6403–6406 and 6572–6575. Face 4560 was left out, although the list offered it as its own row ("face 4560 · round · r 3.1749"). Two holes through three solids should give 12 faces | `09a_blade_clocking_offer_crop`; event `0109_blade_root_boss_to_clocking.json` in the scratch copy |
| F5 | An event's filename and `event_id` name some edge that touches the feature, not the feature itself. The clamp face's bind is `0105_pitch_arm_bore_to_clamp_face.json`, the boss's is `0104_blade_root_bearing_to_pitch_arm_boss.json`, and the attach bore's Unbind is `0102_pitch_link_flanged_bushing_bore_to_attach_bore_unbound.json`. Reading the folder, you cannot tell which feature an event is about | scratch copy, events 0102–0111 |
| F6 | v2 names the two 214820-002 parts `"214820-002 plain bushing"` (`name`), but its `display_name`, the tree and the map say "straight bushing". So one part has two words, depending on which field a surface reads | `docs/topologies/topology_vpa_end_stop_v2.json`, parts `bushing_214820_002` and `straight_bushing_214820_002` |
