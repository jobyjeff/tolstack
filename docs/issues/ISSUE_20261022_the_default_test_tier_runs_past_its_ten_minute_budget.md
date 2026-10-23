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
