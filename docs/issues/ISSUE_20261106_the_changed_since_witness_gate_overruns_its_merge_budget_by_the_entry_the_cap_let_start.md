---
type: chore
priority: low
status: open
area: tests
reporter: agent
class: suite_over_budget
found_by: docs/sessions/active/HANDOFF_20261105_the_grid_fits_the_screen_and_its_brackets_say_what_nests_in_what.md
---

# The `--changed-since` witness gate overruns its merge budget by the entry the cap let start

`node scripts/run_mutation_witness_tests.mjs --changed-since integration --repo <worktree>/data/scratch/root`
on branch `handoff/the_grid_fits_the_screen_and_its_brackets_say_what_nests_in_what`
(2026-11-06) ran for 1875 s of wall time. The runner reported "38/38 witnessed,
38/55 reached in 29m26s; 17 left to the sweep" and exited 0. `suite-time record
--tier merge` said **OVER BUDGET by 1m15s**.

The 30-minute `--budget-min` cap decides whether to start an entry. It does
not bound the wall time. The last entry it starts can finish after the cap,
and the runner's startup and teardown come on top of the runner's own
"29m26s". A capped run therefore lands just past a 30-minute budget by design.

There are two ways to fix it:

- **Recommended:** start an entry only if its expected duration still fits
  before the cap. The runner already knows each browser suite's cost from the
  previous run.
- Alternatively, record the gate against a budget that includes one entry of
  slack.
