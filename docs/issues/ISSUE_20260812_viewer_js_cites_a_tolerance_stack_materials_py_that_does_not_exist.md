---
type: chore
priority: low
status: open
area: apps/viewer
reporter: agent
---

# `viewer.js` sends the reader to `tolerance_stack/materials.py`, which does not exist

`apps/viewer/viewer.js:343`, the comment introducing `VA.VALUES_STATUSES`:

```js
  // Where a material entry's CTE actually comes from
  // (tolerance_stack/materials.py). Enumerated, so it gets a table for the same
  // reason `export.status` does ...
```

There is no `tolerance_stack/materials.py`. The module holding `MaterialEntry`
and the `values_status` vocabulary is **`tolerance_stack/thermal.py`** (the
membership test is at `thermal.py:135`); the package is `__init__.py`,
`__main__.py`, `spec_library.py`, `stack.py`, `thermal.py`.

Small, but it is the same class of drift the viewer's own comments keep warning
about: the comment's whole job is to tell the next reader where the enumeration
is defined, and it names a file they will not find. The neighbouring
`VA.EXPORT_STATUSES` comment gets it right (`tolerance_stack/stack.py`), so this
reads as a copy that was never re-checked rather than a rename.

Fix: change the pointer to `tolerance_stack/thermal.py`. One line, no behaviour.

Found by `js_python_vocabulary_pairing` (2026-08-12) while reading the two tables
to pair them with their Python definitions. Filed rather than fixed: that handoff's
scope is `tests/` and explicitly forbids modifying `viewer.js`. Note
`tests/test_js_python_vocabulary.py` now names the real location in its own
failure message, so a reader who hits the guard is pointed at the right file — the
stale comment is the only remaining wrong pointer.
