---
type: bug
priority: low
status: open
area: viewer
reporter: agent
found_by: docs/sessions/HANDOFF_20261119_the_walk_reads_the_links_and_the_pitch_plate_stack_on_the_merged_page.md
---

# Small findings of the links and pitch plate stack walk

Found on integration `8082bad0`, v2, served from a scratch root. Shots are in
`docs/sessions/lessons/shots/the_walk_reads_the_links_and_the_pitch_plate_stack_on_the_merged_page/`.
None blocks the end-stop study. Each is small enough for one tactical pass.

- **F1. Two sweep placement rows do not name their part.** The 3D pane's
  "22 of 24 parts placed" disclosure lists, for the two parts it draws as stick
  figures, only the body and "its 2 recorded positions do not say which one
  belongs to its body — stick figure only". They are the inner races at the
  plate and at the pitch arm (the races declare no occurrence on purpose; link
  4's lesson, "3D"). Every other row names its occurrence. Fix: lead each row
  with the part's label. Shot `31_sweep_playing.png`.
- **F2. At 1536 wide, Side by side gives the map a 274-px strip.** Fitted
  there, no box text can be read (`05b_map_1536_side_by_side_map_crop.png`).
  The DAG view at 1536 is still too small to read at fit (`06_map_1536_dag_view.png`),
  and wheel-zooming works (`07_…`, `08_…`, `09_…`). A design question, not a
  break: should Side by side at this width start with the map wider, or open
  zoomed onto the selection?
- **F3. Each link's length draws as a long rectangular lane that reads as
  another outline.** `tan_link_length` runs down from the plate-end race,
  under the link's boxes and up into the mount-end race. `pitch_link_length`
  runs up the pitch link column's left side. With Parts off they are the only
  rectangles left on the map (`13_map_parts_off.png`, `15_map_all_off.png`).
  Consider drawing an assembly dimension's lane in the outline's dotted style,
  or naming it at its middle.
- **F4. A click on a box's middle selects the dimension crossing it, not the
  part.** On the race `MS14101-3 inner race, pitch plate end`, a click at the
  box's centre selected `bore to ball centre`. A click on the box's name
  selected the part (`20b_select_race_part.png`). `apps/viewer/map.css` says
  "The whole box is the part's control". Inside a box, the jumpers win.
- **F5. A selected part or assembly leaves the Preview empty.** Selecting the
  race, the NAS6403U11D bolt or the 215177 outline lights the map, the tree
  and the grid, and the Preview shows its heading and nothing else
  (`20b_…`, `22_select_215177_outline.png`). A dimension or interface fills
  it. If a part's Preview is meant to be empty, nothing is wrong. If not, the
  part's number, name, drawing chip and bound-feature count would be the
  obvious content.

Seen again, not refiled:

- With 215177 selected, the plate's pin labels pile into one cluster at its
  top (`22_…`): `ISSUE_20261119_a_lit_map_pin_label_can_land_on_a_part_number_or_a_symbol.md`.
- "213862-002 pitch link" is crossed by a route: `ISSUE_20261120_an_outlines_name_crossed_by_a_route_raises_no_map_note.md`.
- Each race is listed twice in the tree: `ISSUE_20261120_an_assembly_in_no_body_is_listed_twice_in_the_nav_and_posed_by_nothing_in_3d.md`.
- A folded two-body assembly sits in one body's bracket (`18b_…`): `ISSUE_20261120_a_folded_assembly_in_two_bodies_sits_in_one_bodys_bracket_and_a_sub_assemblys_name_is_on_hover_only.md`.
- The Groups popover shows Bodies and Assemblies both ticked while the grid
  draws one outermost: `ISSUE_20261120_design_groups_popover_shows_bodies_and_assemblies_ticked_while_the_grid_draws_one.md`.
