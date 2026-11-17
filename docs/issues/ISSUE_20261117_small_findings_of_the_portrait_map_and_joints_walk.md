---
type: bug
priority: low
status: open
area: viewer/map
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261117_the_walk_reads_the_portrait_map_and_the_joints_on_the_merged_page.md
---

# Small findings of the portrait map and joints walk (2026-11-17)

Found walking `integration` at `b9475a88` at 3840 × 2160, Side by side, on the
v2 model ("Propeller Pitch System"). The review page is
`docs/sessions/lessons/REVIEW_20261117_the_portrait_map_and_the_joints.md`, and
the shots are in
`docs/sessions/lessons/shots/the_walk_reads_the_portrait_map_and_the_joints_on_the_merged_page/`.

| # | What | Repro | Shot |
|---|---|---|---|
| F1 | **A bundle's lit pin labels overlap.** Select the propeller hub (a click on its box on the map). The three pins at the hub's top and at the tangential link mount's bottom all light, and their labels sit on one line, drawn over each other: "tangtangential link mou…locating bossttern". The portrait handoff dropped a right flank's label below a level left-flank pin, but three top or bottom pins a route-pitch apart have no such rule. The same will happen on every three-constraint bundle (five of them in v2). A related case: a lit label is drawn over its own part's jumper lines. On the piston cover, "end stop shoulder" has the cover's three jumpers running through it. | Map, click inside the hub's box. Map, hover the cover ↔ upper head clearance | `r_13_hub_part_selected.png` (the labels just below 215175-002 and just above 214373-002), `j16_piston_cover_214958_002__piston_head_upper_214698_002.png` |
| F2 | **A joint's Preview carries history, a handoff slug and a raw field word.** Click hub ↔ blade on the map. The Preview's chips read `mating_surface · rotary · 3 edge(s) · BRANCH POINT`, and its always-visible note reads "Was named "hub blade-1 root bearing bore" until 2026-11-10 … (handoff a_joint_says_what_kind_it_is) it states `interface: revolute` …". v2's new joints read "New in v2 (2026-11-17, handoff the_blade_and_piston_joints_are_authored_as_what_the_parts_show) …". That breaks the prose budget's "no history" rule and the "no internal names" rule. The note is the node's `note` field printed whole, and the chip is the node kind's stored spelling. | Map, click the rotary symbol's route between hub and blade | `k6_rotary_joint_selected_3840.png` (Preview, lower right) |
| F3 | **At 3840 Side by side the map is now width-bound.** It fits at 0.897, against 0.925 in the other three 3840/5120 regions and the 0.933 the portrait handoff measured. The upper head's two detour lanes (`ISSUE_20261117_design_a_map_detour_lane_runs_outside_its_bodys_district`) widened the drawing after that measurement, so the target view lost about 4% of its size. Labels still measure 15 px. Low. It goes away if that issue moves the lane inside the district. | Measure `#topopane svg.tv__map`'s `data-zoom` at 3840 × 2160 with the pane open | `region_3840x2160_both.png` |

None of these is a one-line fix, so none was fixed in the walk.

## Addendum 2026-11-17 (review)

F2 is split out at `med`, `area: design`, as
`ISSUE_20261117_design_a_joints_preview_prints_a_handoff_name_and_a_raw_kind_word.md`:
it breaks two named rules (no history, no internal names on the surface), so
it should not wait behind F1/F3's `low`. F1 and F3 stay here.
