---
priority: high
depends_on: [a_link_is_a_machined_part_and_two_bearings_each_two_races]
model: opus
hitl: false
---

# HANDOFF 2026-11-19 — the_pitch_plate_carries_its_own_features_and_each_lug_is_a_bolt_stack: 215177-001 is only the container, the plate 215735-001 carries the features, and each link lug is the stack Jeff described

Source: Jeff's note `20261119T142516_ci28ci` (2026-11-19):

> Pitch plate assembly: the assembly is now in the map, but the
> components/composition is a bit strange. 215177-001 IS the pitch plate
> assembly, yet is shown as a child of the assembly collector, parallel to
> the 215735-001 pitch plate part (which is actually a child of the
> assembly). …
> What it should actually be: The container (215177-001), contains the pitch
> plate (215735-001) and each flanged bushing. Each flanged bushing has a
> bore-boss and a flange connection to the pitch plate. Each flanged bushing
> also has a flange connection to the spherical inner race and a bore-boss
> to the shoulder bolt (not included in this model yet). The shoulder bolt
> has a bore-boss to the spherical inner race. … The shoulder bolt also has
> a bore-boss to the straight bushing which then has a bore-boss back to the
> pitch plate part.
> I think that once the current container incorrectly titled 215177-001 is
> merged with the other 215735-001 pitch plate, all the screwy crossed lines
> in the dag will get rearranged, but the agent will likely need to re-draw
> the map based on the new topology to make it look clean.

And, on scope: "I didn't go into the rest of the fastener stack around the
spherical bearings. The straight bushing length, washers, fastener grip
length etc. are all irrelevant to the kinematic model/end stop tolerance
study … the ancillary studies can always be added later."

This also answers D6 of
`docs/sessions/lessons/REVIEW_20261118_the_binding_flow_and_the_pitch_plate.md`
(which part the link bores sit on): the bolt is located by the bushing
bores, and the bolt is now in the model.

Link 5 of the chain. Read the lessons of links 1–4 first; link 4's lesson
says what it left at the two plate ends. Screenshot of what Jeff objected to:
`C:\workspace\forge\data\inbox\atomic-notes\attachments\20261119T142516_ci28ci\paste-20261119T134821.png`.

Baseline: tolstack `master` at `ccfe4926` plus the handoffs ahead in the
chain. Scope: `docs/topologies/topology_vpa_end_stop_v2.json`,
`docs/topologies/map_vpa_end_stop_v2.json`,
`docs/topologies/part_mesh_aliases.json`, `tolerance_stack/topology.py` for
item 6 only, the tests and docs a model change moves (link 4's handoff lists
them). Do NOT touch v1, the kinematic study file, `C:\workspace\linkage`,
the vocabularies, or the links' own parts (link 4's).

## What v2 holds today at the pitch plate (read 2026-11-19, before link 4)

- `pitch_plate_215177_001` (the assembly) owns five nodes:
  `pitch_plate_spindle_bore_axis`, `pitch_plate_link_attach_bore`,
  `pitch_plate_tan_link_attach_bore`, and two it shares with
  `gas_spring_piston_214700_002`: `piston_body_plate_flange_seat` and
  `gas_spring_piston_fastener_clocking` (`fastener_pattern`). It is the
  `part` of four structural edges: `pitch_plate_attach_radius`,
  `pitch_plate_tan_link_attach_radius` (both v1 ids),
  `pitch_plate_pilot_to_piston_flange`, `pitch_plate_pilot_to_piston_fasteners`.
- `pitch_plate_215735_001` (child) owns the four bushing bores
  (`pitch_plate_link_flanged_bushing_bore`, `…_link_straight_bushing_bore`,
  `…_tan_link_flanged_bushing_bore`, `…_tan_link_straight_bushing_bore`) and
  `pitch_plate_link_bushing_bores_position` (and its tangential twin).
- Each flanged bushing (children of 215177: `flanged_bushing_nas77a3_015a`,
  `flanged_bushing_nas77a3_015a_tan_link`) has an OD and a bore, no flange
  face, no `drawing`. Each straight bushing (top level:
  `bushing_214820_002`, `straight_bushing_214820_002`) has an OD and a bore.
- Per lug, four gap edges: flanged OD in the plate (`press_fit`), straight
  OD in the plate (`transition_fit`), flanged bore to the assembly's attach
  bore (`pin_in_bore`), straight bore to the flanged bore (`pin_in_bore`).
  The last two stand in for a bolt the model does not have; the 11-18 lesson
  says the straight bushing's was bent to suit the map.
- No bolt in v2. In the meshes, `asm217755_NAS6403U11D` has 5 instances,
  named `NAS6403U10D.3`, under `215177-001.2/prd-e-03481962.N`, the group
  that also holds a straight bushing.

## Deliverables

1. **215177-001 is the container and nothing else.** Its three own features
   that are the plate's move to `pitch_plate_215735_001` with their ids
   unchanged (`pitch_plate_spindle_bore_axis`,
   `piston_body_plate_flange_seat`, `gas_spring_piston_fastener_clocking`),
   and the two `pitch_plate_pilot_to_…` edges become dimensions of 215735.
   The assembly then owns no node, and the map draws it as its labelled
   outline round the plate and the two flanged bushings (link 2). The
   straight bushings and bolts stay outside it: they go in at the top level
   (Jeff, 2026-11-17).
2. **The two attach bores leave v2.** `pitch_plate_link_attach_bore` and
   `pitch_plate_tan_link_attach_bore` stood for "where the link attaches";
   the stack below says it. `pitch_plate_attach_radius` and
   `pitch_plate_tan_link_attach_radius` leave with them, replaced by a
   dimension of 215735 from the spindle axis to each flanged-bushing bore
   (new ids). v1 keeps all four.
3. **A bolt at each lug.** The part number is read from the mesh tree and
   the product-structure page, never recalled; say in the lesson which
   instances you took and why, and whether the tangential lug's bolt is the
   same number. If either is not certain, author the part with what is
   certain and put the number on the question list. Jeff calls it the
   shoulder bolt; name it by number and everyday name. It is in the pitch
   plate's body.
4. **Each lug's stack, exactly this and no more:**

   | Joint | Kind |
   |---|---|
   | flanged bushing OD in the plate's bore | `press_fit` (exists) |
   | flanged bushing's flange on the plate's face | a seat (a node the two parts share) |
   | bolt shank in the flanged bushing's bore | `pin_in_bore` |
   | flanged bushing's flange against the inner race's face | a seat |
   | bolt shank in the inner race's bore | `pin_in_bore` (replaces link 4's stand-in) |
   | straight bushing's end against the inner race's other face | a seat (the clamp) |
   | bolt shank in the straight bushing's bore | `pin_in_bore` |
   | straight bushing OD in the plate's bore | `transition_fit` (exists) |

   Inside each part, the structural dimensions that join its features (a
   flange face to its bore, the inner race's two faces, the bolt's shank).
   No washer, nut or grip length. No value is invented: a dimension with no
   source read yet says so, as v2's others do.
5. **The flanged bushings carry their number** on the tree and the map
   (`docs/issues/ISSUE_20261119_design_the_maps_flanged_bushing_boxes_carry_no_part_number.md`),
   cited from the mesh (`NAS77A3-015A`; the instance names say
   `NAS77C3-015`: put the difference on the question list).
6. **A part with children carries no node**, refused by name in
   `tolerance_stack/topology.py`, once v2 complies (v1 has no child parts).
   The wrong outcome it prevents: the merged page of 2026-11-19, where the
   assembly's own box read to Jeff as a second pitch plate. It fires on a
   model author, never on Jeff. An assembly-level dimension between its
   parts' features stays allowed (link 2).
7. **Re-draw the map round the pitch plate.** Author the places for the
   whole region from the new model: the 215177 outline holding the plate
   and both flanged bushings; each lug's bolt, straight bushing and inner
   race beside the link they serve; nothing crossing the outline that does
   not end inside it. Zero layout notes, no route through a box, no shared
   run (link 1's notes). Compare with Jeff's screenshot and with his list:
   each sentence of "What it should actually be" is a thing you can point
   at on the map.
8. **Jeff's bindings keep reading**, by link 4's rule and mechanism: write
   nothing to `C:\workspace\tolstack\data\inbox\feature-identity\`; every
   moved feature reads bound to the same faces on his real log. The two
   attach bores' bindings (the faces the 11-18 review page called a
   disagreement) stop being read with their features; list each such
   binding in the lesson with the new feature its faces belong to, so the
   review page can offer the re-pick.
9. `docs/issues/ISSUE_20261118_which_part_the_pitch_plates_attachment_bores_sit_on.md`
   is resolved by Jeff's note; say so in it.

## Definition of done

- v2 loads with no node on any part that has children; each lug's eight
  joints exist by the table (asserted by ids and kinds); the plate end of
  each link is connected from the link's outer race to the plate 215735
  through inner race, bolt and bushings (assert a path).
- The sweep still plays on v2 and the four fitted centres are unchanged.
- Shots, read before the lesson: the pitch plate region of the map beside
  Jeff's screenshot at 3840 Side by side and at 1536 wide; the tree with
  215177-001 open; each Groups switch off in turn; the 3D pane with a bolt
  selected.
- Tiers as `CLAUDE.md`'s table; a witness spec for item 6's guard.
- Lesson (`docs/sessions/lessons/LESSONS_20261119_the_pitch_plate_carries_its_own_features_and_each_lug_is_a_bolt_stack.md`):
  the v1 ids v2 dropped here and the chain in their place (added to link
  4's table); the question list (bolt numbers, NAS77A3 against NAS77C3,
  anything the meshes contradict in Jeff's description, stated as a
  question and not resolved by guessing); the bindings that need a re-pick.
