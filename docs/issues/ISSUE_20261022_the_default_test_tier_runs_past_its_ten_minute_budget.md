---
type: chore
priority: med
status: deferred
area: tests
reporter: agent
class: suite_over_budget
defer_until: 2026-11-05
found_by: dispatch/docs/sessions/lessons/LESSONS_20261022_triage_sweep.md
resolution: triage 2026-10-22 (second sweep): med beyond this sweep's BUDGET=3 for tolstack (3 staged); deferred 14 days (the class has no program)
---

# The default pytest tier runs 12 minutes against a 10-minute budget

Measured at the 2026-10-22 second-sweep batch merge, on the merge candidate
(trunk after merge `ceac363`). Recorded with `suite-time record`: **729 s, OVER
BUDGET by 2m09s**. Result: 3 failed (load-only browser-runner cases, routed
to `the_kill_witness_fix_is_ported_from_drawing_checker`), 1559 passed, 1
skipped. drawing-checker's candidate was loading the workstation during part of
the run.

```
C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q --durations=15 -p no:cacheprovider
```

Top of `--durations=15` (as reported):

| s | test |
|---:|---|
| 201 | `tests/test_mutation_witness_shadow_concurrency.py::test_two_concurrent_runs…` |
| 153 | `tests/test_feature_geometry.py::test_real_both_readers_classify…` |
| 39 / 28 / 22 | `tests/test_browser_runner.py` throw / exit / signal cases |
| 34 | `tests/test_mutation_witness_shadow_concurrency.py::test_two_different_repo_roots…` |
| 31 | `tests/test_mutation_witnesses.py` (setup) |
| 26 | `tests/test_annotate_js_suite.py` |
| 20 | `tests/test_topology_projection.py::test_installing_a_mesh…` |

The two shadow-concurrency tests (235 s together) are the obvious first
candidates for a merge-only tier.

## Measurement 2026-10-23 (an_export_lists_every_run_that_consumed_it)

941 s (15m41s) serial, `venv-win/Scripts/python.exe -m pytest -q` in a worktree (no xdist in the venv; the box was loaded). Top of `--durations`: test_browser_runner[throw-True] 231 s, test_mutation_witness_shadow_concurrency two-concurrent-runs 118 s, test_browser_runner[exit-False] 111 s, test_feature_geometry real-readers 107 s, test_annotate_js_suite 57 s, test_mutation_witnesses setup 39 s, test_browser_runner[signal-True] 37 s, shadow_concurrency two-roots 28 s.

## Measurement 2026-10-27 (the_model_is_drawn_in_the_scene, review)

968 s (16m08s) serial, `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -rfs` in the review worktree, post-merge: `1 failed, 1592 passed, 1 skipped, 2 deselected` (the failure is the documented worktree-only `test_viewer_js_suite`). Over by 6m08s. The same command on the same tree took 366 s in the tactical's run that morning, so most of the spread is box load (a mutation-witness run had just released the browser slot). Neither run had xdist (still absent from the venv), so neither is at the `-n 16` the budget is defined against. `--durations` was not captured.

## Measurement 2026-10-28 (triage batch merge)

615 s (10m15s), `PYTHONIOENCODING=utf-8 C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q` in the batch-merge candidate worktree (`28c6f783`, inputs bridged, projections rebuilt in the candidate): `1 failed, 1590 passed, 1 skipped, 2 deselected`. `suite-time record`: OVER BUDGET by 0m15s. Run without `--durations`; the pareto above still stands. The one failure is not a worktree artifact. See `ISSUE_20261028_the_default_tier_is_red_on_every_fresh_projection_because_a_named_real_skip_trips_the_skip_guard.md`.
