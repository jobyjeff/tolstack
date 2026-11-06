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

## Addendum 2026-11-06 (review of the_piston_heads_and_cover_ride_with_their_bodies_in_the_kinematic_model)

Review worktree, merged tree: `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q` ->
`1 failed (the worktree-expected test_viewer_js_suite), 1732 passed, 1 skipped, 2 deselected in
1118.43s`; recorded OVER BUDGET. No `--durations` taken (I did not re-run an 18-minute suite to get
one while other agents are queued). The same ledger shows the pattern is now the norm, not a spike:
tolstack default-tier rows for 2026-11-06 read 539, 737, 477, **4033**, 1213, **4210**, 1372 s, and
the one run made in the main checkout alone read **407 s**. Three of the worktree runs sat for
the better part of an hour on one fixture -- the
`test_browser_runner.py::test_a_runner_that_ends_leaves_no_chrome[signal-False]` slot wait named
above -- so **every `pytest -q` in every worktree queues behind whoever holds the one browser slot,
and the slot is held for 15+ minutes at a time by browser tiers and witness gates**. In this
review alone a single annotate browser run waited >15 min for the slot twice. A queue of reviews
and tactical sessions each needing the slot twice (suite + browser tiers) drains at one holder
at a time, which matches Jeff's "agents stuck in the test-suite queue for hours, trickling
through". Proposed first move (the open question already in this issue, now with a cost): make
the default tier not wait on the slot at all -- skip or mark `slow` the Chrome-launching
`test_browser_runner.py` cases outside the main checkout, or give them a bounded wait -- and keep
that one test in the merge tier. Second: the venv has no `pytest-xdist`, so the documented
`-n 16 --dist loadfile` spelling does not run here.
