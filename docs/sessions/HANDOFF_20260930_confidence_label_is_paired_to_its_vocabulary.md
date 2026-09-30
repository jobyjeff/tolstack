---
priority: med
depends_on: []
model: sonnet
---

# HANDOFF 2026-09-30 — confidence_label_is_paired_to_its_vocabulary: the one confidence-keyed table the generation pass missed

Source: `docs/issues/ISSUE_20260923_confidence_label_is_keyed_by_a_generated_vocabulary_but_not_paired_to_it.md`
(`med`, `bug`, `area: apps/viewer`). Baseline: tolstack trunk at the 2026-09-30
triage sweep — nothing to merge this pass, trunk and `integration` were already
level. Scope: `apps/viewer/viewer.js`, `apps/viewer/topology.js` and the
vocabulary tests. Do NOT touch `scripts/build_viewer_projection.py`'s
`PROJECTION_CONFIDENCES` — the Python side is correct and is the owner.

## The gap

`js_vocabulary_generated_from_python` (2026-09-23) routed every per-value table
whose key set is a Python-owned vocabulary through `VOCAB.table(name, entries)`,
so the key set is compared against the generated words **at load**.
`VA.CONFIDENCE_LABEL` (`apps/viewer/viewer.js:69`) is exactly that shape, was not
converted, and is **not** in the lesson's "deliberately did NOT take" list — so
the judgement, if there was one, is written down nowhere:

```js
VA.CONFIDENCES = VOCAB.list("CONFIDENCES");   // viewer.js:67 -- generated
VA.CONFIDENCE_LABEL = {                        // viewer.js:69 -- hand-keyed
  traced: "traced", inferred: "inferred",
  untraced: "UNTRACED", no_source_ref: "NO CITATION",
};
```

Its four keys are `PROJECTION_CONFIDENCES`, word for word. Nothing pairs them:
the byte comparison covers only `vocab.gen.js`, and the chain scan in
`tests/test_js_python_vocabulary.py` reads this table but never compares it to
Python.

**What goes wrong.** A fifth confidence added in Python regenerates
`vocab.gen.js`, so `VA.CONFIDENCES` grows and every `VOCAB.table` refuses to
load until taught the word. `VA.CONFIDENCE_LABEL` does not: all **thirteen**
indexed read sites are `VA.CONFIDENCE_LABEL[x] || x`, so the page silently
prints the **raw machine word** at a reader — `no_source_ref` where the label
says `NO CITATION`. That is the "internal id in user-facing copy" shape this
repo already rules out for every web surface, arrived at by omission rather than
by choice, and it is the one direction generation was supposed to make
inexpressible.

No regression: the table was equally unpaired before 09-23. What changed is that
it is now the **only** confidence-keyed table in the viewer that is not, and it
sits three lines from one that is.

## Deliverables

1. **Make the call the reviewer deliberately left to you, and argue it.**
   The fix is one line — `VA.CONFIDENCE_LABEL = VOCAB.table("CONFIDENCES", {…});`
   with no new words — but it is a **behaviour change**: the page would refuse
   to load rather than degrade to the raw word. The reviewer filed rather than
   applied it precisely because that is the same call the original handoff made
   for `VA.VERDICTS` and nine others, and it wants the author's argument, not
   the reviewer's. Make it, implement it, and write the argument down. If you
   decide *against* converting, that is a legitimate outcome — but then the
   "deliberately did NOT take" list must gain this table and the reason, because
   the defect this issue reports is the *absence of a recorded judgement*, not
   the spelling.

2. **Give `VA.NAV_VERDICT_LEVELS` the sentence it is owed.**
   `apps/viewer/topology.js:705` is a **composition** — `stack.py`'s `VERDICTS`
   plus `none` and `error` — the same shape as `AA.BINDING_STATES`, which the
   09-23 lesson names as having no single owner. It needs no generation; it
   needs the same beside-it sentence saying why, so the next reader does not
   re-open this question.

3. **Sweep for a third.** Two of these were found by review rather than by a
   check. Before you finish, look for any remaining table in the viewer or
   annotator whose key set is a Python-owned vocabulary and is neither generated
   nor annotated. If you find one, fix or annotate it here; if you find none,
   say so — that is the useful negative result.

## Definition of done

- `VA.CONFIDENCE_LABEL` is either paired to the generated vocabulary or
  explicitly and durably recorded as a deliberate exception, with the argument.
- `VA.NAV_VERDICT_LEVELS` carries its owner-less-composition note.
- Deliverable 3 is answered either way.
- The viewer tier and the vocabulary tests are green:
  `node apps/viewer/run_tests.cjs --repo .` and
  `venv-win/Scripts/python.exe -m pytest -q tests/test_js_python_vocabulary.py`,
  plus the full `venv-win/Scripts/python.exe -m pytest -q`.
- Lesson (`docs/sessions/lessons/LESSONS_20260930_confidence_label_is_paired_to_its_vocabulary.md`):
  which way you called deliverable 1 and why; and whether a *check* could have
  found this table rather than a reviewer — the 09-23 pass converted ten tables
  and missed this one, so the selection step itself is unwitnessed.
