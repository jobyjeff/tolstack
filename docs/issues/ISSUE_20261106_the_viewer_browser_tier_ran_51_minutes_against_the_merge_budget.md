---
type: chore
priority: med
status: deferred
area: tests
reporter: agent
class: suite_over_budget
found_by: docs/sessions/active/HANDOFF_20261105_the_rail_reads_as_a_tree_of_bodies_joints_and_faces.md
defer_until: 2026-11-20
resolution: deferred 2026-11-06 (triage) -- med beyond tolstack's budget of 3 (two highs and one class-scoped handoff staged); 14 days
---

# The viewer browser TRUTH tier ran 50 m 54 s, recorded against the merge budget

Measured 2026-11-06 from the worktree of
`the_rail_reads_as_a_tree_of_bodies_joints_and_faces`:

    node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack

took 3054 s by the shell's clock (42 suites, 39 green on that run). The run
went straight after `node apps/annotate/run_browser_check.mjs`, which took
2337 s itself. `dispatch suite-time record tolstack --tier merge` answered
`OVER BUDGET by 20m54s`.

**What the figure includes.** It is wall time from the command's start, so any
time spent queued for the machine's one browser slot is in it. The run's
`waiting for browser slot` lines were filtered out of the captured output, so
this record cannot split queueing from running. The same caveat is in
`ISSUE_20261029_a_witness_gate_recorded_over_budget_counts_its_browser_slot_queue.md`
for the witness gate.

**What would settle it.** The runner prints when it gets the slot. Recording
the time from that line to the summary line would give the tier's own length.
If that is still past the budget, the next question is which suites dominate.
This session did not time suites one by one.

**Sighting, 2026-11-09** (handoff
`the_scene_draws_the_model_alone_and_every_node_it_places_has_a_leader`):
`node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` from
a worktree ran 30m51s wall, slot queue included, with 44 suites (one added by
that handoff). That's over the 30-minute budget by 0m51s.

## Measurement 2026-11-09 (the_dag_and_grid_nest_coloured_bodies_and_compact_means_denser_rows)

`node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack/data/scratch/nested_bodies/repo`,
from that handoff's worktree, browser slot uncontended: **31m46s (1906 s)** against
the 30-minute merge budget, so 1m46s over. 42/43 suites passed; the one red is
`annotate rail holds still`, already red on integration
(`ISSUE_20261108_the_rail_holds_still_browser_check_is_red_on_integration.md`).
That handoff added 4 checks to "the DAG zoom, Fit and the grid header", each
toggling density and Groups on both models, which is about 40 s of the total.

## Measurement 2026-11-09, review merge (the_dag_and_grid_nest_coloured_bodies_and_compact_means_denser_rows)

Same spelling and scratch root, run from the review worktree on the merged tree
(integration `e34401a0` + this handoff): **32m54s (1974 s)**, 2m54s over. 40/43
suites passed. The reds were the file:// rail-hover pair (209/209 alone; my
concurrent pytest subset was loading the box), `annotate rail holds still`
(already filed), and `the model drawn alone and led`, which is red on plain
integration too
(`ISSUE_20261109_the_model_drawn_alone_and_led_check_is_red_on_integration_against_integration_built_projections.md`).

## Measurement 2026-11-09, triage batch merge (found_by: dispatch/docs/sessions/lessons/LESSONS_20261109_triage_sweep.md)

`node scripts/run_viewer_browser_tests.mjs` took **33m05s (1985 s)**, 3m05s
over the 30-minute merge budget. It ran in the main checkout on master
`31c9118c` (fast-forwarded from `5e868bc3`) after a fresh
`scripts/rebuild_projections.ps1`, with nothing else holding the browser
slot. The witness gate ran after it, not beside it. **42/44** suites passed.
The two reds are `annotate rail holds still` and `the model drawn alone and
led`, both already filed and now routed to
`HANDOFF_20261109_the_two_red_browser_suites_on_trunk_go_green_against_a_fresh_projection`.
The suite count grew from 43 to 44 with this merge. The runner prints no
per-suite timing, so this measurement has no pareto.

## Measurement 2026-11-09 (the_two_red_browser_suites_on_trunk_go_green_against_a_fresh_projection)

| | |
| --- | --- |
| Command | `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`, run from that handoff's worktree |
| Projections | the main checkout's, rebuilt from `3d04f5cd` |
| Result | **44/44**, exit 0 |
| Wall time | **1822 s** (30m22s), against the 30-minute merge budget: over by 22 s |
| Slot | taken by this run alone; the six `--only` witness runs before it had finished |

It is the first all-green full run since the two reds were fixed. The runner
still prints no per-suite timing, so this measurement has no pareto either.

## Measurement 2026-11-09 (the_demo_path_reads_cleanly_on_a_projector)

`node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`, from a
worktree with `node_modules` junctioned to the main checkout: **1896 s (31m36s)**
against the 30-minute merge budget, 40/44 suites. The default pytest tier ran in
the same window, so this measurement includes CPU contention from it. One
`file://` suite timed out on `page.goto` during that overlap, and passed when
re-run alone.

## Measurement 2026-11-09 (review of the_demo_path_reads_cleanly_on_a_projector)

| | |
| --- | --- |
| Command | `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`, from the review worktree (merged tree, `node_modules` junctioned) |
| Projections | the main checkout's |
| Result | **42/44**, exit 1 (see that review report for the two reds) |
| Wall time | **1830 s** (30m30s), against the 30-minute merge budget: over by 30 s (`dispatch suite-time record`) |
| Slot | taken by this run alone; the full pytest run had finished before it started |

The two uncontended worktree runs today landed 22 s and 30 s over
(1822 s, 1830 s). That points to the tier's own size, not to
contention.

## Measurement 2026-11-10 (review of the_model_is_derived_once_and_the_left_column_is_its_tree)

| | |
| --- | --- |
| Command | `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`, from the review worktree (merged tree, `node_modules` junctioned) |
| Projections | the main checkout's, stamped from the branch at `670aba5d` |
| Result | **44/44**, exit 0 |
| Wall time | **1873 s** (31m13s), against the 30-minute merge budget: over by 1m13s (`dispatch suite-time record`) |
| Slot | taken by this run alone; the full pytest run (418 s) had finished before it started, and nothing else of this review ran beside it |

Fourth uncontended worktree run in two days over the budget (1822, 1830,
1896-contended, 1873 s). The tier gained a 44th suite on 2026-11-09 and this
handoff rewrote the nav suites' walks (the body-hover sub-check alone polls
for up to 20 s). Still no per-suite timing from the runner, so still no pareto.

## Measurement 2026-11-10, triage batch merge (found_by: dispatch/docs/sessions/lessons/LESSONS_20261110_triage_sweep.md)

| | |
| --- | --- |
| Command | `node scripts/run_viewer_browser_tests.mjs`, main checkout |
| Tree | master `46ed0380` (fast-forwarded from `382ff99e`), right after a fresh `scripts/rebuild_projections.ps1` |
| Result | **44/44**, exit 0 |
| Wall time | **1937 s** (32m17s), against the 30-minute merge budget: `suite-time record` printed **OVER BUDGET by 2m17s** |
| Slot | nothing else held it; the witness gate ran after this, not beside it |

Fifth uncontended run over the budget in two days (1822, 1830, 1873, 1985,
1937 s). The runner still prints no per-suite timing, so still no pareto.

## Measurement 2026-11-10 (the_browser_tier_says_where_its_half_hour_goes)

Full run 2,723 s (slot wait 1 s), 44 suites. Slowest: topology file:// 394, topology
http 378, kinematic study page 275 (aborted), DAG zoom 238, 3D pane follows the
selection 105, no nav click wedges 101, topology respine 90, leaders across the seam
86, height budget 78, face suggestions 69. Fixed sleeps in the whole file total 42 s.
The runner now prints this table itself and appends it to the suite-time ledger.

## Measurement 2026-11-12 (review of one_selection_one_hover_and_leaders_off)

Whole tier, review worktree, `--repo C:/workspace/tolstack`, under the slot
with nothing else holding it: the runner's own table says **1914.0 s / 1176
checks TOTAL running** (31m54s), against the 30-minute merge budget -- over
by 1m54s, the smallest overrun recorded here so far. Top of the table:
annotate flyout 59.3 s, annotate rail suggestion 50.6 s, annotate sweep rail
50.5 s, annotate rail and scene 45.7 s, the scene pane over HTTP 44.5 s, the
model drawn alone 30.1 s. The two slow outliers the 2026-11-06 measurement
named are not in this run's top six.

## Measurement 2026-11-11, triage batch merge (found_by: dispatch/docs/sessions/lessons/LESSONS_20261111_triage_sweep.md)

| | |
| --- | --- |
| Command | `node scripts/run_viewer_browser_tests.mjs`, main checkout |
| Tree | master `6a165ddc` (fast-forwarded from `ccfd1783`) plus a docs-only issue commit, right after a fresh `scripts/rebuild_projections.ps1` |
| Result | **44/44** (1176 checks), exit 0 |
| Wall time | **1874 s** (31m14s), against the 30-minute merge budget: `suite-time record` printed **OVER BUDGET by 1m14s** |
| Slot | nothing else held it; the default tier had finished on the candidate before it started, and the witness gate ran after it |

Sixth uncontended run over the budget (1822, 1830, 1873, 1985, 1937, 1874 s).
The runner's own per-suite table (top 8 of 44): topology file:// 209.2 s,
topology http 200.2 s, the DAG zoom/Fit/grid header 168.7 s, 3D pane follows
the selection 101.1 s, no nav click wedges the page 99.2 s, topology file://
respine 93.8 s, leaders across the seam 91.9 s, kinematic study page 79.9 s.
The two topology suites alone are 409 s, 22% of the tier.

## Measurement 2026-11-12 (review of the_pane_follows_the_one_selection_both_ways)

`node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`, from the review
worktree on the merged tree (integration `9a17df0f` + the handoff, a fast-forward to
`3a90d2be`). **44/44, 1134 checks, exit 0, 1885 s**: the runner's own ledger row says
over by 85 s. The default pytest tier ran in parallel for its first 7 minutes, and one
short reviewer probe ran during the run, so this run was not uncontended. Top of the
runner's table: topology http 206.8 s, the DAG zoom/Fit/grid header 179.1 s, topology
file:// 159.1 s, 3D pane follows the selection 106.0 s, no nav click wedges the page
105.0 s, topology file:// respine 94.5 s, leaders across the seam 93.0 s, kinematic study
page 80.7 s.

> **Measurement, 2026-11-16 (review of `the_map_draws_the_end_stop_model`).**
> The whole tier on the merged tree `2ad6e521`, from a review worktree against
> a scratch root, 47 suites, 1118 checks: **1829 s wall, slot wait 0 s, over the
> 1800 s merge budget by 29 s** (the runner's own ledger row, `over: true`).
> The new map suite is 76.6 s of it (27 checks). Slowest first: topology http
> 154.0 s (181 checks), the DAG zoom / Fit / grid header 150.1 s, topology
> file:// 98.8 s, 3D pane follows the selection 95.7 s, no nav click wedges the
> page 92.6 s, annotate rail holds still 91.7 s, a suggestion names its face
> 86.3 s, leaders across the seam 82.3 s, topology file:// respine 78.9 s, the
> map 76.6 s, the model drawn alone and led 73.7 s, kinematic study page
> 73.7 s. The previous whole-tier row (tree `3f5ae923`, 2026-11-16T12:01Z) was
> 1737 s; the tier gained one suite and 92 s and crossed the line.

> **Measurement, 2026-11-16, round 2 of the same review.** The whole tier on
> the rework's merged tree `8bbef3ea`, same scratch root, 47 suites, 1120
> checks: **1835 s wall, over the 1800 s budget by 35 s** (the runner's own
> row). Two checks more than round 1 and six seconds slower; the shape of the
> timing table is unchanged.

> **Measurement, 2026-11-16, round 2b (the handoff tip `40162c99`, merged tree
> `1aa735fe`).** 47 suites, 1120 checks, **1853 s wall, over by 53 s**
> (the runner's own row). Three whole-tier runs on this handoff's trees in one
> day: 1829 → 1835 → 1853 s, the drift being slot-free wall time on a shared
> box rather than new checks (two were added between the first and second).

## Measurement 2026-11-16, triage batch merge (found_by: dispatch/docs/sessions/lessons/LESSONS_20261116_triage_sweep.md)

| | |
| --- | --- |
| Command | `node scripts/run_viewer_browser_tests.mjs`, main checkout |
| Tree | master `4ad98772` (fast-forwarded from `a0e1ac5a`, 72 commits), right after a fresh `scripts/rebuild_projections.ps1` |
| Result | **46/47** suites (1120 checks), exit 1 — the one red is the known `the model drawn alone and led` 22/23 (`ISSUE_20261115_the_model_drawn_alone_and_led_two_hover_lighting_checks_red_on_integration.md`) |
| Wall time | **1822 s** (runner's own TOTAL 1819.0 s), against the 30-minute merge budget: `suite-time record` printed **OVER BUDGET by 0m22s** (the runner's self-recorded row also reads `over: true`) |
| Slot | uncontended (`slot_wait_s: 0`); the default tier had finished on the candidate before it started |

Runner's per-suite table, top 8 of 47: the DAG zoom, Fit and the grid header
154.6 s, topology http 153.3 s, topology file:// 100.6 s, annotate rail holds
still 94.8 s, 3D pane follows the selection 94.2 s, no nav click wedges the
page 90.7 s, a suggestion names its face and the mate ranks the other side
89.2 s, topology file:// respine 81.3 s. Three suites more than 11-11 (44 → 47).

## Measurement 2026-11-16, review of the_model_drawn_alone_and_led_hub_hover_check_goes_green (found_by: docs/sessions/active/HANDOFF_20261116_the_model_drawn_alone_and_led_hub_hover_check_goes_green.md)

| | |
| --- | --- |
| Command | `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`, review worktree (merged tree; runner's row sha `caeb4a2c`) |
| Result | **46/47** suites (1120 checks), exit 1. The one red is `3D pane follows the selection` 30/31 (`...and leaving it takes the light down`), 31/31 alone right after it, so it is the deferred load flake (`ISSUE_20261105_a_nav_scene_row_rebuilt_under_a_resting_pointer_drops_the_scenes_hover_light.md`). `the model drawn alone and led` is now 23/23 |
| Wall time | **1867 s** (runner TOTAL 1866.7 s), so the runner's self-recorded row reads `over: true`, **over by 1m07s** |
| Slot | `slot_wait_s: 0`. The default pytest tier was running beside it for its first ~5 minutes |

Top 8 of 47: topology http 159.1 s, the DAG zoom, Fit and the grid header 149.3 s,
topology file:// 102.9 s, 3D pane follows the selection 102.6 s, no nav click
wedges the page 95.5 s, annotate rail holds still 91.8 s, leaders across the
seam 84.0 s, a suggestion names its face 82.2 s. This is the fourth over-budget
merge row today (1853 s, 1819 s, 1822 s, 1867 s), so the overrun is steady and
not a one-off.

## Measurement 2026-11-16 (second triage batch merge; found_by: dispatch/docs/sessions/lessons/LESSONS_20261116_triage_sweep.md)

`node scripts/run_viewer_browser_tests.mjs`, main checkout at master `5584fbfe` (fast-forwarded from `68290d5a`, 20 commits, three handoffs), run alone with the slot free (`slot_wait_s: 1`): **48/48** suites passed, exit 0. That includes `the model drawn alone and led` 23/23 and the new `a window resize re-clamps the pane and the map` 3/3. Wall **1892 s** (runner row 1888 s), `suite-time record` printed **OVER BUDGET by 1m28s**. Top 8 of 48: the DAG zoom, Fit and the grid header 153.6 s, topology http 148.2 s, topology file:// 104.1 s, annotate rail holds still 96.8 s, 3D pane follows the selection 96.3 s, no nav click wedges the page 91.8 s, a suggestion names its face 91.2 s, leaders across the seam 89.5 s. Each new suite adds to an overrun that was already steady.
