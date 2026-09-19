---
type: bug
priority: low
status: triaged
area: apps/viewer
reporter: agent
handoff: docs/sessions/HANDOFF_20260918_reader_facing_surfaces_second_pass.md
found_by: docs/sessions/HANDOFF_20260916_reader_facing_copy_and_vocabulary.md
---

# The materials table says `values_status`, `library_ref` and `materials.json` to the reader — and the new surface guard cannot see it

`reader_facing_copy_and_vocabulary` (2026-09-16) widened the banned-string walk
to the stack-side surfaces and added a scan for the schema's own field names.
Both now cover `views/stack.js`'s materials table. It is green — **because no
live or fixture material entry reaches the branches that would fail it**, not
because the branches are clean.

## The strings

All in reader-facing copy, all naming a schema field or an internal filename:

| Where | What it renders |
|---|---|
| `apps/viewer/viewer.js`, `VA.VALUES_STATUSES.inline.text()` | *"CTE transcribed INLINE in **materials.json** — …"* |
| `apps/viewer/viewer.js`, `VA.VALUES_STATUSES.library.text()`, loud arm | *"**values_status** says this CTE resolves through the spec library and the entry names NO **library_ref** …"* |
| `apps/viewer/viewer.js`, `VA.unlabelledValuesStatusText()` | *"**values_status** "…", which this viewer has no branch for …"* |
| `apps/viewer/views/stack.js`, the `mat-row__libref` line | *"**library_ref**: spec_library:NAS6403U11D"* |
| `apps/viewer/views/stack.js`, the loud chip | *"**VALUES_STATUS** UNKNOWN"* |

`values_status` and `library_ref` are both keys in the projection, so the new
field-name scan *would* flag every one of them. It does not, because:

* the `library` loud arm needs an entry with `values_status: "library"` and a
  null `library_ref` — a self-contradiction the schema permits and no live entry
  has;
* `unlabelledValuesStatusText` needs a `values_status` outside the vocabulary,
  which `tests/test_js_python_vocabulary.py` exists to make impossible;
* `mat-row__libref` needs `library_ref` set on a **material** entry. The one
  promoted `library_ref` in this repo is on a *hardware* entry
  (`NAS6403U11D`, `docs/tolerance_stacks/hardware_entries.json`); every one of
  the six live material entries on the two thermal stacks carries
  `values_status: null` and `library_ref: null`, checked 2026-09-16. So the
  line has never rendered anywhere.

That is the same live-data blind spot `tests/test_js_python_vocabulary.py`'s
module docstring is about, one layer over: a guard driven by data can only fire
on data that exists.

## Why it is `low` and why it is a judgement, not an obvious fix

There is a real argument for these strings. This surface's audience is the stack
*author*, the sentence's whole job is to say **which field to go and fix**, and
`values_status` is the field. Jeff's rule — *"no internal file/module names in
user-facing copy"* — was written about a reader being shown machinery they
cannot act on, and an author who is about to edit `materials.json` can act on
this.

So this needs a decision, not a rewrite: either these five strings are the
argued exception (and the guard needs an allowlist entry that says so in a
comment, the shape item 4 of that handoff used), or they get the treatment
`VA.fieldLabel` gave the free-form blocks — *"values status"*, *"the spec
library reference"* — and the fields are named only in a hover.

## Repro

There is no live repro for any of the five. Seed a material entry with
`values_status: "library"` and `library_ref: null` and the loud arm renders;
give one a non-null `library_ref` and the `mat-row__libref` line renders; give
one a `values_status` outside the vocabulary and `unlabelledValuesStatusText`
renders. `VA.VALUES_STATUSES.inline.text()` needs only
`values_status: "inline"`, which no live material entry has either — all six
carry `null`.

## What would catch it if it were decided the other way

Nothing that exists. A guard over `VA.VALUES_STATUSES`' own `text()` outputs —
called with a synthesised entry per branch rather than waiting for live data —
is the shape; the same trick would reach every other total-function table in the
viewer whose loud arms no live row exercises.
