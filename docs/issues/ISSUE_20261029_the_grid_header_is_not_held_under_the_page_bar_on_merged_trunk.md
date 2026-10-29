---
type: bug
priority: med
status: open
area: viewer/browser-tier
reporter: agent
class: guard_green_on_its_branch_red_after_later_landings
found_by: dispatch triage sweep 2026-10-29 batch merge (tolstack 798774eb -> 8a2ae880)
handoff: docs/sessions/HANDOFF_20261029_the_grid_header_rides_its_rows_on_merged_trunk.md
---

# On merged trunk the grid header is not held under the page bar: two `[real]` browser sub-checks red, alone and in the full run

## What fails

Main checkout, `master` at `8a2ae880` (after the 2026-10-29 batch merge), right
after `powershell -NoProfile -File scripts/rebuild_projections.ps1` (stamps
`sha12=8a2ae880e144 dirty=False behind_trunk=0`):

```
node scripts/run_viewer_browser_tests.mjs                     # full run, 453 s: 32/35
node scripts/run_viewer_browser_tests.mjs --only "the DAG zoom, Fit and the grid header"   # alone, 34 s: 0/1
[the DAG zoom, Fit and the grid header] 26/28 sub-checks passed: FAIL
    FAIL sub-check: [real] scrolled down the grid, the header is on screen whenever a grid row is
    FAIL sub-check: [real] ...and past the grid's first screen it is held under the page bar
      header: 6 of 6 stops had grid rows on screen
      kinematic grid scrolled: rows in view 8, header 48 against the topbar's 48
```

Red alone as well as in the full run, so it is not the known load flake
(the other two full-run failures that sweep, "3D pane follows the selection"
and "crop lightbox", passed alone: 32/32 and 20/20).

## Where it came from

The guard landed in `8f0e52de` (2026-10-28, `the_dag_is_zoomable_and_a_length_mode_draws_to_scale`)
and was green on that branch and again in the review of
`the_kinematic_study_reads_like_every_other_study_and_its_plot_shows_both_tolerances`
(26/26). Neither was on trunk before this merge, so trunk was not red here
before. Later integration landings that touch the same layout:
`7a9b4308`/`1f3505c1` (compact band), `fc0fcfd5`/`ec5c5204` (right-hand pane),
`e2988522`/`b02343f5` (study groups). The projection is also fresh (new data
since those reviews), so a data-dependent layout is a candidate too. Not
bisected at the sweep.

## Disposition at the sweep

Found after the merge had landed (the browser tier needs `node_modules`, which
only the main checkout has, so it runs post-merge). Routed: staged
`docs/sessions/HANDOFF_20261029_the_grid_header_rides_its_rows_on_merged_trunk.md`.
