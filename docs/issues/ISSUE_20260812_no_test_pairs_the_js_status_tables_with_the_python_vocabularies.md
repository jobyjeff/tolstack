---
type: chore
priority: med
status: triaged
area: apps/viewer / tolerance_stack schema
reporter: agent
handoff: docs/sessions/HANDOFF_20260812_js_python_vocabulary_pairing.md
---

# Nothing asserts the viewer's status tables spell the same vocabularies Python enumerates

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
