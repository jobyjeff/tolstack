---
priority: high
depends_on: []
model: opus
hitl: false
---

# HANDOFF 2026-11-09 — the_demo_path_reads_cleanly_on_a_projector: no false warning chip, a readable grid beside the 3D pane at 1920, plain preview copy, and heavier lines

Source: the 2026-11-09 integration walk
(`docs/sessions/lessons/LESSONS_20261109_the_integration_walk_reads_the_merged_page_against_jeffs_sentences.md`,
Table 2 and S9). Its five demo clicks at 1920×1200 found these defects, each
filed as an issue. Read every issue: they carry the shots and the exact strings.
- `ISSUE_20261109_the_3d_pane_wears_a_folder_needed_chip_through_the_whole_demo.md` (high)
- `ISSUE_20261109_with_the_3d_pane_open_at_1920_the_grid_shows_only_its_gutter.md` (high)
- `ISSUE_20261109_a_row_preview_on_the_demo_path_prints_backticks_and_negation.md` (high)
- `ISSUE_20261109_line_weights_still_read_thin_on_the_merged_page.md` (high)
- `ISSUE_20261108_the_grid_prints_a_parts_number_twice_and_its_label_gutter_costs_152px.md` (med).
  Part of why the gutter eats the grid.
- `ISSUE_20261109_the_viewer_logs_a_404_for_a_topologies_projection_on_every_load.md` (med).
  The 404 is in the console on every load.

Baseline: tolstack trunk after the 2026-11-09 triage batch merge (`4f09207e`
or later). The page on port 8000 now serves that tree, verified by hash on
2026-11-09. Scope:
- `apps/viewer/` (topology layout, copy, stroke weights);
- `apps/annotate/storage/adapter.js` and the pane title row's chip;
- their tests.

Do NOT touch the sweep posing or the Bodies list, which are owned by the
parallel `HANDOFF_20261109_a_folded_part_rides_its_own_body_in_the_sweep_and_the_bodies_list`,
or the suites owned by
`HANDOFF_20261109_the_two_red_browser_suites_on_trunk_go_green_against_a_fresh_projection`.

## Decisions made here (so you check them rather than re-open them)

- **The chip appears only when a write is attempted, or in bind mode.** Sweep
  mode and an untouched pane show none. Rejected: a neutral grey chip in every
  mode, because the walk's reading is that any chip during a sweep reads as a
  fault.
- **Line weights: take the issue's recommendation** as the starting values:
  rails 2.5–3px, both kinds of leader 2px, part containers 1.5px. Pick the exact
  values by looking at 1920 shots. This was routed to strategy as a design call,
  and triage made it here because the cheap direction applies: a wrong weight
  costs one review round. If the shots argue for different values, use them and
  say why. Keep the hierarchy: dimension bar > rails > leaders ≥ containers.
- **The grid stays readable beside the open pane.** At 1920 with the pane open,
  the PART and ELEMENT columns of at least the lit row are on screen with no
  horizontal scroll. Choosing between narrowing the pane, wrapping the gutter
  and dropping the doubled part number is yours to make; record it in the
  lesson. Doing the doubled-number fix is expected, not optional.

## Deliverables

1. Remove the false `folder needed` chip, per the decision above.
2. Make the grid readable at 1920 with the pane open, including the doubled
   part number and the gutter width.
3. Rewrite the preview copy for the tan-link length row (`apps/viewer/topology.js:80`
   and its siblings):
   - no literal backticks;
   - no negation;
   - no field names or internal words (`closes`, `default transform: identity`,
     "M2 adds the term").

   Apply the prose budget across **every** preview string written in that
   shape, not only the one the walk clicked. List the ones you changed.
4. Raise the line weights, per the decision above.
5. Make the console show no 404 on a normal load, per the issue.

## Definition of done

- Re-run the walk's demo phase against the served page:
  `node tests/debug_integration_walk_20261108.mjs --phase demo8000`. Save before
  and after shots at 1920×1200 to `docs/sessions/lessons/shots/<slug>/`, and look
  at every one with vision. Quote in the lesson:
  - the chip state in each of the five clicks;
  - the visible grid columns with the pane open;
  - the computed stroke widths.
- The viewer and annotate node suites, the default tier, and the browser TRUTH
  tier for the suites you touched are green, plus
  `--changed-since master` witnesses for the specs you moved.
- Lesson (`docs/sessions/lessons/LESSONS_<YYYYMMDD>_the_demo_path_reads_cleanly_on_a_projector.md`):
  - the final weights and why;
  - the layout choice for the grid beside the pane;
  - the preview strings changed.
