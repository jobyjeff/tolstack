---
type: chore
priority: low
status: deferred
area: tests
reporter: agent
class: suite_over_budget
found_by: docs/sessions/active/HANDOFF_20261105_the_grid_fits_the_screen_and_its_brackets_say_what_nests_in_what.md
defer_until: 2026-12-06
resolution: deferred 2026-11-06 (triage) -- low defers by default; suite_over_budget has no program; 30 days
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

## Addendum 2026-11-06 (review round 2, same branch)

The same gate ran again after the round-2 merge of `integration`. It took 1875 s
wall. The runner reported "34/43 witnessed, 43/60 reached in 30m50s; 17 left
to the sweep" and exited 1. `suite-time record --tier merge` said **OVER BUDGET
by 1m15s** again. The runner's own count is 50 s past the 30-minute cap, which
is the entry that started just inside it. The exit 1 comes from nine
kinematic-page entries whose baseline was red for the reason in
`ISSUE_20261106_two_kinematic_page_browser_checks_still_match_the_old_edge_names.md`.
It has nothing to do with this overrun. An earlier round-2 run the same day
took 2359 s (30m36s reached), and was recorded as **OVER BUDGET by 9m19s**. About 9 minutes of that fall outside the runner's own clock, which I take to be the wait for the browser slot. I did not measure it.
