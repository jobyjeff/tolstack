---
priority: low
depends_on: []
---

# HANDOFF 2026-09-01 — thermal_exception_declared: the "never combines" rule learns about its own exception, and a test enforces the list

Source: strategy session 2026-09-01 consuming
`docs/strategy/BRIEF_20260826_thermal_never_combines_invariant.md` (carries
`docs/issues/ISSUE_20260821_architecture_says_thermal_py_never_combines_two_element_values.md`).
Decision made there: **option 1 — state the exception in the rule itself.**
`workbook_corner()`'s own argument stands: a material corner is a
single-valued evaluation of one point, not a fold over a band, and routing
it through `fold()` would be ceremony that creates the second arithmetic
path the repo refuses. The defect is only that ARCHITECTURE.md's
"Where computation may live" section states an absolute its own module
inventory already contradicts in prose two sections earlier.

Baseline: trunk at launch. Scope: `ARCHITECTURE.md`'s "Where computation may
live" section, `tolerance_stack/thermal.py` (comments/docstring only — no
behavior change), one new test. Do NOT touch: `tolerance_stack/stack.py` /
`fold()`, the viewer, anything owned by active `endstop_vision_baseline`.

## Deliverables

1. **Amend the rule.** "Where computation may live" states the invariant
   conditionally and completely: nothing outside `fold()` combines element
   values, **except the sites on the declared exception list**, currently
   exactly `workbook_corner` (a comparison-only reader, deliberately not
   routed through `fold()` — one line of why, pointing at its docstring for
   the full argument). Keep the module-inventory row and the docstring
   consistent with the new wording; the three passages must tell one story.
2. **The enforcement test** (the brief's own recommendation, build it
   regardless): walk `thermal.py` for arithmetic combining two
   `StackElement` values and require every such site to be on a declared
   exception list — mirroring
   `tests/test_tolerance_stack.py::test_fold_is_still_the_only_arithmetic_and_still_never_reads_lmc_or_mmc`
   (line ~180) and the `test_architecture_inventory.py` prose-vs-tree
   pairing precedent. The exception list is a module-level named constant
   (this repo's vocabulary rule), and the ARCHITECTURE.md wording is paired
   against it so neither can drift alone.
3. **Observed failing** (review checklist rule): in a scratch copy, add a
   second combining site to `thermal.py` and show the test names it; remove
   `workbook_corner` from the list and show the test fails on the existing
   site.
4. **Close the issue**: set the ISSUE file's frontmatter
   `status: resolved`, one line pointing here.

## Definition of done

- The three passages (rule section, inventory row, docstring) agree; suite
  green (a docs change turning a pairing test red-then-fixed is the design
  working).
- The new test demonstrated failing both ways per item 3.
- Lesson (`docs/sessions/lessons/LESSONS_20260901_thermal_exception_declared.md`):
  how the walker detects "combines two element values" (AST shape chosen)
  and any sites it deliberately ignores.
