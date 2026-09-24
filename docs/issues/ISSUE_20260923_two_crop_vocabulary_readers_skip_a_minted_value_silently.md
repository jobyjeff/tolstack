---
type: bug
priority: low
status: open
area: scripts/js_vocabulary.py
reporter: agent
found_by: docs/sessions/reviews/REVIEW_20260923_js_vocabulary_generated_from_python.md
---

# `crop_rules` and `crop_placements` skip a `resolved_by`/`located_by` they cannot resolve, where the other AST readers raise

`scripts/js_vocabulary.py`'s six AST/introspection readers are the part of the
generation that can go quietly wrong: a reader that stops seeing a word makes
the generated file short, and a short vocabulary is a viewer with no branch for
a value the builder writes. Four of the six are built against that — they
**raise** rather than skip:

* `worksheet_sources_from_source` raises on a `how` it cannot follow, on a
  3-tuple return, on no `worksheet_for` and on two of them;
* `identity_rules` raises on a `return` shape it cannot follow ("teach it the
  shape rather than letting the value drop out of the generation");
* `_values_statuses_from_source` and `study_error_names` raise on finding none.

`crop_rules` and `crop_placements` do not. Both collect only
`isinstance(value, ast.Constant)` dict values and drop everything else with no
record. Measured against a mutated copy of `scripts/build_viewer_crops.py` with
one literal replaced by a name:

```
crop_rules with "resolved_by": NEW_RULE  -> ('joint_export_run', 'source_ref_export')
live                                     -> ('joint_export_run', 'source_ref_export', 'spec_pile')
```

`crop_rules`' docstring documents the skip, but as an exemption for one known
*forwarding* site (`"resolved_by": resolved["resolved_by"]`, which re-emits a
value rather than minting one). The exemption is written by **shape**, not by
site, so it also covers a future site that genuinely mints.

## Why it is `low`, and what it still costs

Removing an existing word is loud — the regenerated file would differ from the
tracked one and `test_the_generated_vocabulary_module_is_up_to_date` goes red.
The silent case is narrow: a **new** rule or placement minted through a variable
or a call. Then the reader never sees it, the generated file is unchanged, the
byte comparison is green, `VA.CROP_RULES` is not taught the word, and the crop
pane falls through to its unlabelled arm — the same four-day unexplained
`resolved_by` the `CROP_PLACEMENTS` comment in `apps/viewer/viewer.js` says that
table exists to prevent.

Neither reader has a can-fail test of its own; nor does `identity_rules`, which
does at least raise. The three AST readers that are tested
(`tests/test_js_vocabulary_is_generated.py` §4) are the three that were hardest
to write, which is the usual reason coverage lands where it does.

## Fix

1. In `crop_rules` and `crop_placements`, raise on a `resolved_by`/`located_by`
   value that is not a string constant, with the same message shape
   `identity_rules` uses. For that raise to be safe, `crop_rules` has to exclude
   the one real forwarding site **by site** rather than by shape, the way
   `crop_placements` is already scoped to `locate()`. Note that scoping it to
   `resolve_pdf` alone would *drop* a word: the three mint sites live in **two**
   functions — `resolve_pdf` (`spec_pile`, `joint_export_run`) and
   `pdf_from_export` (`source_ref_export`, which `resolve_pdf` returns through)
   — and the forwarding site is in a third, `_crop_from_citation`. Excluding
   `_crop_from_citation` is the one-name version.
1b. While there: `crop_rules`' docstring and its registry `where` string both
   say "the `resolved_by` literals in `resolve_pdf`", and that `where` is
   rendered into `apps/viewer/vocab.gen.js` as the pointer a reader follows to
   the owner. One of the three words is not there. Name both functions.
2. Add the can-fail tests, for those two and for `identity_rules`, against text
   rather than a file on disk (the `*_from_source` split the other readers use).
