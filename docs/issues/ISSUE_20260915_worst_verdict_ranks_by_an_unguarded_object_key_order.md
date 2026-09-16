---
type: bug
priority: med
status: resolved
area: viewer/topology
reporter: agent
found_by: docs/sessions/HANDOFF_20260915_viewer_study_verdicts_and_gaps.md
handoff: docs/sessions/HANDOFF_20260916_js_guards_and_suite_isolation.md
resolution: handoff completed 2026-09-16 -- closed automatically by dispatch when handoff `js_guards_and_suite_isolation` moved to completed/; not independently verified.
---

# `VA.worstVerdict` ranks by `VA.VERDICTS`' key order, and nothing guards that order

`VA.worstVerdict` (`apps/viewer/topology.js`) picks a study's rollup verdict by
`Object.keys(VA.VERDICTS).indexOf(check.verdict)` and keeping the **highest**
index — i.e. it reads "worst last" off the insertion order of the object
literal in `apps/viewer/viewer.js`. That order is the whole of the severity
rule, and it is the one thing the new pairing does not check:
`tests/test_js_python_vocabulary.py`'s comparison is
`set(expected) == set(actual)` (see the assert in
`test_the_js_status_table_spells_exactly_what_python_enumerates`), so any
permutation of the three keys is green.

**Measured** in `review/viewer_study_verdicts_and_gaps` by reordering
`VA.VERDICTS` to `fail, marginal, pass` (a plausible edit — alphabetical, or
"worst first" to match how the CSS block below it is written):

* `venv-win/Scripts/python.exe -m pytest -q tests/test_js_python_vocabulary.py`
  → **13 passed**
* `node apps/viewer/run_tests.cjs --repo C:\workspace\tolstack` → **367/367
  passed**

...while `worstVerdict` now returns the *best* verdict. Two live studies have
two checks each — `pitch_system_end_stop_minus7` and
`pitch_system_end_stop_plus72`, both `marginal` + `pass` — so with the reversed
order each rolls up as **PASS** on the nav rail and at the head of the totals
strip. A study with a marginal check reporting a clean pass is the exact
misreading the rollup badge was added to prevent.

Nothing catches it downstream either: the `[real]` nav test asserts only that
at least one `.tvverdict--fail`, `--pass` and `--none` exist somewhere on the
rail, and with 11 fails and 4 passes live that still holds.

**Fix shape:** a fast-tier unit test on `VA.worstVerdict` — `["pass","fail"]` →
`fail`, `["marginal","pass"]` → `marginal`, `["pass"]` → `pass`, `[]` → `null`,
an unknown word ignored. Three assertions, no data. An order-sensitive variant
of the Python pairing would also work but is the heavier change, and the ranking
is a JS behaviour, so it belongs in the JS tier.

**Related:** `tolerance_stack/stack.py`'s `VERDICTS` docstring now records the
order as load-bearing and points here.
