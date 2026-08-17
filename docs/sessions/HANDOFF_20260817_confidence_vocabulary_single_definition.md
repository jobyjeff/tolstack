---
priority: med
depends_on: []
---

# HANDOFF 2026-08-17 — confidence_vocabulary_single_definition: give `confidence` one definition, validate against it, then pair `VA.CONFIDENCES`

Source: `docs/issues/ISSUE_20260812_the_confidence_vocabulary_has_no_single_definition_to_pair_va_confidences_against.md`,
filed by `js_python_vocabulary_pairing` (2026-08-12) and independently confirmed at
its review. Baseline: trunk with `js_python_vocabulary_pairing` merged. Scope:
`tolerance_stack/stack.py`, `tolerance_stack/spec_library.py`,
`scripts/build_viewer_projection.py`, `tests/test_js_python_vocabulary.py`. You may
edit `apps/viewer/viewer.js` **only** if deliverable 3 requires it, and say so
explicitly if you do — the previous handoff was forbidden from touching it and that
is why this issue exists.

## What is true today

`js_python_vocabulary_pairing` mechanised three vocabularies in
`tests/test_js_python_vocabulary.py` by reading each one's Python **definition**:

| JS table | Python definition |
|---|---|
| `VA.EXPORT_STATUSES` | `EXPORT_STATUSES`, `tolerance_stack/stack.py:69` |
| `VA.VALUES_STATUSES` | the membership test in `MaterialEntry.__post_init__`, `tolerance_stack/thermal.py` |
| `VA.CROP_RULES` | the `resolved_by` literals in `scripts/build_viewer_crops.py` |

`VA.CONFIDENCES` (`apps/viewer/viewer.js`) is the fourth of the same kind and
**could not be added, because it has no definition to read.** What exists instead:

- `tolerance_stack/stack.py:263` — `confidence: str = "untraced"` with the
  vocabulary in an **end-of-line comment** (`# traced | inferred | untraced`).
  `SourceRef` validates `kind` against a whitelist and does **not** validate
  `confidence` at all: `SourceRef(kind="drawing", confidence="banana")` constructs.
  (Verified by running it, at the `js_python_vocabulary_pairing` review.)
- `tolerance_stack/spec_library.py:66` — `CONFIDENCES = ("traced", "inferred",
  "untraced")`, a real constant, but the spec library's own.
- `scripts/build_viewer_projection.py:74` — `CONFIDENCE_ORDER = ["traced",
  "inferred", "untraced"]`, a third copy, used for ordering and counting.
- `build_viewer_projection.confidence_of_ref` **synthesises a fourth value**,
  `no_source_ref`, that none of the three lists contains. It is a real projection
  value: `VA.CONFIDENCES` carries it, `worst_confidence` ranks it, `count_confidence`
  counts it, and its label on screen is **`NO CITATION`** — the loudest state on the
  surface.

## Why now rather than eventually

`no_source_ref` has **zero live instances**: the 48 elements in
`data/projections/viewer/results.json` (main checkout:
`C:\workspace\tolstack\data\projections\viewer\results.json`) are 21 `traced` /
7 `inferred` / 20 `untraced`, and every element in the repo carries a `source_ref`.
The `VALUE_GUARDS` block in `apps/viewer/tests.js` asks the viewer's own table (the
strong form) but runs on **live data**, so it cannot see a rename or a misspelling
of `no_source_ref` — exactly the blind spot that got the other three paired.

## Deliverables — in this order; 1 is load-bearing and 4 is cheap once it exists

1. **One definition.** A `CONFIDENCES` constant in `tolerance_stack/stack.py`, and
   `SourceRef.__post_init__` validates `confidence` against it the way `kind`
   already is. `confidence="banana"` becomes a construction error instead of a value
   that reaches the viewer and renders `conf--unknown`. Delete the end-of-line
   comment that currently stands in for the definition — a comment is what made this
   unpairable.
2. **`spec_library.CONFIDENCES` and `build_viewer_projection.CONFIDENCE_ORDER` read
   that constant** rather than restating it. **Order is a separate concern from
   membership**: keep the order list, but assert it *covers* the vocabulary rather
   than re-listing it.
3. **Decide where `no_source_ref` belongs, and write the reason down.** It is a
   **projection** value, not a citation value — no `SourceRef` can carry it — so the
   issue's recommendation (a named constant beside `confidence_of_ref`, *not*
   membership in the citation vocabulary) is a suggestion to investigate, not a
   requirement. Whichever you choose, `VA.CONFIDENCES` is a four-element list and the
   pairing in deliverable 4 has to account for the fourth without special-casing a
   bare literal — "pin it in a third copy" is the defect these pairing tests exist to
   avoid.
4. **Add the pairing to `tests/test_js_python_vocabulary.py`.** The extraction side
   needs one small addition: `js_object_keys` reads object literals and
   `VA.CONFIDENCES` is an **array**, so it needs an array-element sibling — a few
   lines. The existing anti-vacuity assertions apply unchanged; make sure they do
   apply (a pairing test that passes against an empty extraction is the failure this
   repo has already been bitten by).

## Definition of done

- `SourceRef(kind="drawing", document="x", confidence="banana")` **raises**, pinned
  by a test.
- Exactly one Python list of the citation confidence values exists; grep for
  `"untraced"` across `tolerance_stack/` and `scripts/` and show the result in the
  lesson.
- The pairing test reddens under a mutation (rename a value on the JS side, or on
  the Python side — do one, say which).
- Full suite green **in both checkouts** (this repo's guards differ between a
  worktree and the main checkout; the viewer's `[real]` tier needs real data).
- Lesson (`docs/sessions/lessons/LESSONS_20260817_confidence_vocabulary_single_definition.md`):
  the deliverable-3 decision and its reason, and whether any **fifth** vocabulary in
  this repo is still defined by a comment rather than a constant. That is the shape
  to look for now, not the specific list.
