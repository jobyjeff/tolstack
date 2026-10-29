---
type: bug
priority: med
status: open
area: tests/mutation-witness
reporter: agent
class: data_conditional_guard_name_unpairable
found_by: dispatch triage sweep 2026-10-29 batch merge (tolstack 798774eb -> 8a2ae880)
handoff: docs/sessions/HANDOFF_20261029_a_guard_whose_name_depends_on_live_data_pairs_with_the_scan.md
---

# A data-conditional pair of `[real]` guards reads as "declared but not run" once the tier stops skipping

## What fails

On the 2026-10-29 batch-merge candidate (integration `8a2ae880` + master
`798774eb`, a no-op merge — the candidate tree **is** integration), with the
declared `candidate_inputs` bridged and the projections freshly rebuilt by
`scripts/rebuild_projections.ps1` in the candidate:

```
PYTHONIOENCODING=utf-8 C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q --durations=15 -p no:cacheprovider
1 failed, 1654 passed, 1 skipped, 2 deselected in 614.97s
FAILED tests/test_mutation_witnesses.py::test_the_scan_and_the_run_agree_on_which_guards_exist
```

```
apps/viewer/tests.js declares '[real] a part sourced to both a drawing and a workbook qualifies the workbook and leaves the drawing alone'
  ...and apps/viewer/run_tests.cjs ran no such check. The scan is counting something that is not a guard ...
```

Trunk at `798774eb` (main checkout, fresh-enough projection) is the mirror
image: `test_the_scan_and_the_run_agree_on_which_guards_exist` passes and
`tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green` fails on the
named `SKIP` (the known red from the 2026-10-28 sweep).

## Why

`5b2caaa7` (2026-10-28, handoff `a_named_finding_skip_does_not_redden_the_default_tier`)
turned the empty-live-set branch in `apps/viewer/tests.js` from a `skip(...)`
into a named PASS under a **different name**:

```js
if (!mixedParts.length) {
  await test("[real] 0 live parts cite both a drawing and a workbook -- ...", ...);
} else await test("[real] a part sourced to both a drawing and a workbook " +
  "qualifies the workbook and leaves the drawing alone", ...);
```

`scripts/guard_enumeration.mjs::pairExecuted` only checks the
declared-but-not-run direction when the tier printed **no** SKIP
(`complete: row.skipped.length === 0`). Before `5b2caaa7` that one SKIP
suppressed the check, so the else-branch name never surfaced. With the SKIP
gone, the static scan counts both names (pin raised 592 -> 593) while the run
executes exactly one of them, so the pairing is red whenever the live set is
empty — i.e. on every fresh projection today. A worktree review without a
projection still SKIPs ~94 `[real]` checks and suppresses the direction, which
is why the review of `5b2caaa7` was green.

The 10-28 fix cleared one guard by tripping its neighbour: both reds are the
same branch seen by two different guards.

## The class

Any guard pair whose *name* is chosen at run time by live data
(`if (live.length) test(A) else test(B)`) is unpairable by the scan/run
equality: one of the two declared names is always unrun. Today there is one
instance; the 46 interpolated browser names are the related, already-handled
case (`enrollable: false`). The mutation spec
`scripts/mutation_witnesses/fast__a-part-sourced-to-both-a-drawing-and-a-workbook-qualifie__6ca658ff.json`
targets the else-branch name, so it is unwitnessable while the live set is
empty too.

## Disposition at the sweep

Merged with this known red (trunk was red by one test on the same branch
before the merge; it is red by one after). Fix staged:
`docs/sessions/HANDOFF_20261029_a_guard_whose_name_depends_on_live_data_pairs_with_the_scan.md`.
