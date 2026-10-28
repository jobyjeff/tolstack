---
type: chore
priority: med
status: triaged
area: tests
reporter: agent
class: suite_over_budget
found_by: docs/sessions/HANDOFF_20261026_leaders_follow_the_active_study_across_the_seam.md
handoff: docs/sessions/HANDOFF_20261027_a_witness_run_stops_at_its_budget_and_leaves_the_rest_to_the_sweep.md
---

# A `--changed-since` witness gate on a viewer handoff runs 35 minutes against a 30-minute budget

The review merge of `leaders_follow_the_active_study_across_the_seam`
(2026-10-27) ran:

    node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack-worktrees/leaders_follow_the_active_study_across_the_seam-review --changed-since integration

It selected **43 entries (29 browser, 14 fast)** and took **35m03s**, 15:01:53 to
15:36:56. It witnessed 43/43. `suite-time record` reports
`OVER BUDGET by 5m03s` against the 30-minute merge tier.

This is the gate that replaced the full registry on 2026-10-26
(`ISSUE_20261022_the_mutation_witness_full_registry_runs_past_its_thirty_minute_budget.md`,
resolved by `the_full_registry_leaves_the_merge_gate`). So the hunk-level
selection still overruns on one viewer handoff. That handoff added 25 specs
of its own and touched `topology_app.js`, `views/topology.js`,
`topology.js`, `topology.css` and the browser runner.

The cost is almost all browser entries, about 70 s each on average. Each
one re-runs a whole browser suite under the one slot, and this branch's own
17 specs all name one suite (`leaders across the seam`), which builds the P2
sweep on every run. That is an inference from the spec files, not a
measurement. The runner prints no per-entry wall
time, so there is no top-15 to give. Adding one is the first lever. The
second is to share one suite run across every selected entry of the same
suite whose mutations touch disjoint lines. A third is to cap how many specs
a single handoff may add to one suite.
