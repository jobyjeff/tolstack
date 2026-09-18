---
type: chore
priority: med
status: open
area: tests/vocabulary
reporter: agent
found_by: docs/sessions/reviews/REVIEW_20260918_real_tier_red_and_the_skipping_tier.md
---

# `VA.JOINT_EXPORT_KEY` is a twelfth hand-copy of a Python constant, and it is a bare string, which is the one shape `test_js_python_vocabulary.py` cannot extract

`real_tier_red_and_the_skipping_tier` (2026-09-18) added, in
`apps/viewer/views/stack.js`:

```js
VA.JOINT_EXPORT_KEY = "assembly_export_ref";
```

It is a module-level constant rather than an inline literal, which is what
`CLAUDE.md`'s field-vocabulary rule asks for and what the author's own comment
cites. The other half of that rule is missing: the **definition** already exists
in Python, at `tolerance_stack/stack.py:305`, spelled identically —

```python
JOINT_EXPORT_KEY = "assembly_export_ref"
```

— and nothing pairs the two. That is the repo's most-repeated defect class
(`CLAUDE.md`, "Things that cost previous sessions time"), and the established
mechanism for exactly this Python-defines / JS-copies shape is
`tests/test_js_python_vocabulary.py`, which today pairs **eleven** vocabularies
and not this one.

## Why it is `med` and not a blocker

The drift is caught, indirectly and late. If either copy is renamed, the
viewer's `jointBlock` stops recognising the key, falls through to `kvList`, and
the `[real] no rendered stack surface ... prints an internal id, a field name, a
checksum or a workstation path` check reddens on the `sha256` label — which is
precisely how the 2026-09-18 red was found. So it fails **closed**, and loudly.
Two limits on that comfort:

- it only fires in the **main checkout**, over live stacks that carry the key
  (four of seven today), and
- it names `sha256`, not the rename — a reader gets the symptom and has to
  re-derive the cause, which is a day's work the pairing row would have saved.

## Why it is not a one-liner

`test_js_python_vocabulary.py`'s two extractors are `js_object_keys` (object
literals) and `js_array_strings` (array literals). `VA.JOINT_EXPORT_KEY` is
neither — it is a **scalar string assignment**, the first of its kind on the JS
side — so enrolling it needs a third extractor (`js_string_constant`, anchored
on `VA.<NAME> = "<value>";`) before the row can exist. That module's own
docstring already states the rule this has to respect: *never pin a vocabulary
in a third copy of it* — the test must read both sides out of their
definitions, not assert the literal `"assembly_export_ref"`.

A near neighbour that this does **not** solve, so nobody bundles them by
mistake: `topology_app.js`'s `REBUILD_DONE = "done"` is the same scalar shape
but its definition lives in **drawing-checker**
(`ISSUE_20260915_rebuild_done_constant_is_unpaired_with_drawing_checkers_
states.md`), so no in-repo extractor can ever pair it. This one has both sides
in this repo, which is what makes it fixable at all.
