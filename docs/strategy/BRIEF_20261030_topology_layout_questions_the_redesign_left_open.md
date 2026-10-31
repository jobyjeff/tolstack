# BRIEF 2026-10-30 — topology_layout_questions_the_redesign_left_open: six DAG/grid layout questions that outlived the brief that held them

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
