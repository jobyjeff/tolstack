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
