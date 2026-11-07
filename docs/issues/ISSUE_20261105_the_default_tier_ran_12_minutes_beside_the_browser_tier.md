---
type: chore
priority: med
status: closed
area: tests
reporter: agent
class: suite_over_budget
found_by: docs/sessions/HANDOFF_20261105_the_dag_is_coloured_by_a_chosen_attribute_and_spaced_to_taste.md
resolution: closed 2026-11-06 (triage) -- duplicate of ISSUE_20261022_the_default_test_tier_runs_past_its_ten_minute_budget.md (one suite_over_budget issue per repo per tier); that issue's 11-06 addendum cites this measurement
---

# The default tier ran 12m43s, over its 10-minute budget, with the browser tier running beside it

- **Measured:** 763 s (12m43s) against the default tier's 10-minute budget,
  so `OVER BUDGET by 2m43s`. Recorded with `dispatch suite-time record`.
- **Command:** `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -p no:cacheprovider`,
  single process, run in a worktree with its own projection and bridged
  inputs. `venv-win` has no xdist, so `-n 16 --dist loadfile` could not be
  used.
- **Result:** 1 failed, 1727 passed, 1 skipped. The failure was a rotted
  witness anchor, fixed on the branch.
- **What was running beside it:** the whole browser tier
  (`node scripts/run_viewer_browser_tests.mjs`), started a second earlier.
  It held the browser slot and several Chrome processes for the whole run,
  so this number includes contention.
- **For comparison:** the 11-05 batch-merge candidate ran 503 s
  (`ISSUE_20261022_the_default_test_tier_runs_past_its_ten_minute_budget.md`,
  now resolved).

No `--durations=15` breakdown was taken. Re-measure alone with
`--durations=15` before acting on this. If the tier is under budget when run
alone, close this issue as contention.
