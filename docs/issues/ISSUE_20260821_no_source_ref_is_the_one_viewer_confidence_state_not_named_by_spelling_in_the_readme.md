---
type: chore
priority: low
status: open
area: docs / apps/viewer
reporter: agent
handoff: docs/sessions/HANDOFF_20260819_enumerated_state_doc_guard.md
---

# `no_source_ref` is the one viewer confidence state not named by its code spelling in `apps/viewer/README.md`

Found while building the enumerated-state doc guard
(`tests/test_tolerance_stack.py::test_every_enumerated_viewer_state_is_named_in_a_live_document`,
`enumerated_state_doc_guard`). That guard only covers `VA.EXPORT_STATUSES` and
the `values_status` check, per its handoff's scope — it does not check
`VA.CONFIDENCES` / `PROJECTION_CONFIDENCES`, `VA.CROP_RULES` or
`VA.IDENTITY_RULES`. Checking those by hand against
`tests/test_js_python_vocabulary.py`'s extractors:

* `VA.CROP_RULES` (`source_ref_export`, `spec_pile`, `joint_export_run`) — all
  three named by spelling in the "Hover crops" table.
* `VA.IDENTITY_RULES` (`spec_pile_filename`) — named by spelling ("Which bytes
  the number was read off" table and "The spec-pile exception").
* `VA.CONFIDENCES` / `PROJECTION_CONFIDENCES` (`traced`, `inferred`,
  `untraced`, `no_source_ref`) — the first three are named by spelling in
  "Reading the colours". **`no_source_ref` is not.** It renders as the label
  `NO CITATION` (`viewer.js` line 73: `no_source_ref: "NO CITATION"`), and that
  label is the row a reader sees ("filled magenta `NO CITATION` | worse than
  untraced: no `source_ref` at all"), but the code spelling `no_source_ref`
  itself appears nowhere in the file.

This is a real name mismatch, not a formatting variant the doc guard's
underscore-to-space normalisation would already catch (`no_source_ref` vs.
`NO SOURCE REF` is a spacing difference; `no_source_ref` vs. `NO CITATION` is a
different word entirely — a deliberate label choice, most likely, since
"no citation" reads better to a viewer user than "no source ref" — but nothing
records that this label and that code value are the same thing for a reader
who greps the code for `no_source_ref` and lands nowhere in the README).

Not fixed here: this handoff's scope is the guard and its own two vocabularies,
and it explicitly says not to restructure the live documents beyond what the
guard's failing-then-passing demonstration needs.

## Suggested fix

Add the code spelling to the `NO CITATION` row, e.g. "worse than untraced: no
`source_ref` at all (code: `no_source_ref`)" — one clause, no restructuring.
