---
type: bug
priority: low
status: deferred
area: viewer
reporter: agent
found_by: docs/sessions/HANDOFF_20261122_the_walk_reads_the_v2_study_and_the_map_on_the_merged_page.md
class: walk_small_findings
defer_until: 2026-12-25
resolution: deferred 2026-11-25 (triage) -- low, deferred by default
---

# Small findings of the v2 study walk (2026-11-23)

Seen on the merged page (`integration` at `f267da49`, scratch root
`data/scratch/walk1123`). Shots are in
`docs/sessions/lessons/shots/the_walk_reads_the_v2_study_and_the_map_on_the_merged_page/`.

- **F1. The blade-pitch study cannot be put down.** Once it is selected,
  the map keeps `map__quiet` on 163 elements whatever comes next: a click on
  the study's row again, Esc, a click on empty map, or selecting a part
  (`47_hub_selected_after_the_study_map_still_quiet.png`). Only choosing the
  other study, or a reload, clears it. The "Pick a study" select lists only
  "Travel between end stops", so it offers no way back to none.
- **F2. Both ends of one dimension are offered the same face.** On
  `214699-002 lower piston head`, the dimension "feather stop face to lower
  head seat face" offers face 7 (flat) at **both** ends: the agent's
  suggestion at the feather-stop end, and a contact row ("coincident with the
  mating face") at the seat end (`43_suggested_child_expanded.png`). Two
  features of one part cannot be one face. Taking both would bind them to it.

  > **Correction, 2026-11-23 (review of this walk): F2 is not a defect; do
  > not fix it.** The dimension is `piston_head_lower_face_flatness`
  > (`docs/topologies/topology_vpa_end_stop_v2.json`): "lower piston head
  > lower face flatness, as an offset", 214699-002 ⏥0.05, nominal 0. Its two
  > ends, `endstop_feather_contact` ("the lower head's lower face on the
  > gas-spring mount's end-stop face") and `piston_body_head_seat`, are two
  > regions of one face. One face, face 7, at both ends is the correct
  > binding, and both offers agree on it.
- **F3. Gap rows in the study grid carry names a reader cannot place.**
  `pitch_link_lower_inner_race_on_pitch_arm` (the stand-in pin) reads "pitch
  link bore to bore", and `tan_link_lower_inner_race_on_mount` reads
  "attachment bore to bore". Every gap row's part cell reads "— across a
  clearance —", including the press fits (`11_study_minus7_grid.png`).
- **F4. The tree moves the row you click.** Measured, as the screen y of the
  clicked row's label, 0.1 s after the click: opening the plate's piston-body
  fastener pattern moved it 174 px up; closing it, 648 px; opening the
  mount's pilot bore, 371 px; opening the upper head's step face, 1018 px.
  None of these move after 0.1 s, and none is animated. This is the first
  link of the staged binding-pane chain
  (`the_tree_sits_beside_the_3d_canvas_and_holds_still`). The numbers are
  here for it to measure against.
- **F5. A face bound at one bearing is tinted at every bearing drawn from
  the same mesh.** This is the likely cause of Jeff's "ball centre shows not
  bound, yet the spherical surface is highlighted green". A race is a solid
  of its bearing's one mesh (the part-mesh alias table: "a race's row names
  the bearing's whole mesh"). The pitch link's two MS14101-3 bearings are one
  mesh (`_815597cb`, two instances); the tangential link's mount-end bearings
  are another (`_34f032f0`, three instances). A binding is keyed (mesh, face
  id), so a face bound for one race reads bound wherever that mesh is drawn,
  including at a feature that is not bound. The seat-and-pattern link's shot
  `docs/sessions/lessons/shots/a_seat_and_a_pattern_get_contact_suggestions_too/06_ball_centre_pitch_link_upper_framed.png`
  shows the same effect for a suggestion. This walk did not re-shoot it.
  Fix shape: tint a bound face only on the solid (race) its feature is on.
