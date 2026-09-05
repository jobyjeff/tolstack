---
priority: high
depends_on: []
---

# HANDOFF 2026-09-04 — endstop_retrace_acquired_docs: the 23 acquisition-blocked endstop rows are now answerable — trace them

Source: Jeff exported the acquisition list from the endstop vision baseline
(`docs/sessions/lessons/LESSONS_20260831_endstop_vision_baseline.md`, "Left
for the next session") on 2026-09-04. The endstop/mechanical-stroke stacks
are now Jeff's real deliverables (2026-09-03 note), so this trace directly
feeds them. Baseline: `integration`; the endstop ground truth is
`C:\workspace\tolstack\data\inbox\tolerance_stacks\260825_End_Stop_JC.xlsx`
+ `docs/tolerance_stacks/WORKSHEET_endstop_vision_baseline.md` (the 43-row
scoring — read its §3 row dispositions before anything else). Scope: spec
library (`data/inbox/specs/` reads + parse events + projection), endstop
worksheet/gap-list docs, tests; do NOT touch `apps/viewer/` (owned by
`dag_viewer_vertical_budget` / `viewer_consolidation`) and do NOT modify
`data/inbox/` contents (append-only; the files below are already there).

## What just landed (verified on disk 2026-09-04)

- **drawing-checker** `C:\workspace\drawing-checker\data\inbox\drawings\`
  (read-only from here; COPY nothing — cite by absolute path per the
  baseline's precedent): `215071-C.pdf` (pitch arm — rows 23, 27, 30),
  `215175-A.pdf` (tangential link mount), `215176-002-A.pdf` (lower gas
  spring body), `214700-002-A.pdf` (piston body — **owns row 39, the row
  that names the end stop itself**), `212956-005-A.pdf` (pitch/anti-rotation
  link), `216231 B.1 HUB AND BLADE ASSEMBLY, PROPELLER.pdf` (restores the
  severed balloon chain), `217262-A.pdf` (nutplate carrier).
  **Revision alert:** the baseline cited 215071-001 and 216231-001 by part
  number; what landed is 215071 at rev **C** and 216231 at rev **B.1** —
  record the revision actually read on every citation, and if a value
  changed across revisions from what the workbook assumed, that is a
  *finding*, not a nuisance.
- **this repo** `data/inbox/specs/`: `NAS1151- NAS1158.PDF` (covers the
  baseline's NAS1154 ask) and `trelleborg_aerospace_gb_en.pdf` — the
  workbook's mystery "TB" bushing catalog is **Trelleborg**; confirm that
  identification from the workbook's own usage before citing it as such.

## Deliverables

1. **Spec-library intake for the two specs** (`spec-parse/v0` events +
   projection rebuild, per `docs/spec_library/README.md`): the values the
   endstop rows actually need, read with the three-outcome discipline —
   value / demonstrable absence / unreadable. Never a licence to infer.
2. **Re-trace the acquisition-blocked rows.** The worksheet scored 23 of 43
   rows blocked on document acquisition; each of those whose owning document
   is in the list above moves to exactly one of: **traced** (value +
   `source_ref` with doc, sheet/page, zone/section, revision), **measured
   absence** (read for, demonstrably not there — cite where you looked), or
   **still blocked** (owner not among the exports — name what's missing).
   Update the worksheet/gap list in place with dated correction blockquotes
   (insert-only discipline for imported text) or a successor section —
   follow the worksheet's own conventions.
3. **Report the new traced ratio** (the repo's headline number, defined
   solely in the SOP — compute, don't restate the rule) before/after, and
   the per-row disposition table in the lesson.
4. **Feed the 3D-annotation evidence base**: every *measured absence* on a
   drawing that is in hand and fully read is a row only 3D can answer —
   count them explicitly; that number goes straight into the annotation MVP
   case (locked brief `dispatch/docs/strategy/HANDOFF_20260904_3d_annotation_strategy.md`).

## Method (from the baseline lesson — don't rediscover)

- `tests/debug_trace_stack_values.py` (drawing-checker's venv for `fitz`) is
  the reading entry point: `--toc`, `--pattern`, `--crop`. Cite the printed
  border zone. Pass `-X utf8` to the interpreter.
- **Run a page-count pass over every document first** (the baseline nearly
  scored the hub on 2 of its 7 sheets).
- Value-only matching produces confident garbage — identify the feature,
  not the number (the 0.12 composite-frame case is the worked example).
- The general-tolerance block is per-drawing, never universal (215735-A is
  ISO-2768-mK); score convention-derived values as their own category.
- F4/F5 (possible double-count rows 32/37; row 51 vs the released drawing)
  are **Jeff questions** — do not resolve them by fiat; note if the new
  documents bear on them.
- Drawing-checker read-only invariant: snapshot with
  `scripts/snapshot_drawing_checker.py` before and after (the script, not an
  ad-hoc find — the baseline's correction explains why), diff must be EMPTY.

## Definition of done

- Every one of the 23 acquisition-blocked rows has a new, cited disposition;
  the worksheet and gap list reflect them; traced ratio reported
  before/after.
- Spec-library events committed for both specs with value-level tests on a
  sample of parsed values.
- Suite green (`venv-win/Scripts/python.exe -m pytest -q`; from a worktree
  the venv is `C:\workspace\tolstack\venv-win\Scripts\python.exe`). Expect
  the provenance-row guard to fire on any imported-doc table edit — amend
  `PROVENANCE.md` accordingly.
- Lesson: the disposition table, the new traced ratio, the
  measured-absence count for the 3D case, the Trelleborg identification
  verdict, and any revision-drift findings (215071 C, 216231 B.1).
