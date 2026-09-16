---
type: chore
priority: med
status: triaged
area: tolerance_stack
reporter: agent
found_by: docs/sessions/HANDOFF_20260915_viewer_study_verdicts_and_gaps.md
handoff: docs/sessions/HANDOFF_20260916_python_value_and_schema_pins.md
---

# `CheckResult.margin` — the number the DAG page publishes — has no Python test pinning its value

`viewer_study_verdicts_and_gaps` (2026-09-15) added `CheckResult.margin`
(`tolerance_stack/stack.py`), the signed worst-case distance to the criterion,
and put it in `as_dict()` so both projections carry it and the DAG page prints
it beside every verdict. No test in `tests/` asserts a `margin` value.

**Measured** in `review/viewer_study_verdicts_and_gaps`: changing the property
to `return self.interval.max - 0.0` — the wrong end of the interval, which for
a budget check is the *most permissive* corner rather than the binding one —
leaves `venv-win/Scripts/python.exe -m pytest -q` at **886 passed / 1 failed**,
the failure being the pre-existing unrelated
`test_every_byte_identity_claim_in_a_live_file_names_its_verification`.

Why the existing net misses it:

* `test_the_l1_studys_projected_check_matches_check_study_field_for_field`
  (`tests/test_topology_projection.py`) now builds its expectation with the
  builder's own `B.rounded_check(...)`, so it compares the projection against
  the same code that produced it. That is the right call for the *rounding*
  rule (see the handoff's lesson §2), but it means the test cannot see a wrong
  `margin` rule at all.
* The only pin on a margin *value* is a rendered-string assertion in the JS
  `[real]` tier (`has(out, "margin -8.1939 mm at worst case")`), which reads
  the **built projection file**. So it fires only after somebody manually
  re-runs `scripts/build_topology_projection.py` — the guard lives one artifact
  and one language away from the rule.

This matters more than a typical missing test because of the repo's own
binding-end rule (`docs/prompts/REVIEW_AGENT.md`, mandatory check 2 and the
`grip_budget__*` entry): which end of a budget check's interval is the
requirement is a question this repo has already got wrong once in prose, by
0.708 mm, with every folded value correct and every test green.

**Fix shape:** two assertions in `tests/test_tolerance_stack.py` beside the
existing verdict tests — `margin == interval.min` for the pitch-link budget
check at its published `-8.1939`, with the source cell reference in a comment,
and `pytest.raises(NotImplementedError)` for a criterion other than `">= 0"`
(the `verdict` gate has never had that test either).
