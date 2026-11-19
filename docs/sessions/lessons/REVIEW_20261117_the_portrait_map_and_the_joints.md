# The portrait map and the joints, read against Jeff's 11-17 note and the 11-16 review's open rows

> **Where this ran:** 8000 still serves the main checkout on `master`
> (`38a0693b`). `master` is **52 commits behind** `integration`, and carries
> none of the four handoffs' code: its `map.js` has no portrait placement and
> no rotary symbol. This walk served `integration` (`b9475a88`, this branch's
> base) on drawing-checker's mount shape with
> `tests/debug_walk_merged_page_20261114.mjs`, port 8873. Data was rebuilt from
> this tree into `data/scratch/walk1117`. **Jeff's real log held 83 events
> before and after** (84 files with the README), and the sorted file listing
> hashed to `4471ab5a…` both times. This walk bound nothing, not even in the
> scratch copy. No code was changed.

**28 rows: 9 does it · 16 partly · 3 does not.** Three of Jeff's sentences
are answered elsewhere, so they are listed and not counted. The 16 joint rows
and the 5 solver rows are an inventory: the map draws every constraint the
model has (28 of 28), and the solver's word matches the model's at every
contact (6 of 6).

**What you can do now that you could not on 11-17:** on the merged page the
map is tall. In Side by side at 3840 it fills the height at zoom 0.897, where
the wide map sat at 0.566, and its smallest label is 15 px. Hub ↔ blade is a
rotary joint on the map, in its hover title, in the tree and in the Preview.
The flange + boss + pattern style now runs up the whole base stack (hub, mount,
gas-spring mount, cover), across pitch plate ↔ piston body, and down blade ↔
pitch arm. The piston heads have their own variants. A suggestion line now
names its face ("face 134 · flat"), and clicking it no longer turns the view.

**What is still wrong:** none of this is on your page yet. 8000 still draws the
wide map, and the hub ↔ blade bearing as a seat (shot `r_21`). That seat is the
"flange joint" you saw. Only 12 of the 56 feature ends are bound, all of them
from before, so every new constraint is waiting for a face. Three things on the
page itself:

- Select a part, and the lit labels of a three-route bundle run into each other
  (F1).
- A joint's Preview prints its rename history and a handoff's name, and its
  first chip reads `mating_surface` (F2).
- The upper head's fastener lane runs outside the pitch plate's district
  (filed). The map has no fold, a part's Preview is still empty, the pane has
  no orbit reset, and bound faces stay green at rest.

**Only you can decide:**

1. **Pitch arm on the blade root** (Q1): does the arm clamp against the root
   fitting's shoulder, so the 0.025 mm in the CAD is placement slack? Or does
   the cross pin set the arm's axial place, so the face is a clearance and the
   seat should go?
2. **The piston body's top** (Q2): what are its three Ø7 pockets, six Ø2.5
   holes and Ø4 centre bore? Gas passages, a fill port, a tooling feature, or a
   pin the assembly CAD leaves out? If one of them locates the upper head, the
   model is missing a constraint.
3. The three questions on the product-structure page
   (`REVIEW_20261117_the_models_parts_against_the_product_structure.md`, "You
   decide").

Shots: `shots/the_walk_reads_the_portrait_map_and_the_joints_on_the_merged_page/`.
Each one was read with vision before its row was written. Issues: F =
`ISSUE_20261117_small_findings_of_the_portrait_map_and_joints_walk` (row
number). The open issues from earlier walks are cited by name.

## Jeff, 11-17

| # | Jeff's sentence (short) | What the page does now | Shot | Verdict |
|---|---|---|---|---|
| K1 | Really like the subway map; make it permanent | Next handoff's (`the_map_is_the_only_drawing_and_classic_retires`). The map is the default, and Classic is one click away | `01_side_by_side_3840` | not counted |
| K2 | Flip the map to portrait so it fits Side by side | Tall: three columns, seven rows. At 3840 Side by side it fits at 0.897 (was 0.566), its smallest label is 15 px (was 9), and nothing is clipped. 8000 still serves the wide map | `01_side_by_side_3840`, `r_21_port_8000_serves_master` | does it |
| K3 | Next steps: ready to build the model in more detail? | Answered by the three paragraphs above | — | not counted |
| K4 | All the correct assembly structures | Answered by `REVIEW_20261117_the_models_parts_against_the_product_structure.md` | — | not counted |
| K5 | Propagate flange, boss and hole pattern to the gas-spring mount etc. | Seat + pattern + boss on gas-spring mount ↔ tangential link mount, gas-spring mount ↔ cover, pitch plate ↔ piston body and blade ↔ pitch arm. On blade ↔ arm the pattern is one cross-pin line. Variants: piston body ↔ lower head is seat + spigot, piston body ↔ upper head is spigot + 3 bolts (a new joint), and the two heads share a seat alone. Joints 15 → 16 | `j03_…`, `j04_…`, `j06_…`, `j07_…`, `j10_…` | does it |
| K6 | Hub ↔ blade is a flange joint; it should be rotary | On the merged page, a rotary symbol (circle and dot under a turning arrow). Hover title "blade 1 root bearing bore — a rotary joint". The tree row reads "rotary" and the Preview chip "rotary". 8000 still draws it as a seat (‖) | `j01_blade_root__hub`, `k6_rotary_joint_selected_3840`, `r_21_port_8000_serves_master` | does it |
| K7 | Isn't the 2D and 3D now unified? | One word in the model is read by the map, the tree, the Preview, Classic and the 3D picker's shape rule, which asks for a cylinder on a rotary joint. A click on the joint selects both features on the map and in the tree. The 3D pane neither draws the joint's kind nor reframes on it, and its two bound halves (2356, 2358) cannot be told apart from the rest of the hub's green | `k6_rotary_joint_selected_3840`, `k7_hub_bore_feature_selected_3840` | partly |

## Every joint in v2

The constraints are the model's (`docs/topologies/topology_vpa_end_stop_v2.json`).
The symbol is what the map draws on each route, read off its `data-symbol`. "Bound"
counts the joint's feature ends that hold a standing binding in Jeff's real log,
from a fold of a byte-identical copy. Each shot is the map at 3840 Side by side,
cropped to the joint with its first constraint hovered.

| # | Parts | Constraints (model) | Map draws | Bound ends | Shot |
|---|---|---|---|---|---|
| 1 | propeller hub ↔ blade bonded assembly | rotary (`hub_blade1_root_bearing_bore`) | rotary symbol | 2 of 2 | `j01_blade_root__hub` |
| 2 | propeller hub ↔ tangential link mount | seat · pattern · boss | seat (‖, turned to = on a vertical route) · ring of dots · ⊙, three parallel routes | 3 of 6 (hub side) | `j02_hub__tan_link_mount_215175_002` |
| 3 | tangential link mount ↔ gas-spring mount | seat · pattern · boss | ‖ · ring · ⊙ | 0 of 6 | `j03_gas_spring_mount_213668_002__tan_link_mount_215175_002` |
| 4 | gas-spring mount ↔ piston cover | seat · pattern · boss | ‖ · ring · ⊙ | 0 of 6 | `j04_gas_spring_mount_213668_002__piston_cover_214958_002` |
| 5 | gas-spring mount ↔ lower piston head | seat (feather stop) | ‖ | 0 of 2 | `j05_gas_spring_mount_213668_002__piston_head_lower_214699_002` |
| 6 | blade bonded assembly ↔ pitch arm | seat · pattern (cross-pin line) · boss | ‖ · ring · ⊙ | 0 of 6 | `j06_blade_root__pitch_arm` |
| 7 | pitch plate ↔ piston body | seat · pattern · boss | ‖ · ring · ⊙ | 1 of 6 (plate's pilot) | `j07_gas_spring_piston_214700_002__pitch_plate_215177_001` |
| 8 | piston body ↔ lower piston head | seat · boss | ‖ · ⊙ | 0 of 4 | `j08_gas_spring_piston_214700_002__piston_head_lower_214699_002` |
| 9 | lower piston head ↔ upper piston head | seat | ‖ | 0 of 2 | `j09_piston_head_lower_214699_002__piston_head_upper_214698_002` |
| 10 | piston body ↔ upper piston head | pattern · boss | ring · ⊙, each on a lane past the lower head. The ring's lane runs outside the district (`ISSUE_20261117_design_a_map_detour_lane_runs_outside_its_bodys_district`) | 0 of 4 | `j10_gas_spring_piston_214700_002__piston_head_upper_214698_002` |
| 11 | pitch arm ↔ pitch link | ball | cup and ball | 1 of 2 | `j11_pitch_arm__pitch_link` |
| 12 | pitch link ↔ pitch plate | ball | cup and ball | 1 of 2 | `j12_pitch_link__pitch_plate_215177_001` |
| 13 | tangential link mount ↔ pitch anti-rotation link | ball | cup and ball | 1 of 2 | `j13_tan_link_212956_005__tan_link_mount_215175_002` |
| 14 | pitch plate ↔ pitch anti-rotation link | ball | cup and ball | 1 of 2 | `j14_pitch_plate_215177_001__tan_link_212956_005` |
| 15 | gas-spring mount ↔ piston body | slide | slide mark on the 45° route | 2 of 2 | `j15_gas_spring_mount_213668_002__gas_spring_piston_214700_002` |
| 16 | piston cover ↔ upper piston head | clearance (the stops) | I-beam | 0 of 2 | `j16_piston_cover_214958_002__piston_head_upper_214698_002` |
| | **16 joints** | **28 constraints** | **28 symbols** | **12 of 56** | |

Hovering a route lights that one constraint and its two features, not the
whole bundle. That reads as right for a bundle of different kinds, so it is not
filed.

### The questions the joint and structure handoffs left for you

Copied from `ISSUE_20261117_the_blade_and_piston_joints_leave_questions_for_jeff`,
the only `needs: jeff` issue the joint handoffs filed (the base stack's handoff
found everything in the meshes and asked nothing). Answer here, and a strategy
session carries your answer into the model. Every number is a mesh
measurement, never a value.

| # | Joint | What the meshes show | The question | Shot |
|---|---|---|---|---|
| Q1 | blade bonded assembly ↔ pitch arm | The seat (the arm's face 250 against the root fitting's shoulder, faces 1079 / 6432) is **0.025 mm apart** in the CAD. The cross-pin holes line up within 0.02 mm. The arm's Ø64.030 bore sits on the root's Ø64.000 boss. Nothing touches the arm's other end face | Does the arm clamp on the shoulder (so 0.025 is placement slack), or does the cross pin set its axial place (so the seat is a clearance and goes)? The seat stays as authored until you say | `../the_blade_and_piston_joints_are_authored_as_what_the_parts_show/09_question_pitch_arm_clamp_face_250.png` (the arm framed with a pick armed; the clamp face itself is not singled out) |
| Q2 | piston body ↔ upper piston head | The piston body's top face has three Ø7.0 pockets on a Ø24 circle, 4.0 deep (faces 140–143, 150, 151), and six Ø2.515 holes in two rings (faces 8–19). Neither head has anything at those places. A Ø4.0 bore on the axis runs through the body's top and the upper head | What are they: gas passages, a fill port, a tooling feature, or a pin or dowel the CAD leaves out? If one locates the upper head, the model is missing a constraint | `../the_blade_and_piston_joints_are_authored_as_what_the_parts_show/10_question_piston_body_top_pockets_140.png`. The heads hide the pockets there, and this walk's `isolate` did not hide them either (`q2_piston_body_top_isolated`), so the face ids are the evidence |
| Q3 | pitch plate assembly ↔ pitch link (added 2026-11-18, handoff `the_pitch_plate_is_an_assembly_with_its_bushings`) | 215177 is now an assembly: the plate 215735-001 and a NAS77A3-015A flanged bushing pressed into one lug's **Ø7.950** bore (faces 1385/1386); the 214820-002 straight bushing sits in the other lug's **Ø8.520** bore (1380/1381), outside the assembly. `pitch_plate_link_attach_bore` stayed on the assembly so nothing re-keyed. Your binds disagree today: one takes 1380/1381 (the empty Ø8.520 bore) alone, the other adds 1509/1510 (the flanged bushing's Ø4.826 bore) | Which part is the pitch link bore a feature of: **(b)** the plate's Ø7.950 flanged-bushing bore, **(c)** the flanged bushing's Ø4.826 bore (recommended: the bolt, and so the ball, is located by the bushing bores), or **(a)** keep it on the assembly? Issue: `../../issues/ISSUE_20261118_which_part_the_pitch_plates_attachment_bores_sit_on.md` | (b) `shots/the_pitch_plate_is_an_assembly_with_its_bushings/q_pitch_link_b_plate_flanged_bore_1385_1386.png`; (c) `…/q_pitch_link_c_bushing_bore_1509_1510.png`; your binds `…/q_pitch_link_jeffs_bind_straight_bore_1380_1381.png` and `…/q_pitch_link_jeffs_other_bind_1380_1381_1509_1510.png` (the plate see-through, the faces marked green) |
| Q4 | pitch plate assembly ↔ tangential link (same handoff) | The same lug pair: the flanged bushing's lug bore Ø7.950 (1375/1376), its bore Ø4.826 (1452/1453 on the 215177 mesh, solid 1), the straight bushing's bore Ø8.520 (1370/1371). Nothing is bound on `pitch_plate_tan_link_attach_bore` yet | The same question; answer once for both unless the tangential link differs | (b) `…/q_tan_link_b_plate_flanged_bore_1375_1376.png`; (c) `…/q_tan_link_c_bushing_bore_1452_1453.png` |

## The solver against the model

The solver's joints, from the P2 sweep
(`data/inbox/linkage-sweeps/vpa-pitch-p2-20261105-204957.json`), against v1, the
sweep's model. This was re-read on the merged tree: `LINKAGE_JOINT_INTERFACES` in
`tolerance_stack/kinematic.py`, v1's interface words in the rebuilt projection,
and `tests/test_topology.py::test_an_edge_at_a_swept_joint_says_what_the_joints_type_suggests`
(passed, comparing 6 contacts). v2 says the same at each joint.

| Solver joint | Solver type | Bodies | Solver's word | Model's word (v1 and v2) | Shot |
|---|---|---|---|---|---|
| `plate_slide` | cylindrical | base ↔ pitch plate | cylindrical slide | `pitch_plate_slide_bushings_to_piston_body`, cylindrical slide | `j15_…` |
| `blade_hinge` | revolute | base ↔ blade | rotary | `hub_blade1_root_bearing_bore`, rotary (was `contact` before 11-17) | `j01_blade_root__hub` |
| `pitch_link` | distance, two ball ends | pitch link ↔ pitch plate, pitch link ↔ blade | ball | `pitch_plate_link_joint`, `pitch_arm_link_joint`, ball | `j11_pitch_arm__pitch_link`, `j12_…` |
| `tan_link` | distance, two ball ends | tan link ↔ base, tan link ↔ pitch plate | ball | `tan_link_mount_joint`, `tan_link_plate_joint`, ball | `j13_…`, `j14_…` |
| `actuator` | axial position | — | none (the driver's coordinate) | none | `01_side_by_side_3840` (nothing is drawn for it, correctly) |

## The 11-16 review's open rows, re-read

| # | Jeff's sentence (short) | What the page does now | Shot | Verdict |
|---|---|---|---|---|
| J3 | Another pass at the suggestion filtering? | S3 and S4 are fixed: the line names its face, and clicking it leaves the view alone. Mate ranking and patterns stand. S6 (the pattern offer in the pane's head) was not re-walked | `r_j4c_hover_face_134`, `r_j4d_click_face_134_view` | partly |
| J4 | "Suggested, high" under the mount base face, but only a Pick a face button | The line reads "face 134 · flat · agent suggested · high", with Take on hover. Clicking the line leaves the view where it was | `r_j4b_mount_suggestion_open`, `r_j4c_hover_face_134`, `r_j4d_click_face_134_view` | does it |
| J9 | Nothing happens when I expand the links | The three bearings still have 0 features, so folded and open read the same | `r_2_collapse_assemblies` | partly |
| 2 | Assemblies collapsible, part number indented | Folds work. v2's bearings have no rows, so no indent shows | `r_2_collapse_assemblies` | partly |
| 3 | A collapsed row shows the children's total | "1 dimension" (`ISSUE_20261114_design_a_folded_assembly_row…`, deferred) | `r_2_collapse_assemblies` | partly |
| 4 | DAG groups expandable | The map has no fold. Collapse assemblies leaves it unchanged (`ISSUE_20261116_what_the_map_does_not_draw_yet`, triaged) | `r_2_collapse_assemblies` | does not |
| 5 | View shortcuts: collapsed vs expanded | Collapse assemblies / Expand all change the grid only | `r_2_collapse_assemblies` | partly |
| 13 | A selected part's bound faces show harder | The hub selected: the whole part goes orange and its bound faces are lost in it | `r_13_hub_part_selected` | partly |
| 15 | Drawing links in the Preview for each part | An interface's Preview links 214373-003. A part's Preview is empty on hover and on click | `k6_rotary_joint_selected_3840`, `r_13_hub_part_selected` | partly |
| 20 | Bound faces permanently green | Still green at rest | `01c_side_by_side_3840_pane` | partly |
| 21 | Binds keep getting wiped | Nothing was bound here. Jeff's 83 events stand in the scratch fold. 8000 still serves `master`, 52 commits behind | `r_21_port_8000_serves_master` | partly |
| 26 | View-settings bar above the grid | It is there. At 3840 Side by side, "View" still wraps onto a second line | `01_side_by_side_3840` | partly |
| 34 | Filters bound / unbound / all, unbound first | "All · Unbound" drops the hub, the tangential link and the pitch link. The count stays 43, there is no Bound option, and the joints between bodies are not filtered | `r_34_filter_unbound_tree` | partly |
| 40 | Add or remove parts in a body | Only show/hide checkboxes (`ISSUE_20261114_three_tree_requests…`, deferred) | `r_34_filter_unbound_tree` | does not |
| 41 | The Stacks section is vestigial | The section is gone. Both spindle stacks are still options in the model list | `r_j4_mount_base_face_tree` | partly |
| 47 | Inconsistent hyphens | "tangential-link bearing, narrow end" and "pitch-link spherical bearing" remain on the map | `j13_tan_link_212956_005__tan_link_mount_215175_002`, `01_side_by_side_3840` | partly |
| 48 | 3D navigation gets stuck; need an orbit reset | No reset control or key in the pane (`ISSUE_20261114_the_3d_pane_has_no_way…`, deferred) | `01c_side_by_side_3840_pane` | does not |
| M4 | Jumpers inside a part | No jumper crosses a part's name in any shot. When a part is selected, its lit pin labels on a bundle overlap (F1) | `01_side_by_side_3840`, `r_13_hub_part_selected` | does it |

## The six regions (Map selected; fresh load per window)

Measured the way `tests/debug_map_shots_20261116.mjs` measures (the region is
`#topopane`, the smallest label is the shortest drawn text that is not a pin
label, the symbol is the narrowest `map__symbol use`). "11-16" is the wide map's
number, from the portrait lesson's old column. In every region the drawn counts
match the model (5 bodies, 15 parts, 55 features, 43 dimensions, 28
interfaces), nothing is clipped, and the map sits inside its region.

| # | Window · view | Region | Zoom 11-16 → now | Smallest label 11-16 → now | Symbol | Reads? | Shot | Verdict |
|---|---|---|---|---|---|---|---|---|
| R1 | 3840 · Side by side | 1201 × 2160 | 0.566 → **0.897** | 9 → **15 px** | 9 px | Yes. It fills the height, and every number, name and symbol reads | `region_3840x2160_both`, `region_3840x2160_both_map` | does it |
| R2 | 3840 · DAG view | 2390 × 2160 | 1.126 → 0.925 | 18 → 15 px | 9 px | Yes, centred | `region_3840x2160_dag` | does it |
| R3 | 5120 · Side by side | 1841 × 2160 | 0.868 → 0.925 | 14 → 15 px | 9 px | Yes | `region_5120x2160_both` | does it |
| R4 | 5120 · DAG view | 3670 × 2160 | 1.73 → 0.925 | 27 → 15 px | 9 px | Yes, centred, with a lot of empty region either side | `region_5120x2160_dag` | does it |
| R5 | 1920 · Side by side | 485 × 1080 | 0.229 → 0.362 | 4 → 6 px | 4 px | A thumbnail: districts, boxes, routes and symbols read. Numbers read when looked for. Names need a wheel notch | `region_1920x1080_both` | partly |
| R6 | 1920 · DAG view | 958 × 1080 | 0.451 → 0.463 | 8 → 8 px | 5 px | Borderline. Numbers and names read when looked for, and the symbols are small | `region_1920x1080_dag_map` | partly |

At 3840 Side by side the map is now width-bound (0.897 against 0.925 everywhere
else). The upper head's two detour lanes widened it after the portrait handoff
measured 0.933 (F3).

## After Classic retired (handoff `the_map_is_the_only_drawing_and_classic_retires`, 2026-11-17)

Your 11-17 yes ("let's go ahead and make it permanent") is in: the DAG region
draws the map for **every** model, there is no Map · Classic switch, and the
rails drawing is gone with everything only it used. The grid is unchanged:
its rows, read as text, are **identical** before and after for v2, v1, and v1
with three studies selected (`pitch_link_shank_out`,
`pitch_system_blade_angle_worst`, `pitch_system_end_stop_minus7`).

Shots: `docs/sessions/lessons/shots/the_map_is_the_only_drawing_and_classic_retires/`,
taken with `tests/debug_classic_retired_20261117.mjs` against a projection
built from this branch. Each was read by eye except the v2 DAG-view pair, which is measured only (the same drawing as Side by side, centred).

| What | Shot | What it shows |
|---|---|---|
| v2, 3840 · Side by side | `v2_3840_both`, `v2_3840_both_region` | As the walk left it: zoom 0.897, every count equal to the model's (5 / 15 / 55 / 43 / 28), no box overlaps, no defect note. |
| v2, 3840 · DAG view | `v2_3840_dag`, `v2_3840_dag_region` | The same, centred, zoom 0.925. |
| v1, 3840 · Side by side | `v1_3840_both`, `v1_3840_both_region` | v1's first map. It has no layout file, so its parts are placed one column per body, in tree order. Every count equals the model's (13 / 35 / 113 / 82 / 51) and no two boxes overlap. At Fit it is a thumbnail (zoom 0.219), so a wheel-in is needed to read it. |
| v1, 3840 · DAG view | `v1_3840_dag`, `v1_3840_dag_region` | Zoom 0.436: numbers and names read. The pitch-plate column runs thirteen parts tall. Long diagonal routes cross other bodies, and the layout reports 63 defect notes, 59 of them a route drawn through a box it does not end on. Two names collide at the top: the ground body's name over the hub's number, and a symbol on the lower piston head's district name. |
| The bar, before | `before_bar` | Rows · Rows: labelled · Lengths · Fit · Leaders · Side by side / 3D / DAG · Groups (4 of 4) · View, and Map · Classic in the region's own header. |
| The bar, after | `after_bar` | Rows · Rows: labelled · Fit · Side by side / 3D / DAG · Groups (2 of 2) · View. |

**What went, and what each control became**

| Control on `master` | Now | Why |
|---|---|---|
| Map · Classic (the region's header) | removed | The map is the region's drawing for every model. |
| Rows: Comfortable / Compact | kept | The grid's row height. |
| Rows: labelled / values only | kept | The grid's edge rows. |
| Lengths | removed | It stretched the rails' bars. The map has no lengths to stretch. |
| Fit, and the `0` key | re-pointed at the map | Fits the whole map to its region. |
| Leaders | removed | It drew lines from the rails' dots to the 3D scene. |
| Side by side · 3D · DAG | kept | The pane. |
| Unused: dimmed / hidden (only with a study) | kept | It reaches the 3D scene's unlit look and the grid's band. |
| Collapse assemblies · Expand all | kept | The grid. |
| Groups | re-pointed at the grid | Bodies and Parts toggle the grid's brackets. The two study kinds were rails containers and are gone. |
| View | kept, Palette only | Colour by, Group fill, Graph width and Parts drew the rails. The palette inks the map and the grid. |

**For you to decide:** whether v1 wants a hand arrangement now. It draws
whole and correctly. Its columns follow the model's body order, though, not a
picture of the mechanism, and the 59 crossings read as noise at Fit. v2's
layout file shows what an arrangement buys. The open rows of
`ISSUE_20261116_what_the_map_does_not_draw_yet` (the fold control, a study as
a route) are fenced out of this handoff and still to come.
