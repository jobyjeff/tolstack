---
priority: med
depends_on: []
---

# HANDOFF 2026-08-12 — js_python_vocabulary_pairing: assert the viewer's status tables spell what Python enumerates

Source: triage sweep 2026-08-12, routing
`docs/issues/ISSUE_20260812_no_test_pairs_the_js_status_tables_with_the_python_vocabularies.md`
(`chore`, `med`). Raised by `viewer_export_and_material_provenance` in its
lesson. Baseline: trunk after `viewer_export_and_material_provenance` and
`viewer_fixture_shape_guards` merged (both 2026-08-12). Scope: `tests/` —
specifically `tests/test_sop_vocabulary.py` or a sibling. You may **read**
`apps/viewer/viewer.js` and the `tolerance_stack/` modules; do **not** modify
either. `tolerance_stack/thermal.py` is owned by the dependent
`material_cte_optional` handoff.

## The gap

Two enumerated vocabularies are defined in Python and hand-copied into
JavaScript. Nothing compares the two sides.

| vocabulary | Python | JavaScript |
|---|---|---|
| `source_ref.export.status` | `SourceExport`, `tolerance_stack/stack.py` (2 values: `established`, `unestablished`) | `VA.EXPORT_STATUSES`, `apps/viewer/viewer.js:202` |
| `materials[].material.values_status` | `MaterialEntry.__post_init__`, `tolerance_stack/thermal.py:135` — the literal tuple `("inline", "library", "not_transcribed")` | `VA.VALUES_STATUSES`, `apps/viewer/viewer.js:352` |

The JS tables are the *right shape* — total functions with a loud fallback, and
`VALUE_GUARDS` in `apps/viewer/tests.js` asks the viewer's own table rather than
copying a list, which is the strong form. But that guard is driven by **live
data**, so it only fires once a value Python emits actually reaches
`data/projections/viewer/`. Two failures it cannot see:

- **A value Python can emit but no stack has yet.** `library` (a `values_status`)
  and `unestablished` (an `export.status`) have **zero** live instances today. A
  rename or a fourth value is invisible until data moves, and the first symptom
  is the loud `unlabelled` block on a real reader's screen.
- **A spelling drift in the JS copy.** `not_transcribed` vs `not-transcribed`
  fails no test until an entry uses it.

This is the overlay's *"a vocabulary lives in three places"* entry with a fourth
place added, and no mechanised pairing for it.

## Deliverables

1. **A Python test that reads `apps/viewer/viewer.js`, extracts the keys of the
   two `VA.*_STATUSES` object literals, and asserts set equality against the
   Python enumerations.** It is a text scan of one file, in the repo that owns
   the vocabularies, and it fails without needing any live data to move.

   `tests/test_sop_vocabulary.py` is the natural home and the precedent: its
   docstring already documents three sightings of exactly this drift and says
   that pinning a vocabulary in *a third copy* is the weak form, so the module
   reads the source of truth instead. Follow that. If the file's SOP focus makes
   it a poor fit, a sibling module is fine — say which you chose and why.

2. **Take the Python side from the definition, not from a fourth copy.** For
   `values_status` that means reading the tuple at `thermal.py:135` (or
   refactoring it to a module-level constant the test imports — a small
   production change, allowed, and arguably the better answer). For
   `export.status` it means the `SourceExport` definition in `stack.py`. A test
   that hard-codes `{"inline", "library", "not_transcribed"}` on the Python side
   is the same defect the test exists to catch, one layer up.

3. **Decide how much JS parsing is enough, and say so.** Extracting object-literal
   keys from JavaScript with a regex is fragile; a comment containing
   `something:` inside the literal, or a key added via `VA.EXPORT_STATUSES.foo =`
   elsewhere, defeats it. Suggested direction (investigate, don't assume):
   anchor on the `VA.<NAME>_STATUSES = {` line, scan to the matching brace at the
   same indent, and take identifiers at one nesting level. **Assert the extraction
   itself** — e.g. that exactly two tables were found and each yielded a non-empty
   key set — so a silently-empty scan cannot pass as agreement. An extractor that
   finds nothing and compares `set() == set()` is a guard that cannot fail.

## Definition of done

- The new test is **demonstrated failing**: temporarily add a fourth value to the
  Python `values_status` tuple, show the test goes red naming it, revert. Then
  temporarily misspell a key in `VA.VALUES_STATUSES`, show it goes red, revert.
  Both directions, because they are different bugs. This repo's universal check
  (`has this guard been seen to fail?`) is not optional here — the handoff exists
  because a live-data-driven guard could not fail.
- The empty-extraction guard from deliverable 3 is likewise shown failing (point
  the extractor at a name that does not exist; the test must fail, not pass
  vacuously).
- Full suite green. State which checkout produced the number — the
  `hardware_counts_doc_guard` review's N1 finding was a suite line that didn't
  say.
- Lesson (`docs/sessions/lessons/LESSONS_20260812_js_python_vocabulary_pairing.md`):
  which extraction approach you took and what it cannot see; whether you moved
  the `thermal.py` tuple to a named constant; and whether there is a *third*
  hand-copied vocabulary anywhere in `apps/viewer/` that this test should also
  cover (`VA.CROP_RULES` is the obvious candidate — check it and say yes or no,
  don't leave it unasked).
