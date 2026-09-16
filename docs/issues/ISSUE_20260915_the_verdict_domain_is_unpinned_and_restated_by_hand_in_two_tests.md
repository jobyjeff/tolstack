---
type: bug
priority: low
status: resolved
area: tolerance_stack
reporter: agent
found_by: docs/sessions/HANDOFF_20260915_viewer_study_verdicts_and_gaps.md
handoff: docs/sessions/HANDOFF_20260916_python_value_and_schema_pins.md
resolution: handoff completed 2026-09-16 -- closed automatically by dispatch when handoff `python_value_and_schema_pins` moved to completed/; not independently verified.
---

# `VERDICTS` was minted to end the inline copies, and the two inline copies are in the tests

`viewer_study_verdicts_and_gaps` (2026-09-15) added the module constant
`VERDICTS = ("pass", "marginal", "fail")` to `tolerance_stack/stack.py`, for the
reason `CONFIDENCES`, `SOURCE_REF_KINDS` and `ELEMENT_ROLES` were each added
before it: a field vocabulary is a module-level constant, never a literal
(`CLAUDE.md`, and `docs/prompts/REVIEW_AGENT.md`'s vocabulary-drift log). Two
literals survive, in the tests:

* `tests/test_tolerance_stack.py:243` —
  `assert got.verdict in ("pass", "marginal", "fail")`, one line above
  `assert got.verdict_scope in VERDICT_SCOPES`, which *does* import its tuple.
* `tests/test_tolerance_stack.py:311` — the same literal, on `as_dict()`'s row.

The docstring on the new constant also claimed a pin that does not exist:
*"`tests/test_tolerance_stack.py` pins that it can return nothing else."* Those
two assertions each check **one constructed check**; neither enumerates what
`verdict` can return. The sentence was corrected in
`review/viewer_study_verdicts_and_gaps` to say what is actually true and to
point here.

**Fix shape:** import `VERDICTS` at both sites, and add the test the docstring
wanted — construct checks that land on each of the three words (the repo
already has all three live: 4 `pass`, 3 `marginal`, 11 `fail` across the
topology projection) and assert `verdict` is always a member. Small, and it is
what makes "a fourth verdict must gain a branch" a checkable claim rather than a
comment.
