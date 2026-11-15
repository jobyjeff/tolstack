---
type: bug
priority: low
status: open
area: viewer
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261112_the_walk_reads_the_merged_page_against_jeffs_november_notes.md
---

# Small findings of the merged-page walk (2026-11-14)

The `partly` rows and walk findings that are each a small defect. Where a
decision is needed it is the separate strategy issue
(`ISSUE_20261114_three_tree_requests_from_jeffs_november_9_note_have_no_design.md`).
Setup: merged `integration` (`273177f2`), projections rebuilt from it into a
scratch root, v2, 3840×2160 unless noted. Shots are in
`docs/sessions/lessons/shots/the_merged_page_20261112/`.

| # | Finding | Shot | Owner handoff |
|---|---|---|---|
| 1 | **Hyphens still differ.** "locating boss" is fixed. The tree still nests "tangential-link bearing, narrow end / wide end" under "tangential link", and "gas-spring mount" sits beside "tangential link mount". | `15_select_body_tan_link.png` | none (Jeff 11-09) |
| 2 | **A part or assembly has no Preview of its own, so its drawing link is reachable only through a dimension.** Clicking a grid row shows "a dimension of 214373-002 propeller hub · 214373-003 (different dash number) rev A". The link resolves on 8000 (HTTP 200). Clicking a part's name in the DAG cleared the Preview, and selecting a part in the tree leaves it unchanged. | `05_preview_hub_part.png`, `06_preview_mount_part_from_dag.png` | `a_part_links_to_its_drawing_before_it_has_a_tolerance` |
| 3 | **Bound faces are green at rest.** Every 3D shot shows them. The "Bound faces" box (`app.js`, `boundFaces`) is in the pane's folded top bar and is on by default. This walk never found it, and Jeff named this exact look. | `10_pane_loaded_rest_3840.png` | `a_binding_shows_the_moment_it_is_made_and_is_corrected_where_it_is_shown` |
| 4 | **The bind toast names another part number than the tree.** Toast: "Bound pilot bore to face 259 of 215175-001 tangential link mount assembly, propeller". Tree: "bound · face 259 of 215175-002". The toast takes the mesh's name and the tree takes the model's. | `19_bound_shown_in_tree_and_scene.png` | `a_feature_is_bound_once_to_a_set_of_faces` |
| 5 | **A write takes about 8 s to show.** `__lastServedLogMs` read 8028 ms for the bind and 7568 ms for the unbind. This was through the probe's HTTP-backed folder handle; a real handle was not measured. The tree read "bound" only after that. Already filed as `ISSUE_20261112_bindings_json_waits_for_a_full_rebuild_and_the_mount_has_no_narrow_refold.md`, listed here for the count. | `19_bound_shown_in_tree_and_scene.png` | `a_binding_shows_…` |
| 6 | **Selecting a body: its bound faces were not visibly harder than the body.** For a part they are (the hub's two faces turn yellow over orange, `14_select_hub_part_3d.png`). For the tangential-link body the bound bearing centres were not distinguishable at the rest zoom. Not proven a defect; check at a closer zoom. | `15_select_body_tan_link.png` | `hover_and_select_light_the_same_things_on_all_four_surfaces_and_nothing_goes_opaque` |
| 7 | **The settings bar wraps.** With the 3D pane open at 3840, "View" falls onto a line of its own under the bar. | `03_pane_open_3840.png` | `the_page_is_a_fixed_layout_and_nothing_scrolls_the_document` |
| 8 | **The 3D rest view crops the assembly.** On first load at 3840 the hub's lower half runs off the bottom of the pane. Arming a pick or binding also moves the camera, and Cancel/the write does not always put it back. | `10_pane_loaded_rest_3840.png`, `18_bound_pilot_bore.png` | none |
| 10 | **Jeff's page cannot show any of this yet.** 8000 serves the main checkout, which is on `master` (121 commits behind `integration` on 11-14), and its projections were built 11-11. Every row the review page marks `does it` reaches Jeff's surface only at the batch merge, followed by a projection rebuild. That includes the log-backed binds Jeff asked about ("they seem to keep getting wiped"). Operator: batch-merge, then run `scripts/rebuild_projections.ps1` in the main checkout. Nothing else is needed. | `22_after_reload_corrected_hub_face.png` | batch merge (operator) |
| 9 | **A feature's suggested faces were not met.** Jeff asked for each feature to list "the suggested surfaces … as well as the currently selected surface". The features walked showed their state line and Correct/Unbind, and one "2 like faces on this surface — Take all 2 / Just this one" offer. None of them showed a suggestion list, so this row stays unproven. | `16_pick_armed_pilot_bore.png`, `18_bound_pilot_bore.png` | `a_feature_is_bound_once_to_a_set_of_faces` |
