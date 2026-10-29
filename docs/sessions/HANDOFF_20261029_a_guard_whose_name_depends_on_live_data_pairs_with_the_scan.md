---
priority: med
depends_on: []
model: sonnet
hitl: false
---

# HANDOFF 2026-10-29 — a_guard_whose_name_depends_on_live_data_pairs_with_the_scan: the default tier is green on a fresh projection with neither the skip guard nor the scan/run pairing loosened

Source: triage sweep 2026-10-29 batch merge, from
`docs/issues/ISSUE_20261029_a_data_conditional_pair_of_real_guards_reads_as_declared_but_not_run.md`.
Baseline: `master` at `8a2ae880`. Scope: `apps/viewer/tests.js` (the
per-document qualifier `[real]` block near the `mixedParts` branch),
`scripts/guard_enumeration.mjs` (`enumerateGuards` / `pairExecuted` / the
`DECLARED_GUARDS` pins), `tests/test_mutation_witnesses.py`,
`tests/test_viewer_js_suite.py`, and the mutation spec
`scripts/mutation_witnesses/fast__a-part-sourced-to-both-a-drawing-and-a-workbook-qualifie__6ca658ff.json`.

## The gap

`5b2caaa7` replaced a named `skip(...)` with a PASS under a second name, so
`apps/viewer/tests.js` now declares two `[real]` guards of which the live data
lets exactly one run. With no SKIP in the run, `pairExecuted` checks
declared-but-not-run and finds the else-branch name unrun:
`tests/test_mutation_witnesses.py::test_the_scan_and_the_run_agree_on_which_guards_exist`
fails on every fresh projection. Before `5b2caaa7` the SKIP hid this and
instead reddened `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`.

## Deliverables

1. Fix the **class**, not just this one block: a guard whose name is chosen at
   run time by live data. Pick one shape and say why in the lesson. Candidates:
   one guard name for both branches (the body asserts the live set or reports
   it empty by name in its own output); or a declared, scanner-visible
   annotation for a mutually exclusive pair that `pairExecuted` accepts as
   "exactly one of these ran"; or another shape you can defend. **Do not**
   weaken either guard: `test_viewer_js_suite_is_green` must still fail on any
   SKIP, and `pairExecuted` must still flag a declared name that no branch
   could run.
2. The empty live set stays visible by name in `node apps/viewer/run_tests.cjs`
   output, and a future live mixed part re-arms the `[real]` assertion.
3. The mutation spec for this guard is witnessable on today's data (or is
   re-pointed at the fixture witness), and the census pins match.
4. Prove in the lesson, in the **main checkout** after
   `scripts/rebuild_projections.ps1`: default tier green; then in a worktree
   with no projection, `test_viewer_js_suite_is_green` still red.
5. Resolve the issue (`status: resolved`, pointing here).

## Definition of done

- `PYTHONIOENCODING=utf-8 venv-win/Scripts/python.exe -m pytest -q` green in the
  main checkout on a fresh projection, both
  `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green` and
  `tests/test_mutation_witnesses.py::test_the_scan_and_the_run_agree_on_which_guards_exist`
  passing.
- `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack --changed-since integration`
  clean for the entries the change reaches.
- The review runs the default tier **with a fresh projection** (the
  `5b2caaa7` review ran without one, which is how this slipped).
