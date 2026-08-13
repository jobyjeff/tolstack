---
type: chore
priority: med
status: open
area: tolerance_stack / apps/viewer
reporter: agent
---

# `VA.CONFIDENCES` is a fourth hand-copied vocabulary, and there is no single Python definition to pair it against

`js_python_vocabulary_pairing` (2026-08-12) mechanised three vocabularies in
`tests/test_js_python_vocabulary.py` by reading each one's Python **definition**:

| JS table | Python definition |
|---|---|
| `VA.EXPORT_STATUSES` | `EXPORT_STATUSES`, `tolerance_stack/stack.py:69` |
| `VA.VALUES_STATUSES` | the membership test in `MaterialEntry.__post_init__`, `thermal.py:135` |
| `VA.CROP_RULES` | the `resolved_by` literals in `scripts/build_viewer_crops.py` |

`VA.CONFIDENCES` (`apps/viewer/viewer.js:67`) is the fourth of the same kind and
**could not be added**, because unlike the three above it has no definition to
read. What exists instead:

- `tolerance_stack/stack.py:263` — `confidence: str = "untraced"` with the
  vocabulary in an end-of-line **comment** (`# traced | inferred | untraced`).
  `SourceRef` validates `kind` against a whitelist and does **not** validate
  `confidence` at all: `SourceRef(kind="drawing", confidence="banana")`
  constructs.
- `tolerance_stack/spec_library.py:66` — `CONFIDENCES = ("traced", "inferred", "untraced")`, a real constant, but the spec library's own.
- `scripts/build_viewer_projection.py:74` — `CONFIDENCE_ORDER = ["traced", "inferred", "untraced"]`, a third copy, used for ordering and counting.
- `build_viewer_projection.confidence_of_ref` **synthesises a fourth value**,
  `no_source_ref`, that none of the three lists contains. It is a real projection
  value: `VA.CONFIDENCES` carries it, `worst_confidence` ranks it, and
  `count_confidence` counts it.

So the viewer's four-value list is `CONFIDENCE_ORDER` + one synthesised literal,
and any test pairing them has to name at least two sites and special-case the
synthesised value — which is the "pin it in a third copy" defect the pairing
tests exist to avoid.

## Why this matters now rather than eventually

`no_source_ref` has **zero live instances**. The 48 elements in
`data/projections/viewer/results.json` are 21 `traced` / 7 `inferred` /
20 `untraced`; every element in the repo carries a `source_ref`. The
`VALUE_GUARDS` block in `apps/viewer/tests.js` asks the viewer's own table (the
strong form) but runs on live data, so it cannot see a rename or a misspelling of
`no_source_ref` — exactly the blind spot that got
`ISSUE_20260812_no_test_pairs_the_js_status_tables_with_the_python_vocabularies`
filed for the other three. And `no_source_ref` is the loudest state on the
surface: the label is `NO CITATION`.

## Suggested direction

1. Give the vocabulary **one** definition — a `CONFIDENCES` constant in
   `tolerance_stack/stack.py` that `SourceRef.__post_init__` validates against, the
   way `kind` already is. That makes `confidence="banana"` a construction error
   instead of a value that reaches the viewer and renders `conf--unknown`.
2. Have `spec_library.CONFIDENCES` and `build_viewer_projection.CONFIDENCE_ORDER`
   read that constant rather than restate it (order is a separate concern from
   membership; the order list can be asserted to *cover* the vocabulary).
3. Decide where `no_source_ref` belongs. It is a **projection** value, not a
   citation value — no `SourceRef` can carry it — so it likely wants a named
   constant beside `confidence_of_ref` rather than membership in the citation
   vocabulary.
4. Then add the pairing to `tests/test_js_python_vocabulary.py`. The extraction
   side needs nothing new: `js_object_keys` reads object literals, and
   `VA.CONFIDENCES` is an **array**, so it needs a small sibling extractor for
   array elements — a few lines, and the existing anti-vacuity assertions apply
   unchanged.

Step 1 is the load-bearing one; step 4 is cheap once a definition exists.
