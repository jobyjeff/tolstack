# The merged page, read against Jeff's notes of 11-09 and 11-12

> **Where this ran:** 8000 serves the main checkout, which is on `master`. The
> 11-12 chain is not there until the batch merge, so 8000 could not show the
> merged page. This walk served `integration` (`273177f2`) on drawing-checker's
> mount shape: `tests/debug_walk_merged_page_20261114.mjs`, data rebuilt from
> this tree into a scratch root, binds to a scratch copy of the log, and drawing
> links proxied to 8000. It could not show what Jeff's own browser has stored,
> or how fast a write is through a real folder grant.

**48 sentences: 31 does it · 11 partly · 6 does not.**
**Most worth your time:** binding a face now works end to end: bind, Correct and Unbind all show in the tree and survive a reload (rows 16–17). Hover and select light all four regions and nothing goes opaque (6–12). Assemblies fold in the grid, and the 3D/DAG switch works (2, 5, 14).
**Most broken:** the hub is still two groups in the grid and two blocks in the DAG on the new model (rows 1, 20).

Shots: `shots/the_merged_page_20261112/`. Issues: H = `ISSUE_20261114_the_hub_is_two_groups…`, O = `…_the_3d_pane_has_no_way_to_reset_its_orbit_point`, T = `…_three_tree_requests_from_jeffs_november_9_note…` (strategy), S = `…_small_findings_of_the_merged_page_walk` (row number), and on integration N = `…_the_dag_draws_no_nested_outline…`, F = `…_design_a_folded_assembly_row_prints_a_signed_sum…`.

| # | Jeff's sentence (short) | What the page does now | Shot | Verdict |
|---|---|---|---|---|
| **11-12** | | | | |
| 1 | Part groupings in the grid look correct now | Hub 214373-002 is two brackets in `ground` and two DAG blocks (H) | `01_grid_landing_v2`, `02b_hover_hub_dag` | does not |
| 2 | Assemblies collapsible in the grid, part number indented | ▸ on 212956-005 and 213862-002 folds each to one row. v2's bearings have no rows, so no indent ever shows | `07_collapse_assemblies_grid` | partly |
| 3 | Collapsed row shows the children's total | The folded row reads "1 dimension". v2 has no values to total (F) | `07_collapse_assemblies_grid` | partly |
| 4 | DAG groups expandable (+ on the group) | No control on the DAG. Collapse assemblies leaves it unchanged (N) | `07b_collapse_assemblies_dag` | does not |
| 5 | View shortcuts: collapsed vs expanded | "Collapse assemblies" / "Expand all" in the settings bar; grid only (N) | `07_collapse_assemblies_grid` | partly |
| 6 | Nothing turns a body fully opaque | Hovered and selected parts stay see-through | `11_hover_mount_tree_3d`, `14_select_hub_part_3d` | does it |
| 7 | Full-part glow on hovering a part in the tree | The mount takes a pale wash and the rest dims | `11_hover_mount_tree_3d` | does it |
| 8 | Hovering a part lights random grid rows; use two strengths | Own rows get a solid bracket, the touching row a dashed one, nothing else | `02c_hover_hub_grid` | does it |
| 9 | Hovering a bound interface makes the part opaque | Only the face lights; the hub stays see-through, the others dim | `12_hover_bound_feature_tree_3d` | does it |
| 10 | Feature in Parts lights its twin in Interfaces, which opens itself | Selecting the mount's pilot bore opened "locating boss in pilot bore" and lit that side | `13_select_pilot_bore_from_parts` | does it |
| 11 | All four regions light together on hover and select | Tree, DAG, grid and 3D all lit. A lit curved bar filled black in the DAG, fixed here (`208d3c89`) | `02b_hover_hub_dag`, `12b_hover_bound_feature_dag_blob`, `12c_probe_fill_none_dag` | does it |
| 12 | Selecting a group lights its children | The tangential link body: link, bearings, features, DAG field, grid row and 3D all lit | `15_select_body_tan_link` | does it |
| 13 | A selected part's bound faces show harder; same for bodies | Hub: its two faces turn yellow over orange. Body: no harder face seen at rest zoom (S6) | `14_select_hub_part_3d`, `14b_select_hub_part_grid`, `15_select_body_tan_link` | partly |
| 14 | 2D and 3D either/or, or tabs | "Side by side · 3D · DAG" in the settings bar, all three work | `23_view_3d_only`, `24_view_dag_only` | does it |
| 15 | Drawing links in the Preview for each part/assembly, before any tolerance | A dimension's Preview links 214373-003 (dash flagged), 200 on 8000. A part has no Preview of its own (S2) | `05_preview_hub_part`, `06_preview_mount_part_from_dag` | partly |
| 16 | Bound a face; its row opens to nothing | The row shows "bound · face 259 of 215175-002" with Correct and Unbind, after ~8 s (S5) | `19_bound_shown_in_tree_and_scene` | does it |
| 17 | No way to correct a mistake | Correct moved the hub base face to face 310, Unbind took the pilot bore back; both held after a reload | `21_correct_armed_hover`, `22_after_reload_corrected_hub_face` | does it |
| 18 | Base face shows in both the hub and the mount; the mount should show only its own side | Two rows: hub side bound (green dot), mount side open | `13_select_pilot_bore_from_parts` | does it |
| 19 | Parent row empty; hovering shows the hub face in both places | Hovering the hub's feature lit only the hub's face | `12_hover_bound_feature_tree_3d` | does it |
| 20 | Bound faces permanently green | Green at rest in every 3D shot. The hide box is in the pane's folded top bar and on by default (S3) | `10_pane_loaded_rest_3840` | partly |
| 21 | Binds keep getting wiped on code updates | Here a bind, correction and unbind survived reload, read from the log. 8000 still serves `master` (S10) | `22_after_reload_corrected_hub_face` | partly |
| **11-09** | | | | |
| 22 | Preview below the grid, DAG full height, grid and Preview stacked on the right | As described, at 3840 and at 5120 | `00_landing_bare_3840`, `08_layout_5120_pane_open` | does it |
| 23 | Grid fits with no sideways scroll | 1148 px wide, scroller 1148/1148 at 3840 | `01_grid_landing_v2` | does it |
| 24 | Preview fits across, may scroll down | Fits across | `05_preview_hub_part` | does it |
| 25 | Title above the tree; 3D and DAG start at the top | As described | `10_pane_loaded_rest_3840` | does it |
| 26 | View-settings bar above the grid | It is there, but with the pane open "View" wraps onto a second line (S7) | `03_pane_open_3840` | partly |
| 27 | Contribution too wide; columns narrow or resizable | Contribution 172 px; every column has a grip | `01_grid_landing_v2` | does it |
| 28 | Hub in two groups in one body | Still so (H, row 1) | `01_grid_landing_v2` | does not |
| 29 | A dropdown at the top to pick the model | It is there | `00_landing_bare_3840` | does it |
| 30 | Rename to Propeller Pitch System / (legacy) | Done | `00_landing_bare_3840` | does it |
| 31 | With one model chosen the other is gone | Done; switching swaps the whole tree | `32_legacy_model_switched` | does it |
| 32 | "All 30 interfaces…" → "Interfaces", collapsible | Each body has a folding INTERFACES group; the old wording is gone | `00_landing_bare_3840` | does it |
| 33 | Stuck in binding mode; need a collapsible bar and an × | The pane head has ▾, Sweep ▶ and Help; the write banner has ×; ▶ brings back the play bar | `19_bound_shown_in_tree_and_scene`, `29_sweep_playing_a` | does it |
| 34 | Filters bound/unbound/all, unbound first | None (T) | `13_select_pilot_bore_from_parts` | does not |
| 35 | One status mark, not circles and triangles | One dot per row in the tree | `13_select_pilot_bore_from_parts` | does it |
| 36 | An interface opens to its two sides | Each side is its own row, e.g. "214373-002 propeller hub · locating boss" | `13_select_pilot_bore_from_parts` | does it |
| 37 | Drop "axis" | No "axis" in the tree | `13_select_pilot_bore_from_parts` | does it |
| 38 | Each side opens to the selected face and the suggestions | Shows the face, Correct/Unbind and a "Take all 2 / Just this one" offer; no suggestion list met (S9) | `18_bound_pilot_bore`, `19_bound_shown_in_tree_and_scene` | partly |
| 39 | Rigid bodies on top, then Parts and Interfaces | As described | `00_landing_bare_3840` | does it |
| 40 | Add or remove parts in a body; list the parts not included | No such control (T) | `00_landing_bare_3840` | does not |
| 41 | The Stacks section is vestigial; hide it | The section is gone, but both stacks are options in the model dropdown (T) | `00_landing_bare_3840` | partly |
| 42 | Stray "Component (propeller-system)" line | Gone | `00_landing_bare_3840` | does it |
| 43 | The "Kinematic model" button | Gone; the studies sit under STUDIES ("Play the newest sweep") | `10_pane_loaded_rest_3840` | does it |
| 44 | The two models' menus behave differently | Same tree shape on both: bodies → parts / interfaces, then joints | `32_legacy_model_switched` | does it |
| 45 | A part listed in a body does not move with it | Playing the sweep moved the plate, piston, heads and links together; "15 of 15 parts placed" | `29_sweep_playing_a`, `30_sweep_playing_b` | does it |
| 46 | Pre-select glow on hover during a pick is broken | A yellow wash on the face under the pointer | `17_preselect_glow_hover_face` | does it |
| 47 | Inconsistent hyphens | "locating boss" fixed; "tangential-link bearing" and "gas-spring" remain (S1) | `15_select_body_tan_link` | partly |
| 48 | 3D navigation gets stuck; need an orbit-point reset | Six wheel notches put the camera inside a part; middle-click is read as a face click; no reset (O) | `25_nav_after_wheel_in`, `27_nav_after_middle_click` | does not |
