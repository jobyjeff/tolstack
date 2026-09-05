---
priority: med
depends_on: []
---

# HANDOFF 2026-09-04 — stack_export_tabular: export stacks to spreadsheet files from the projection, not the DOM

Source: Jeff, 2026-09-04: he sometimes needs stacks in Excel — to share with
others, for cert documentation/artifacts, and as insurance ("if the tolstack
buildout takes longer than expected I might need to bail out and move back to
excel to get some initial results"). Strategy's recommendation, which he asked
for an opinion on: a **deterministic export script from the stack/projection
JSON** beats making the HTML table copy/paste-friendly — the data is already
structured, the DOM is a rendering. (The viewer grid is separately being made
three-column and more paste-friendly by `viewer_consolidation`; these are
complements, and that handoff owns the viewer — do NOT edit `apps/viewer/`
here.) Baseline: `integration`. Scope: a script + tests + a short doc note.

## Deliverables

1. **`scripts/export_stack_tabular.py`** (name at your discretion, registered
   in ARCHITECTURE.md's inventory): given a stack (or `--all`, or a study),
   emit a spreadsheet-shaped file — **one row per element**, columns at
   minimum: study/stack id, element id, kind, description, part/drawing,
   **nominal / min / max as three separate columns**, sign, coefficient,
   distribution/method fields as stored, `source_ref`, `confidence`, gap/notes.
   Include the fold results (worst-case / RSS totals and check verdicts) —
   either as a summary sheet/section or a clearly-separated block, never
   interleaved with element rows. **Values come from the stored JSON and the
   one `fold()`; the exporter computes nothing itself** (design decision 1 —
   no second combiner, and an exported total must be the fold's total).
2. **Format decision, investigated then committed**: CSV/TSV is stdlib and
   opens in Excel losslessly for this data — start there. Real `.xlsx`
   (openpyxl) is a new dependency; adopt it only if something Jeff needs
   (multiple sheets, number formatting for cert artifacts) genuinely requires
   it, and record the call in the lesson. Mind Windows CSV traps: UTF-8 with
   BOM so Excel reads `⌀`/`±`/`µ` correctly (test one such value), and no
   locale-dependent number formatting.
3. **Provenance in the artifact**: the export self-identifies — stack file,
   projection tree/commit, export timestamp — as header rows or a companion
   sheet, so a cert artifact can be traced back. Follow the projection-
   provenance discipline (`projection_provenance.py`) if the export reads a
   shared projection.

## Definition of done

- Exporting the pitch-link and endstop-graft stacks produces files that open
  in Excel with min/nom/max in separate numeric columns and every element's
  `source_ref`/`confidence` visible; a `fail`/gap-bearing stack is visibly
  not-clean in the export (untraced values and gaps must survive the trip —
  the one rule).
- Value-level tests: pin exported cell values for a fixture stack against the
  stored JSON and the fold's totals; UTF-8/BOM behavior pinned; suite green.
- Lesson: the CSV-vs-xlsx call and its reasoning, and what a future "copy as
  TSV" viewer button should reuse from the column model.
