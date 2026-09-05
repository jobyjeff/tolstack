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

## Sign/coefficient per element: got it wrong first, review caught it with a live example

A `StackElement` carries no `sign`/`coefficient` — those live on `Term`, which
only exists inside a path's or check's term list, and the handoff still asked
for a `sign`/`coefficient` column on the element row. For a **study** this
isn't ambiguous: a topology chain (`traverse()`) uses every selected edge's
dimension exactly once, so its sign and transform ratio are unambiguous.

For a plain **stack** the first version of this script scanned checks (file
order), then paths, and took the **first** sign/coefficient found per element
id — reasoned as "no seeded stack actually has an element enter two checks with
different signs." That claim was false and disprovable with the repo's own
data, and review caught it two ways: `stack_pitch_link_to_pitch_plate.json`'s
`clamped_stack_sourced` path is added (`+1`) in `shank_out__11_sourced_only` and
subtracted (`-1`) in `cotter_hole_clear_of_sourced_stack` — one stack, no
archetype tricks needed — and the `thermal_fit` archetype's generated checks
give the same sleeve-bore element opposite signs at its two stages whenever
`0 < k < 1`, true of both seeded chains. "First hit wins" silently dropped the
second occurrence in both cases — exactly the kind of quiet omission this
repo's one rule exists to catch, in the tool meant to help catch it.

The fix: `element_occurrences()` collects **every** occurrence per element
(checks first, then paths for anything no check reaches), and
`group_occurrences()` collapses that to one row per **distinct**
`(sign, coefficient)` pair rather than one row per element. An element every
check agrees on still gets exactly one row (unchanged for every ordinary
grip-stack element); an element checks disagree on gets one row per
disagreement, each tagged with which check(s) produced it in `term_context`.
Tested directly against both live examples above
(`test_element_referenced_by_two_checks_with_opposite_signs_gets_two_rows`,
`test_thermal_fit_element_with_stage_dependent_sign_gets_multiple_rows`), not
just against the mechanism in the abstract. **What a future "copy as TSV"
viewer button should reuse**: `element_occurrences()` and `group_occurrences()`
in `export_stack_tabular.py` — they are the one place that answers "what
sign(s) does this element enter with," and a viewer grid re-deriving that
itself would be a second place for the same question to get a different
answer (and a second place to make this exact mistake).

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
