---
type: chore
priority: med
status: resolved
area: apps/viewer / tolerance_stack schema
reporter: agent
handoff: docs/sessions/HANDOFF_20260812_js_python_vocabulary_pairing.md
---

# Nothing asserts the viewer's status tables spell the same vocabularies Python enumerates

> **RESOLVED 2026-08-12** by handoff `js_python_vocabulary_pairing`, in
> `tests/test_js_python_vocabulary.py`. **Three** pairings, not the two filed
> here: `VA.CROP_RULES` against the `resolved_by` literals in
> `scripts/build_viewer_crops.py` has the identical blind spot
> (`joint_export_run` has no live instance either), so it is covered too. Each
> Python side is read from its definition — `EXPORT_STATUSES` by import, the
> `values_status` vocabulary by AST off the membership check in
> `MaterialEntry.__post_init__`, the crop rules by AST off the script's dict
> literals — never re-listed in the test. The JS side is a character scanner over
> the `VA.<NAME> = {` literal that handles strings and both comment forms; keys
> attached from outside a literal are refused separately, since the scanner cannot
> see one. The extraction is asserted before anything is compared (a missing table
> raises rather than yielding an empty set), and all of it was demonstrated red
> and reverted — a fourth Python value, a hyphen misspelling in the JS copy, the
> table renamed away, and a key attached from outside.
>
> **`thermal.py` was not refactored** to a module constant, though the handoff
> allowed it: `material_cte_optional` owns that file. The test reads the check
> itself instead, and handles the constant form if that handoff introduces it.
>
> A **fourth** hand-copied vocabulary — `VA.CONFIDENCES` — could not be paired,
> because Python has no single definition of it to pair against. Filed as
> `ISSUE_20260812_the_confidence_vocabulary_has_no_single_definition_to_pair_va_confidences_against.md`.
> See `docs/sessions/lessons/LESSONS_20260812_js_python_vocabulary_pairing.md`.

Raised by `viewer_export_and_material_provenance` (2026-08-12) in its lesson;
filed here so it is visible to triage.

## What

Two enumerated vocabularies are now defined in Python and hand-copied into
JavaScript:

| vocabulary | Python | JavaScript |
|---|---|---|
| `source_ref.export.status` | `SourceExport`, `tolerance_stack/stack.py` | `VA.EXPORT_STATUSES` (`apps/viewer/viewer.js`) |
| `materials[].material.values_status` | `tolerance_stack/thermal.py` | `VA.VALUES_STATUSES` (`apps/viewer/viewer.js`) |

Nothing compares the two sides. The tables are the right shape — total functions
with a loud fallback, and `VALUE_GUARDS` in `apps/viewer/tests.js` now asks the
viewer's own table rather than copying a list, which is the strong form — but the
guard is driven by **live data**, so it only fires once a value that Python emits
reaches `data/projections/viewer/`.

## Why it matters

The two failure modes the current guards do *not* cover:

* **A value Python can emit but no stack has yet.** `library` (a `values_status`)
  and `unestablished` (an `export.status`) have **zero** live instances today.
  A rename or a fourth value on either side is invisible until data moves, and the
  first symptom is the loud `unlabelled` block on a real reader's screen.
* **A spelling drift in the JS copy.** `not_transcribed` vs `not-transcribed` in
  `VA.VALUES_STATUSES` fails no test until an entry uses it.

This is the overlay's *"a vocabulary lives in three places"* entry with a fourth
place added — the JS table — and no mechanised pairing for it.

## Suggested shape

A Python test that reads `apps/viewer/viewer.js`, extracts the keys of the two
`VA.*_STATUSES` object literals, and asserts set equality against the Python
enumerations. It is a text scan of one file, in the repo that owns the
vocabularies, and it fails without needing any live data to move.
