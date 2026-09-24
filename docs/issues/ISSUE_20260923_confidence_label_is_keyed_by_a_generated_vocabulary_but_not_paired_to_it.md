---
type: bug
priority: med
status: open
area: apps/viewer
reporter: agent
found_by: docs/sessions/reviews/REVIEW_20260923_js_vocabulary_generated_from_python.md
---

# `VA.CONFIDENCE_LABEL`'s keys are the generated `CONFIDENCES` vocabulary, hand-spelled two lines below `VOCAB.list("CONFIDENCES")`

`js_vocabulary_generated_from_python` (2026-09-23) routed every per-value table
whose key set is a Python-owned vocabulary through `VOCAB.table(name, entries)`,
so the key set is compared against the generated words **at load**.
`VA.CONFIDENCE_LABEL` (`apps/viewer/viewer.js:69`) is exactly that shape and was
not converted, and it is not in the lesson's "deliberately did NOT take" list
either — so the judgement, if there was one, is not written down anywhere:

```js
VA.CONFIDENCES = VOCAB.list("CONFIDENCES");   // viewer.js:67 -- generated

VA.CONFIDENCE_LABEL = {                        // viewer.js:69 -- hand-keyed
  traced: "traced",
  inferred: "inferred",
  untraced: "UNTRACED",
  no_source_ref: "NO CITATION",
};
```

Its four keys are `scripts/build_viewer_projection.py`'s
`PROJECTION_CONFIDENCES`, word for word. Nothing pairs them: the byte comparison
only covers `vocab.gen.js`, and the chain scan in
`tests/test_js_python_vocabulary.py` reads this table but never compares it to
Python.

## What goes wrong

A fifth confidence added in Python regenerates `vocab.gen.js`, so `VA.CONFIDENCES`
grows and every table that went through `VOCAB.table` refuses to load until it is
taught the word. `VA.CONFIDENCE_LABEL` does not: every one of its thirteen indexed read sites
is `VA.CONFIDENCE_LABEL[x] || x`, so the page silently falls back to printing the
**raw machine word** at a reader — `no_source_ref` where the label says
`NO CITATION`. That is the "an internal id in user-facing copy" shape the repo
already rules out for every web surface, arrived at by omission rather than by
choice, and it is the one direction generation was supposed to make
inexpressible.

No regression: the table was equally unpaired before 2026-09-23. What changed is
that it is now the **only** confidence-keyed table in the viewer that is not, and
it sits three lines from the one that is.

## Fix

`VA.CONFIDENCE_LABEL = VOCAB.table("CONFIDENCES", { ... });` — a one-line change
with no new words. It is a behaviour change (the page would refuse to load rather
than degrade), which is why the reviewer filed it instead of applying it: that is
the same call the handoff made for `VA.VERDICTS` and the other nine, and it wants
the author's argument, not the reviewer's.

While there: `VA.NAV_VERDICT_LEVELS` (`apps/viewer/topology.js:705`) is a
**composition** — `stack.py`'s `VERDICTS` plus `none` and `error` — the same
shape as `AA.BINDING_STATES`, which the lesson does name as having no single
owner. It needs no generation, but it deserves the sentence beside it that
`AA.BINDING_STATES` got.
