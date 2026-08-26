---
priority: high
depends_on: []
---

# HANDOFF 2026-08-25 — endstop_graft_workorder: draft the slice of Jeff's end-stop stack into Chao's Hardstop-tol sheet

> **⚠ INTERACTIVE EXCEPTION (HITL), 2 items:** (1) **Chao's workbook is not
> in the repo.** Jeff: export Chao's newer sheet (the one whose 'Hardstop
> tol' tab has a bottom section he asked you to fill —
> Slack DM `DCZLYHUMV`, ts `1787157744.699089`) into
> `C:\workspace\tolstack\data\inbox\tolerance_stacks\` as
> `260825_Hardstop_tol_Chao.xlsx` + PROVENANCE.md entry. Agent: until it
> lands, work entirely on deliverable 1 (parse + structure Jeff's workbook) —
> that's most of the value anyway. (2) The final graft is a **proposal for
> Jeff's review**, never sent to Chao by an agent — eager-until-one-way-door;
> the send is Jeff's.

Source: strategy session 2026-08-25 (Jeff's atomic notes
`20260825T153610_xyrwgw` + `20260825T175146_eocnel`): Chao asked Jeff to
extract a portion of Jeff's older, very large hand-built end-stop tolerance
stack and graft it into Chao's newer sheet — careful attention-to-detail
work: verify currency, find the right slice boundary, fill the rows. This is
the agent-draft ("shadow") attempt. Baseline: trunk `master`. Scope: a new
analysis under `docs/tolerance_stacks/` + worksheet; do NOT touch the viewer
(parallel `stack_viewer_layout_v2`) and do NOT start the from-drawings
derivation of this joint (that's the parked "task B" vision baseline —
explicitly out of scope here; this workorder works from the WORKBOOKS).

## Inputs (absolute main-checkout paths; worktree `data/` is empty)

- **Jeff's ground truth**: `C:\workspace\tolstack\data\inbox\tolerance_stacks\260825_End_Stop_JC.xlsx`
  (present, 16,479 bytes, saved 2026-08-25). It has **no PROVENANCE.md entry
  yet — write one** (first deliverable, 2 lines: source = Jeff's hand-built
  end-stop stack, saved 2026-08-25 from his files).
- **Chao's sheet**: HITL item 1 above.
- **Parser**: `tests/debug_dump_tol_stack_xlsx.py` (stdlib zipfile+XML; dumps
  formulas AND cached values in one pass; mind its documented shared-formula
  trap — a cell with `<f t="shared" si=.../>` has no formula text of its own).

## Deliverables

1. **Structured read of Jeff's workbook**: parse `260825_End_Stop_JC.xlsx`
   fully (all sheets), reconstruct the stack structure — contributors, each
   row's nominal/tolerances, formulas, and any part/drawing references in
   text — into a worksheet document (`WORKSHEET_end_stop_graft.md`) with a
   table per sheet. Flag every row whose provenance is only "the workbook
   says so" (`untraced` by SOP vocabulary — this workbook predates the SOP;
   expect most rows to be untraced, that's fine and worth counting).
2. **Currency check, best-effort**: where a row names a part/drawing that
   exists in `C:\workspace\tolstack\data\inbox\drawings\` or in
   drawing-checker's structured extractions
   (`C:\workspace\drawing-checker\data\` — read-only, absolute path), check
   whether the drawing's current value still matches Jeff's row; report
   match/mismatch/couldn't-check per row. Do not silently "update" anything.
3. **The slice + graft proposal** (needs Chao's sheet): identify which of
   Jeff's rows correspond to the empty bottom section of Chao's 'Hardstop
   tol' tab, propose the slice boundary (state the physical joint boundary
   in words, not just row numbers), and produce the fill as a CSV matching
   Chao's column layout + a mapping table (Chao row ← Jeff row(s), with
   transformation notes where units/conventions differ). Put the CSV under
   the main checkout's `data\runs\<run-id>\` and reference it from the
   worksheet.
4. **Discrepancy ledger**: everything Jeff must look at before sending —
   currency mismatches, ambiguous slice choices, rows in Chao's section with
   no counterpart in Jeff's workbook (and vice versa).

## Definition of done

- Worksheet exists with the full structured read + (if Chao's sheet landed)
  slice proposal + CSV + mapping + discrepancy ledger; PROVENANCE entries for
  both workbooks.
- Full suite green; any new parsing helper follows the repo's stdlib-only
  rule (no openpyxl — requirements.txt documents why).
- Lesson: shared-formula/parse traps hit, the untraced-row count (the
  measure of how far a workbook-only stack is from SOP-grade), and your
  read on whether the graft draft is usable-as-rough-draft vs
  redo-by-hand — Jeff calibrates the shadow program on that verdict.
