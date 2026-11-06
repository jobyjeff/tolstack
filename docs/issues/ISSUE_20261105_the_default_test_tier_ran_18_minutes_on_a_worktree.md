---
type: chore
priority: med
status: open
area: tests
reporter: agent
class: suite_over_budget
found_by: docs/sessions/HANDOFF_20261105_everything_in_3d_is_transparent_until_an_action_needs_a_face.md
---

# The default test tier ran 18 m 46 s on a worktree (budget 10 min)

Measured 2026-11-05 from the worktree of handoff
`everything_in_3d_is_transparent_until_an_action_needs_a_face`:

`C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -rs` —
`1 failed, 1727 passed, 1 skipped, 2 deselected in 1125.48s`. Recorded with
`dispatch suite-time record` (OVER BUDGET by 8m46s). The one failure is the
documented worktree red (`tests/test_viewer_js_suite.py`, its `[real]` tier).

Two things this measurement does **not** settle, stated so nobody over-reads it:

- The run **overlapped** a full browser-tier run on the same box (and both
  queue on the one browser slot where a test asks for `browser_slot`), so some
  of the wall time is contention, not the suite.
- It was run without `--durations=15` and the venv has no `pytest-xdist`, so
  the documented `-n 16 --dist loadfile` spelling is not available here
  (`unrecognized arguments: -n --dist`). The earlier
  `ISSUE_20261022_the_default_test_tier_runs_past_its_ten_minute_budget.md`
  is resolved; whether its fix assumed xdist is the first thing to check.

Next step: one run alone, `-q --durations=15`, on a quiet box, and start from
that pareto.

## Addendum 2026-11-05 (review of the same handoff, post-merge run)

Review worktree, merged tree:
`C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -rs --durations=15`
-> `1 failed (the worktree-expected test_viewer_js_suite), 1727 passed, 1 skipped, 2 deselected in 1211.78s`;
recorded OVER BUDGET by 10m13s. The pareto settles most of it: **774 s of the
1212 s is one fixture setup**,
`tests/test_browser_runner.py::test_a_runner_that_ends_leaves_no_chrome[signal-False]`
waiting on the machine's browser slot, which two other tactical sessions held
at the time. Without that queue the run is ~7.3 min. Next largest:
`test_feature_geometry.py::test_real_both_readers_classify_every_installed_face_the_same`
119 s, `test_annotate_js_suite.py` 34 s, `test_mutation_witnesses.py` setup 34 s.
So the first question for whoever takes this is whether a slot wait should
count against the default tier's budget at all (cf.
`ISSUE_20261029_a_witness_gate_recorded_over_budget_counts_its_browser_slot_queue.md`).

## Addendum 2026-11-05 (review of the_rail_holds_still_and_takes_the_face_jeff_picked)

`C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -p no:cacheprovider`, review
worktree, post-merge: `1 failed, 1729 passed, 1 skipped, 2 deselected in 4209.57s` (the failure is
the worktree's deliberate `test_viewer_js_suite` red). Recorded `OVER BUDGET by 60m10s`. Nearly all
of it is one wait: the run sat at test 24,
`tests/test_browser_runner.py::test_a_runner_that_ends_leaves_no_chrome[signal-False]`, for about
55 min while the browser slot went to two other sessions and then to this review's own annotate
browser suites and witness gate. Once it had the slot, the rest ran in roughly 15 min. No
`--durations` was taken. This repo's conftest prints no `concurrent pytest processes` /
`full-suite lock` header, so the record has none to quote. Same question as above: should a slot
wait count against this tier?

## Addendum 2026-11-06 (the_grid_and_the_dag_move_with_the_mechanism)

Default tier on a worktree, plain `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q`
(this venv has no xdist, so `-n 16 --dist loadfile` is rejected: "unrecognized arguments").
Measured **852 s** (14m12s): 1728 passed, 1 skipped, 3 failed. The browser slot was shared
with other agents' runs during the measurement. The budget is 10 min, so this is over by
4m12s (`dispatch suite-time record` printed that). `--durations` was not taken.
