---
type: chore
priority: med
status: open
area: tests/vocabulary
reporter: agent
found_by: docs/sessions/reviews/REVIEW_20260918_visual_rules_nothing_checks.md
---

# `CONFIDENCE_TOKENS` is a hand-copy of `VA.CONFIDENCES`, and the guard it parametrizes goes SILENT — not red — when it drifts

`visual_rules_nothing_checks` (2026-09-18) added
`tests/test_app_type_scale.py::test_no_rule_keys_on_a_confidence_token_alone`,
a good guard: it was observed reddening on the real mutation
(`.chip.conf--untraced { color: #fff;` → `.conf--untraced { color: #fff;`) and
it states as a *rule* the legibility regression `design_pass_typography` had
found as an instance. The finding is not about what it checks; it is about the
list it checks against.

```python
CONFIDENCE_TOKENS = (
    "conf--traced", "conf--inferred", "conf--untraced", "conf--no_source_ref",
    "conf--unknown",
)
```

That is `["conf--" + c for c in VA.CONFIDENCES] + ["conf--unknown"]`, written
out by hand. The docstring says exactly that — *"the tokens
``VA.confidenceClass()`` builds (``viewer.js``: ``"conf--" + confidence``, over
``VA.CONFIDENCES`` plus the ``unknown`` fallback)"* — so the derivation is
documented and then not performed. Nothing pairs the copy to its source.

## Why this one is worse than the average hand-copy

**The drift direction is fail-quiet.** Add a fifth word to `VA.CONFIDENCES` —
the repo has done this once already, `no_source_ref` — and
`VA.confidenceClass()` starts emitting `conf--<new>`. A stylesheet rule
`.conf--<new> { color: #fff; font-weight: 700 }` is then the *exact* defect this
guard exists to catch, and the guard cannot see it, because the token is not in
the tuple. The test still passes. That is the "a check whose scope structurally
excludes the defect is silent in exactly the case it was written for" shape from
the canonical review checklist, and it is the one direction a stale copy should
never fail in.

Compare the sibling copy in the same handoff,
`scripts/run_viewer_browser_tests.mjs`'s fill census:

```js
const MAY_FILL = ["conf--untraced", "conf--no_source_ref", "verdict", "tvverdict"];
```

That is `VA.UNVERIFIED_CONFIDENCES` prefixed, plus two verdict tokens, and it is
also unpaired — but it fails *loudly*: a new unverified word that is filled
shows up as an overspend and reddens the census. Worth fixing for tidiness;
`CONFIDENCE_TOKENS` is the one that matters.

## The seam already exists

`tests/test_js_python_vocabulary.py` already reads this exact array out of
`apps/viewer/viewer.js` with `js_array_strings`, and already carries a
`("CONFIDENCES", js_array_strings, python_projection_confidences, …)` row
pairing it against `scripts/build_viewer_projection.py`'s
`PROJECTION_CONFIDENCES`. So the fix is not new machinery:

- derive `CONFIDENCE_TOKENS` from `js_array_strings(viewer_js, "VA.CONFIDENCES")`
  plus the documented `unknown` fallback, **or**
- keep the literal and add a test pairing it against that extractor, which is
  this repo's established shape ("one named tuple plus a test pairing the prose
  against it", `CLAUDE.md`).

The `unknown` fallback is not in `VA.CONFIDENCES` and has to come from
`VA.confidenceClass`'s own body — that is the only part needing thought, and
`test_js_python_vocabulary.py`'s `VA.needsAnnotation` precedent (a vocabulary
that had to be lifted out of a function body before it could be paired) is the
worked example.

## Why `med`

Green today, and the guard does its job on all four live words. It is `med`
rather than `low` because the whole point of the handoff that added it was
"a rule nothing checks", and an unpaired vocabulary is the repo's own
most-repeated defect class — `CLAUDE.md` names it as such, and
`ISSUE_20260918_va_joint_export_key_is_a_twelfth_hand_copy_of_a_python_constant_that_the_pairing_module_cannot_see`
is the open sibling.
