# The map and the binding flow, read against Jeff's 11-15 note and the 11-12 review's open rows

> **Where this ran:** 8000 still serves the main checkout on `master`.
> `master` is 67 commits behind `integration`, and `/tolstack/viewer/map.js`
> returns 404 there. This walk served `integration` (`61f78e19`) on
> drawing-checker's mount shape with `tests/debug_walk_merged_page_20261114.mjs`.
> Data was rebuilt from this tree into `data/scratch/walk1116`. Every bind went
> to that scratch copy of the log. **Jeff's real log held 83 events before and
> after, and the file listing hash was unchanged.** No code was changed by this
> walk.

**43 rows: 22 does it · 17 partly · 4 does not.** Two of Jeff's sentences ask
nothing of the page, so they are listed and not counted.

**What you can do now that you could not on 11-15:** unbind the hub's root
bore, and its side lists your two blade-coaxial halves first (2356 and 2358,
"Ø82.55 vs Ø82.51"). One Take binds both halves. A hole of a pattern offers
"Take all 10 holes", which binds the whole circle. The DAG region opens on the
tube map, with Classic one click away.

**What is still wrong:** none of this is on your page until the batch merge
and a projection rebuild. Shrinking the browser window with the pane open
collapses the map to 0 px (`ISSUE_20261116_shrinking_the_window…`). On the
map, jumpers strike through part names, and a click inside a box does nothing.
A contact suggestion shows its face number only on hover, and clicking it
turns the 3D view edge-on to the flat face. The map has no fold. The 3D pane
has no orbit reset. A body's parts cannot be edited.

**Only you can decide:**
1. Is the wide arrangement right in Side by side, where at 3840 it is a strip
   across the middle third, or does Side by side need its own portrait
   arrangement?
2. Is the map ready for Classic to retire?
3. Is the blade root bore a cylinder fit? The model calls it `contact`, so
   every surface draws it as a flat seat (S9). And should the hub's fastener
   pattern be all ten holes? Your bind holds one hole (744/743). The mount
   side, taken here, holds all ten.

Shots: `shots/the_walk_reads_the_map_and_the_binding_flow_on_the_merged_page/`,
read with vision before each row was written. Issues: W =
`ISSUE_20261116_shrinking_the_window_with_the_pane_open_leaves_the_map_region_zero_wide`,
S = `ISSUE_20261116_small_findings_of_the_map_and_binding_flow_walk` (row
number). The open 11-14 issues are cited by name.

## Jeff, 11-15

| # | Jeff's sentence (short) | What the page does now | Shot | Verdict |
|---|---|---|---|---|
| — | Large batch finished, what are next steps? | Answered by the three lines above (not counted) | — | — |
| J1 | The hub blade root bore was bound to the wrong blade bore; I unbound it and selected the blade's seat | Your log carries it: hub unbind (seq 80), blade seat 4033/4034 (81), hub 2356/2358 (82). The tree reads "bound · 2 faces of 214373-002" | `08_hub_bore_joint_open_tree`, `09_hub_bore_side_selected` | does it |
| J2 | Hoped the hub would then recommend cylinders coaxial with the blade's seat; it didn't | With the hub side unbound, the list is 2356 and 2358 first, each "coaxial with blade bonded assembly, Ø82.55 vs Ø82.51" with Take, then six more. One Take wrote both halves (2356 + 2358) | `10b_hub_bore_unbound_tree_crop`, `12_took_2356_tree` | does it |
| J3 | Is another pass at the selection/suggestion filtering still due? | Mate ranking and patterns have landed (J2, J6, J7). What is left is small: S3, S4, S6 | `13_mount_base_face_both_sides_open`, `16_take_pattern_hole_offers_bar` | partly |
| J4 | "Suggested, high" under the mount base face, but only a Pick a face button | The line now has Take and its evidence ("against propeller hub, 0.050 mm apart"). "face 134" is only in the tooltip (S3), and clicking the line turns the view edge-on to the face (S4) | `13_mount_base_face_both_sides_open`, `14b_mount_suggestion_3d_crop` | partly |
| — | Overall much improved; stopped there to try the features | Report (not counted) | — | — |
| J5 | The hole pattern allowed only one surface (half a cylinder); multi-select is on the todo list | Every bound feature has **Add a face**, and Shift-click grows a set. A Take of one half of a split bore takes both halves. Your hub pattern still holds the one hole you bound (744/743) | `12_took_2356_tree`, `15_fastener_pattern_both_sides` | does it |
| J6 | Pre-select all cylinders equal in size on (nearly) one plane | Take on a pattern hole raises "10 like holes on one plane · Take all 10 holes · Just this one". Taking all wrote 20 faces, "10 holes Ø5.8 on a Ø240 circle" | `16_take_pattern_hole_offers_bar`, `17_took_all_10_holes` | does it |
| J7 | The new DAG layout (subway map): coming soon? The DAG still looks old | The region opens on the map ("Map · Classic" in its corner), in Side by side and DAG view | `00_landing_3840`, `03_dag_view_3840` | does it |
| J8 | Only the pitch link and the tangential link are expandable in the grid | Those are v2's only two assemblies. ▸ folds each one to one row | `20_collapse_assemblies_grid_and_map` | does it |
| J9 | Nothing happens when I expand them | The three bearings have no features and no dimensions, so folded and open show the same row. The map draws them as empty boxes inside the links' outlines. Their rows arrive with the first tolerance study | `20_collapse_assemblies_grid_and_map`, `01_map_hub_mount_detail` | partly |

## The 11-12 review's open rows, re-read

| # | Jeff's sentence (short) | What the page does now | Shot | Verdict |
|---|---|---|---|---|
| 1/28 | Part groupings look right; the hub is in two groups | The hub is one row in `ground`, one box on the map, one block in Classic | `00_landing_3840`, `19_classic_dag_side_by_side` | does it |
| 2 | Assemblies collapsible, part number indented | Folds work. v2's bearings have no rows, so no indent ever shows | `20_collapse_assemblies_grid_and_map` | partly |
| 3 | A collapsed row shows the children's total | "1 dimension". v2 has no values to total (`ISSUE_20261114_design_a_folded_assembly_row…`) | `20_collapse_assemblies_grid_and_map` | partly |
| 4 | DAG groups expandable (+ on the group) | The map draws the assembly outline but has no fold. Collapse assemblies leaves the map unchanged (`ISSUE_20261116_what_the_map_does_not_draw_yet`) | `20_collapse_assemblies_grid_and_map` | does not |
| 5 | View shortcuts: collapsed vs expanded | "Collapse assemblies" / "Expand all" change the grid only | `20_collapse_assemblies_grid_and_map` | partly |
| 13 | A selected part's bound faces show harder; the same for bodies | Body: the tangential link's two bearing ends are brighter than its arm. Part: the hub's wash fills the view from inside, so the faces cannot be told apart | `23b_select_body_tan_link_3d_crop`, `21b_hub_selected_3d_crop` | partly |
| 15 | Drawing links in the Preview for each part | A dimension's and an interface's Preview link 214373-003. A part, hovered or selected, still shows the empty Preview | `22_hover_hub_part_preview`, `09_hub_bore_side_selected` | partly |
| 20 | Bound faces permanently green | Still green at rest in every 3D shot. The hide box is still in the folded top bar | `02_side_by_side_3840` | partly |
| 21 | Binds keep getting wiped | Here an unbind, a Take and a Take all each wrote one event and survived later clicks. 8000 still serves `master` | `12_took_2356_tree`, `17_took_all_10_holes` | partly |
| 26 | View-settings bar above the grid | It is there. At 3840 Side by side, "View" still wraps onto a second line | `02_side_by_side_3840` | partly |
| 34 | Filters bound / unbound / all, unbound first | "All · Unbound" on Rigid bodies: the hub and the link body drop out. There is no Bound option, no unbound-first order, joints are not filtered, and the counts do not change (S8) | `18_filter_unbound_tree` | partly |
| 38 | Each side opens to its face and the suggestions | Unbound sides list ranked faces with Take; bound sides list their faces with Remove | `10b_hub_bore_unbound_tree_crop`, `13_mount_base_face_both_sides_open` | does it |
| 40 | Add or remove parts in a body | Only show/hide-in-3D checkboxes (`ISSUE_20261114_three_tree_requests…`) | `18_filter_unbound_tree` | does not |
| 41 | The Stacks section is vestigial | The section is gone; both spindle stacks are still options in the model dropdown | `00_landing_3840` | partly |
| 47 | Inconsistent hyphens | "tangential-link bearing" and "pitch-link spherical bearing" remain, on the map too | `01_map_hub_mount_detail`, `01b_map_lower_detail` | partly |
| 48 | 3D navigation gets stuck; need an orbit-point reset | No reset control or key in the pane (`ISSUE_20261114_the_3d_pane_has_no_way…`) | `14b_mount_suggestion_3d_crop` | does not |

## The map against the reference

| # | Element | What the page draws | Shot | Verdict |
|---|---|---|---|---|
| M1 | Districts (bodies) | Five dashed, lightly filled districts, each named in its body colour | `03_dag_view_3840` | does it |
| M2 | Part outlines (and assembly outlines) | A box round every part. A dotted outline round each assembly and its bearings | `01_map_hub_mount_detail` | does it |
| M3 | Pins on the perimeter | One dot per interface end, on the side facing its counterpart. Labels show when lit | `01_map_hub_mount_detail`, `20_collapse_assemblies_grid_and_map` | does it |
| M4 | Jumpers inside a part | Drawn between the pins they measure, but they cross the part names (S1) | `01b_map_lower_detail` | partly |
| M5 | Planar (capacitor) | ‖ on every contact seat, turned on vertical routes | `01_map_hub_mount_detail` | does it |
| M6 | Boss in hole (circle and dot) | ⊙ on the pilot and the pitch plate ↔ piston | `01_map_hub_mount_detail`, `01b_map_lower_detail` | does it |
| M7 | Spherical (cup and ball) | Four cup-and-ball marks, one per bearing joint | `01_map_hub_mount_detail` | does it |
| M8 | Fastener pattern (ring of dots) | Ring of dots on the hub ↔ mount clocking | `01_map_hub_mount_detail` | does it |
| M9 | Cylindrical slide | The slide mark on the 45° route between the gas-spring mount and the piston body | `03_dag_view_3840` | does it |
| M10 | Clearance at the stops | The I-beam on cover ↔ upper head | `03_dag_view_3840` | does it |
| M11 | Bundles | Hub ↔ mount: three parallel routes, three symbols | `01_map_hub_mount_detail` | does it |
| M12 | Routing on 0° / 45° / 90° | Every route seen runs at one of the three angles; between-body symbols sit in the gaps | `03_dag_view_3840`, `04_dag_view_5120` | does it |

## Region sizes (Map selected)

| # | Window · view | Region | Reads? | Shot | Verdict |
|---|---|---|---|---|---|
| R1 | 3840 · Side by side | 1201 × 2160 | Names and symbols read on a 4K panel, but small: a strip across the middle third, with the top and bottom empty | `02_side_by_side_3840` | partly |
| R2 | 3840 · DAG view | 2390 × 2160 | Yes, the reference size | `03_dag_view_3840` | does it |
| R3 | 5120 · Side by side | 2481 × 2160 here (the pane kept 1190 px from 3840) | Yes | `05_side_by_side_5120` | does it |
| R4 | 5120 · DAG view | 3670 × 2160 | Yes, generous | `04_dag_view_5120` | does it |
| R5 | 1920 · Side by side | 485 × 1080 on a fresh load: a thumbnail, names illegible. **0 px** after a live shrink from 5120 (W) | `06b_side_by_side_1920_reloaded`, `06_side_by_side_1920` | does not |
| R6 | 1920 · DAG view | 958 × 1080 | Borderline: names read when looked for, symbols are small | `07_dag_view_1920` | partly |
