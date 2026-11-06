# BRIEF 2026-10-30 — topology_layout_questions_the_redesign_left_open: six DAG/grid layout questions that outlived the brief that held them

> **PARTIALLY CONSUMED 2026-11-05 — Q5 and Q7 routed, Q1 and Q3 answered-in-work, Q8 stays open.** Q5 (part runs repeat) is dissolved by `docs/sessions/HANDOFF_20261105_a_part_with_many_interfaces_is_drawn_as_a_component_with_pins.md` (Jeff, note 20261105T164140_sm8hkc: a multi-interface part is one block with pins on its perimeter), whose lesson must also answer Q1 (whole-walk crossings) and Q3 (the travel sub-stack across four bodies) for the new layout or say which stays open; Q7 (the 59 px slit at 1600 wide) → `docs/sessions/HANDOFF_20261105_the_grid_fits_the_screen_and_its_brackets_say_what_nests_in_what.md`. Q8 (the spindle joint's fan from the origin at the as-modelled frame) is still this brief's. Earlier: Q2 consumed 2026-11-04 by `docs/sessions/HANDOFF_20261103_the_joint_is_the_node_and_an_edge_says_only_lit_or_unlit.md` (Jeff picked mock-up C): a body is one container, its fields bridged and named once, its folded pills one group. Earlier, 2026-11-03: Q4 (lit set's seam leaders out of view at rest): the landing/pinning fixes in `docs/sessions/HANDOFF_20261103_the_dag_holds_still_and_the_filter_bar_stays_put.md` re-measure the rest state with the scene open; Q6 (grid cross-fades instead of moving rows): sized in the lesson of `docs/sessions/HANDOFF_20261103_the_kinematic_grid_is_a_stack_of_sub_stacks.md`, whose chain-ordered rows make a moving-row transition the natural follow-up; Q1 (whole-walk crossings), Q3 (travel sub-stack across four bodies), Q5 (part runs repeat) are still this brief's.

> Routing note: filed by the 2026-10-30 triage sweep. `BRIEF_20260914_dag_layout_geometry_tradeoffs`
> was closed on 2026-10-29 with items 1, 3 and 4 routed to landed handoffs; a
> re-check of its source issues against master found six whose question no
> handoff answered. They are gathered here so they stay in front of a strategy
> session rather than sitting deferred one by one. The one `high` among them
> (leaders crossing each other) was staged as a handoff, not carried here.

## Why a brief

Each is a layout-policy choice on the topology / kinematic pages — what the
DAG and grid give up to show something else — and each was filed
`audience: strategy` with options. None is a code defect with one obvious fix.
Re-verified against tolstack master on 2026-10-30 (the evidence clause per
issue is the verifier's).

## The questions

1. **The whole walk crosses itself** —
   `docs/issues/ISSUE_20261026_the_product_graph_is_past_the_exact_column_search_and_crosses_itself.md`.
   The compact band cures the selected-study case, but the whole walk is still
   `shortest_first` and crosses itself. Decide whether whole-walk crossings
   are worth a heuristic column order (the old brief's item 2, never routed).
2. **A body with parts in two components draws as two containers** —
   `ISSUE_20261027_a_body_with_parts_in_two_components_is_two_containers.md`.
   `layout.bodies` still has one span per block; collapsing `base` gives two
   pills (`body:base`, `body:base#2`), pinned in tests. Decide whether a body
   is one container that spans, or two that say they are one.
3. **The travel sub-stack crosses four bodies, so it cannot fold into one bar** —
   `ISSUE_20261027_the_travel_sub_stack_crosses_four_bodies_so_it_cannot_fold_into_one_bar_inside_one.md`.
   Still four dashed fields with a display-only fold; none of the issue's
   options was chosen.
4. **On the kinematic page most of the lit set's leaders across the seam are
   out of view at rest** —
   `ISSUE_20261027_on_the_kinematic_page_most_of_the_lit_sets_leaders_across_the_seam_are_out_of_view_at_rest.md`.
   The compact band makes the lit set contiguous, but the centring margin
   drops when the scene opens and nobody has re-measured with the scene open.
   Partly a measurement: re-measure first, then decide.
5. **The leader grid repeats a part's runs** —
   `ISSUE_20260910_leader_grid_part_runs_repeat.md` (low). `VA.gridPlan` still
   makes one merged cell per run with nothing tying a part's split runs together.
6. **The grid cross-fades through a respine instead of moving its rows** —
   `ISSUE_20260915_the_grid_cross_fades_through_a_respine_instead_of_moving_its_rows.md`
   (low). `views/topology.js` and the README still say it cross-fades.

## Adjacent, not merged

- `docs/sessions/HANDOFF_20261030_descending_leaders_take_a_path_that_cannot_cross.md`
  (staged, high) decides the leader *path*; question 4 here is about leaders
  being *out of view*. Read that handoff's lesson before deciding 4.
- The stack page's results-table width (two `layout_measurement_awaits_human_decision`
  issues, 2026-09-23) is a different page and stays deferred on its own.

## 2026-11-05 triage sweep — two more layout questions (Q7, Q8), both filed `audience: strategy`

7. **At 1600×1000 the rails leave the grid a 59px slit** —
   `docs/issues/ISSUE_20261104_at_1600_wide_the_product_graphs_rails_leave_the_grid_a_59px_slit.md`.
   `svg.tv__rails` grew from 606px (11-02) to 678px (`6d23015d`, `682a89b6`) inside a 737px `.tv__hscroll`, so
   with the Preview pane open only the merged COMPONENT cell shows beside the rails, and that cell's
   click selects nothing. At the browser tier's own size, no grid row can be clicked. The question is
   what gives at narrow widths: the rails scroll, the pane collapses, the jog zone narrows, or the grid
   gets a minimum width. This is the same "what the DAG gives up" family as Q1/Q3/Q5.
8. **At the as-modelled frame the spindle joint draws its fan from the assembly origin** —
   `docs/issues/ISSUE_20261103_the_spindle_joint_draws_its_fan_from_the_assembly_origin_at_the_as_modelled_frame.md`.
   Since `coaxial_ends_share_one_3d_node` the only live joint on P2 is placed at the mean of the
   solver's two slide ends, which is (0,0,0) at 72° and zero travel. Its eight world lines then run
   from the origin and read as the old star of unplaced nodes. The joint is true; the question is how a
   joint at the datum should be drawn so it does not read as "unplaced".
