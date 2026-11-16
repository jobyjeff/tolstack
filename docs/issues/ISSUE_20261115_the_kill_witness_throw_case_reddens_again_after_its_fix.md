---
type: bug
priority: med
status: open
area: browser runner / kill witness
class: browser_tier_flake_under_load
reporter: agent
found_by: docs/sessions/HANDOFF_20261115_the_hub_is_one_part_in_the_grid_and_the_dag.md
---

# The kill witness's throw case reddens again after its fix

`tests/test_browser_runner.py::test_a_runner_that_ends_leaves_no_chrome[throw-True]`
failed twice in a row on 2026-11-15 from the worktree
`the_hub_is_one_part_in_the_grid_and_the_dag` (a five-file pytest run, then
`--lf`), after passing in the same session's full default run:

```
AssertionError: ended by throw: Chrome 14640 exited 1, so it was killed by the
exit handler rather than closed -- the close this path owns did not happen
tests\test_browser_runner.py:337
```

The earlier issue for this class,
`ISSUE_20261022_the_browser_runner_kill_witness_reddens_under_load_here_as_it_did_in_drawing_checker.md`,
is `resolved` (closed automatically when its port handoff completed, "not
independently verified"), so it is no longer read by triage. The handoff that
saw this one changed only `apps/viewer/` and witness specs, not
`scripts/browser_runner.mjs`. Other agents were using the box at the time. No
load was generated to reproduce it.
