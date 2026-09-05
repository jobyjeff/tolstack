---
handoff: stack_export_tabular
date: 2026-09-04
---

# Lessons — stack_export_tabular

## CSV vs. `.xlsx`: investigated, CSV wins, and the repo had already decided

The handoff asked for this to be investigated rather than assumed. It was, and
the answer is CSV — but it is worth recording that this repo effectively
already made the call, twice: `requirements.txt`'s "deliberately nothing else"
comment and `tests/debug_dump_tol_stack_xlsx.py`'s header note both explain why
a stdlib zip/XML reader beat adding `openpyxl` for the one existing xlsx tool
here. The same reasoning holds for a *writer*: this export's data is flat
(element rows + a short totals block), the special characters that break naive
CSV (`⌀`, `±`, `µ`) are handled by `utf-8-sig`, and nothing here needs multiple
real sheets, cell number formatting, or formulas — the things that would
actually justify the dependency. If a future cert-artifact request needs a
literal `.xlsx` (a specific number format, a frozen header row, a second real
sheet rather than a blank-line-separated block), that is the trigger to revisit
this, not "Excel would be nicer."

## The one judgment call: what "one row per element" means for sign/coefficient

A `StackElement` carries no `sign`/`coefficient` — those live on `Term`, which
only exists inside a path's or check's term list, and the handoff still asked
for a `sign`/`coefficient` column on the element row. For a **study** this
isn't ambiguous: a topology chain (`traverse()`) uses every selected edge's
dimension exactly once, so its sign and transform ratio are unambiguous. For a
plain **stack**, I resolved it by scanning checks first (file order), then
paths, and taking the first sign/coefficient found per element id, recorded in
a `term_context` column (`"check:<id>"` / `"path:<id>"`) so a reader can see
where it came from rather than trusting an unexplained number. No seeded stack
actually has an element enter two checks with different signs, so this
resolves all of them identically to "the element's one true sign" — but the
tie-break is there and tested
(`test_sign_and_coefficient_come_from_a_check_before_a_path`) in case a future
stack does. **What a future "copy as TSV" viewer button should reuse**: this
exact function, `element_term_context()` in `export_stack_tabular.py` — it is
the one place that answers "what sign does this element enter with," and a
viewer grid re-deriving that itself would be a second place for the same
question to get a different answer.

## Why `no_source_ref` was deliberately NOT reused here

`build_viewer_projection.py` mints a synthesized confidence word,
`no_source_ref`, for an element with no citation at all, and that word is
explicitly kept out of `tolerance_stack.stack.CONFIDENCES` (ARCHITECTURE.md
explains why: no real `SourceRef` can carry it). I considered borrowing it for
the export's `confidence` column and decided against it: it is a
projection-specific rendering decision, importing it here would put the same
magic string in a second module (the exact vocabulary-drift shape
CLAUDE.md warns about), and an empty cell in a spreadsheet already reads as
"nothing here" without inventing a new word for it. No seeded element is
actually uncited, so this is untested against real data — a synthetic
`dataclasses.replace(..., source_ref=None)` case covers it instead.

## Why there is no `projection_provenance.guard()` call, unlike the viewer builders

Worth restating because it looks like an omission on a first read of the repo's
convention: the guard exists to stop two worktrees racing to overwrite the
*one* `data/projections/viewer/*.json` everyone reads. This script reads the
committed stack/topology JSON directly and writes wherever `--out`/`--out-dir`
points — a new file per invocation, never a shared canonical one — so there is
nothing for an ancestry gate to protect. It still calls
`projection_provenance.stamp()`, but only for the branch/sha/dirty header the
artifact's own traceability requirement (deliverable 3) asked for. This is also
why `scripts/export_stack_tabular.py` reads oddly in ARCHITECTURE.md's
`projection_provenance.py` row ("all five projection writers") despite not
writing a projection at all — the row now says so explicitly, rather than
letting a reader assume it does.

## Left to do / follow-ups

- Nothing filed to `docs/issues/` — no off-task defect was found while working
  this handoff.
- The `--all` mode writes one CSV per stack; it does not also walk
  `docs/topologies/study_*.json` in bulk. Nothing in the handoff asked for a
  study equivalent of `--all`, and the seeded studies are few enough that
  naming each is not a burden yet.
