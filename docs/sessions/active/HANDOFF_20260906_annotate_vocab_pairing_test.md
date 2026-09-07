---
priority: low
depends_on: []
---

# HANDOFF 2026-09-06 — annotate_vocab_pairing_test: pair `binding_state.js`'s hand-copied vocabulary constants against `feature_identity.py`

Source: `docs/issues/ISSUE_20260906_annotate_js_vocab_has_no_pairing_test.md`
(should-fix in `docs/sessions/reviews/REVIEW_20260906_annotation_surface_mvp.md`,
non-blocking, deliberate scope cut of that handoff). Baseline: trunk, with
`annotation_surface_mvp` merged. Scope: `tests/test_js_python_vocabulary.py`
(or a new sibling test module) and read-only reference to
`apps/annotate/binding_state.js` / `tolerance_stack/feature_identity.py`. Do
NOT edit `binding_state.js` itself unless the new test finds a real drift —
this handoff is about adding the missing structural test, not the app.

## Deliverable

1. **Extend `tests/test_js_python_vocabulary.py` (or a sibling module) to
   structurally pair `apps/annotate/binding_state.js`'s four hand-copied
   vocabulary constants — `STACK_KEY_KINDS`, `VERDICTS`, `DIRECTIONS`,
   `GDT_MODIFIERS` — against `tolerance_stack/feature_identity.py`'s
   same-named vocabularies**, using the same pairing shape this test module
   already uses for `apps/viewer/viewer.js`'s equivalent constants. The gap
   this closes: `apps/annotate/run_tests.cjs` already checks the JS
   constants' *values* against lesson/docstring prose (catches a typo'd
   modifier letter) but nothing catches a *structural* drift — a new
   vocabulary word added to `feature_identity.py` with no matching JS literal
   added.
2. **Run it against current `binding_state.js` and `feature_identity.py` and
   fix any real drift the new test surfaces** — this is a should-fix from a
   real review, not a hypothetical, so treat a red result from the new test
   as a genuine finding to fix in `binding_state.js`, not a test bug.

## Definition of done

- New pairing test exists, covers all four constants, and is green against
  current code (after fixing any drift it finds).
- Full suite green (`venv-win/Scripts/python.exe -m pytest -q`).
- Lesson (`docs/sessions/lessons/LESSONS_20260906_annotate_vocab_pairing_test.md`):
  whether the new test found any real drift and what was fixed, or that it
  was clean on first run.
