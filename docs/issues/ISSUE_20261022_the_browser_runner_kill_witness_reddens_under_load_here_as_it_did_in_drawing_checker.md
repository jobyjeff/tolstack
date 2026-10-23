---
type: bug
priority: med
status: resolved
area: browser runner / kill witness
class: browser_tier_flake_under_load
reporter: agent
found_by: dispatch/docs/sessions/lessons/LESSONS_20261022_triage_sweep.md
handoff: docs/sessions/HANDOFF_20261022_the_kill_witness_fix_is_ported_from_drawing_checker.md
resolution: handoff completed 2026-10-23 -- closed automatically by dispatch when handoff `the_kill_witness_fix_is_ported_from_drawing_checker` moved to completed/; not independently verified.
---

# The browser runner's kill witness reddens under load here, as it did in drawing-checker

The 2026-10-22 second batch merge ran the candidate (`ceac363`, the tree that
became trunk) with

    C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q --durations=15 -p no:cacheprovider

from `C:\workspace\tolstack-batchmerge`, while drawing-checker's candidate
suite ran concurrently on the same box. Result: `3 failed, 1559 passed,
1 skipped in 728.02s`. The three:

- `tests/test_browser_runner.py::test_a_runner_that_ends_leaves_no_chrome[signal-True]`
  — "Chrome [41016, 41616] … was still running when its node exited"
- `tests/test_browser_runner.py::test_a_runner_that_ends_leaves_no_chrome[throw-True]`
  — `subprocess.TimeoutExpired` on `tests/browser_runner_witness.mjs throw`
  after 30 seconds
- `tests/test_browser_runner.py::test_a_runner_that_ends_leaves_no_chrome[exit-False]`
  — six Chrome pids alive at node's exit

`tests/test_browser_runner.py` alone, same tree, unloaded: `7 passed in
40.57s`. Neither `scripts/browser_runner.mjs` nor
`tests/browser_runner_witness.mjs` changed in this merge, so the red is
pre-existing on trunk and load-only.

This is the shape drawing-checker hit three times (its
`ISSUE_20261022_the_browser_runner_kill_witness_still_reddens_under_load_after_two_fix_rounds.md`),
and drawing-checker fixed it at the cause in
`drawing-checker/docs/sessions/completed/HANDOFF_20261022_the_kill_witness_tells_a_slow_kill_from_a_slow_read.md`
(commits `4d08f907`, `e0bc2665`, `20c0dee6`, `6febee30`). tolstack's runner is
where that lever was born, so the fix has to be ported back.
