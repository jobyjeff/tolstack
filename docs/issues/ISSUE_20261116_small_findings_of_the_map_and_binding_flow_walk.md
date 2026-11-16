---
type: bug
priority: low
status: deferred
defer_until: 2026-12-16
class: walk_small_findings
resolution: deferred 2026-11-16 triage -- low defers by default; 30-day date
area: viewer
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261115_the_walk_reads_the_map_and_the_binding_flow_on_the_merged_page.md
---

# Small findings of the 2026-11-16 walk (the map and the binding flow)

The walk served `integration` `61f78e19` on drawing-checker's mount shape and
wrote only to a scratch copy of the log. The review page is
`docs/sessions/lessons/REVIEW_20261115_the_map_and_the_binding_flow.md`.
Shots are in `docs/sessions/lessons/shots/the_walk_reads_the_map_and_the_binding_flow_on_the_merged_page/`.
The rows are numbered as that page cites them (S1–S9).

| # | Finding | Shot |
|---|---|---|
| S1 | **Jumpers strike through part names on the map.** A jumper inside a box runs straight from pin to pin across the name. You can see it on 214700-002 "gas-spring piston body", both piston heads, and 212956-005 "pitch anti-rotation link", where the vertical through-route cuts "anti-rotation". | `01b_map_lower_detail.png`, `01_map_hub_mount_detail.png` |
| S2 | **Clicking inside a box on the map does nothing.** `.map__boxhit` and `.map__districthit` are `pointer-events: stroke` (`apps/viewer/map.css:33`), so only the border and the name select a part. A click on the box's empty middle fell through to the SVG (hub, at 1855,922). Clicking the name selected the hub on all four surfaces. | `21_map_click_inside_hub_box_selects_nothing.png`, `21_map_click_hub_name_selects_everywhere.png` |
| S3 | **A contact suggestion names its face only in the tooltip.** The mount's base face reads "suggested · high / against propeller hub, 0.050 mm apart / Take". "face 134" appears only in the hover title. A ranked mate's line starts "face 2356 · round · r 41.2750 mm", so the same list uses two styles. | `13_mount_base_face_both_sides_open.png` |
| S4 | **Clicking a planar suggestion turns the view edge-on to it.** The mount's base-face line turned the camera to look along the face's plane. The hub's bound face 526 shows as a green band, and face 134 cannot be seen. | `14_mount_suggestion_clicked_view_turns.png`, `14b_mount_suggestion_3d_crop.png` |
| S5 | **The bind toast names one face for a set.** "Bound blade 1 root bearing bore to face 2356 of 214373-002 propeller hub" was a 2-face write (2356 + 2358). "Bound tangential link mount fastener pattern to face 207 of 215175-001 …" was a 20-face write. The 11-14 walk's S4 (part number) still stands as well: the toast says 215175-001 and the tree says 215175-002. | `14_…`, `17_took_all_10_holes.png` |
| S6 | **The pattern offer bar sits over the toast, far from the Take that raised it.** "10 like holes on one plane · Take all 10 holes · Just this one" opens in the pane's head, on top of the previous toast's text. The Take that was clicked is in the tree, about 1000 px below. | `16_take_pattern_hole_offers_bar.png` |
| S7 | **A 10-hole set is listed as 20 face rows, each with its own Remove.** The summary line "10 holes Ø5.8 on a Ø240 circle" is already there. Folding the faces per hole, or behind the summary, would keep the feature short. | `17_took_all_10_holes.png` |
| S8 | **The Unbound filter leaves the body counts unchanged.** With Unbound on, "ground · 4 parts" lists three parts (the hub drops out). | `18_filter_unbound_tree.png` |
| S9 | **The blade root bore is drawn with the planar symbol.** v2 gives `hub_blade1_root_bearing_bore` the kind `contact`, so the map, the tree ("contact") and Classic all draw a bore as a flat seat. Both sides are bound to cylinders. This is a question about the model's word, not a drawing defect; see the review page's third question. | `01_map_hub_mount_detail.png`, `08_hub_bore_joint_open_tree.png` |

Already filed and not refiled: the settings bar still wraps "View" at 3840
Side by side (`ISSUE_20261114_small_findings_of_the_merged_page_walk.md`
row 7). Jeff's surface on 8000 still serves `master`, which is 67 commits
behind `integration` (`map.js` returns 404 there): same issue, row 10.
