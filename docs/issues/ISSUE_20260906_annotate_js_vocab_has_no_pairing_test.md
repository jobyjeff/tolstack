---
type: chore
priority: low
status: open
area: apps/annotate
reporter: agent
---

# `apps/annotate/binding_state.js`'s hand-copied vocabulary constants have no structural pairing test against `feature_identity.py`

Found in review of handoff `annotation_surface_mvp` (2026-09-06); should-fix
in `docs/sessions/reviews/REVIEW_20260906_annotation_surface_mvp.md`, not
blocking.

`apps/annotate/binding_state.js` hand-copies `feature_identity.py`'s
vocabularies as JS constants (`STACK_KEY_KINDS`, `VERDICTS`, `DIRECTIONS`,
`GDT_MODIFIERS`). `apps/viewer/viewer.js`'s equivalent vocabularies are paired
against their Python source by `tests/test_js_python_vocabulary.py`, which
this repo's own review checklist calls out as the fix shape for its
single most-repeated defect class (a vocabulary drifting between the code,
docs, and seeded data). `binding_state.js` has no such pairing.

The handoff's own lesson discloses this as a deliberate scope cut (size of
the rest of the handoff), and `apps/annotate/run_tests.cjs` does check the
JS constants' *values* against the lesson's/docstring's prose -- which
catches a value-level drift (e.g. a typo'd modifier letter) but not a
structural one (a new Python vocabulary word added to `feature_identity.py`
with no matching JS literal added).

**Suggested fix:** extend `tests/test_js_python_vocabulary.py` (or a sibling
module) to pair `apps/annotate/binding_state.js`'s four constants against
`tolerance_stack/feature_identity.py`'s `STACK_KEY_KINDS`/`VERDICTS`/
`DIRECTIONS`/`GDT_MODIFIERS`, the same shape used for `apps/viewer/viewer.js`.
