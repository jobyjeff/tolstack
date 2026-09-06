---
type: review
handoff: endstop_retrace_acquired_docs
reviewer: agent (review/endstop_retrace_acquired_docs)
date: 2026-09-04
verdict: APPROVE
blockers: 0
---

# Review — `endstop_retrace_acquired_docs`

Handoff: `docs/sessions/active/HANDOFF_20260904_endstop_retrace_acquired_docs.md`,
branch `handoff/endstop_retrace_acquired_docs` (single commit `c2ae7c6`, cut
from `integration` at `0749492`). Deliverable: re-trace the 23 rows
`WORKSHEET_endstop_vision_baseline.md` scored blocked on document acquisition
against seven newly-exported drawing-checker drawings and two newly-arrived
specs (NAS1151-1158, Trelleborg aerospace), add spec-library events for the two
specs, and report the traced-ratio delta.

**Verdict: APPROVE. 0 blockers, 0 should-fix, 1 nit** (an overlay entry added,
not a defect in the work). This is not a tolerance stack — no `stack_*.json`
was touched — so the seven mandatory checks are addressed via their
spec-library/worksheet analogues, per this repo's checklist for that case.

The work is unusually strong on the one thing this repo actually reviews for:
every load-bearing citation I re-derived resolved exactly as claimed, against
the real PDFs, including two citations whose transcription task was
genuinely hard (a photocopy-OCR standard and a 344-page catalog with an
offset printed-page numbering scheme).

---

## The mandatory checks (spec-library / worksheet analogues)

### 1. Every tolerance traces to a specification or drawing callout

Re-derived independently, not trusted from the lesson. I re-rendered/re-searched
every document this handoff cites, using drawing-checker's
`tests/debug_trace_stack_values.py` from its own venv:

- **`215071-C.pdf` sh2 zone F8** (`⌀64.030 +0.030/0.000`, row 23) — confirmed
  present, exact digits. **Note:** a literal regex search for `64\.03` returns
  **zero hits** on this document because the CAD export puts one character per
  text span (`'6 4 . 0 3 0 + 0 . 0 3 0'`); I had to dump the raw zone text to
  see it. Logged as a new entry in this repo's review overlay so the next
  reviewer doesn't mistake that for a bad citation.
- **`215071-C.pdf` sh2 zone E9/E10** (`⌀4.826 ±0.010`, countersink, position
  frame, row 30) — confirmed exact.
- **`212956-005-A.pdf`** — both spherical bearings' `.1900 BORE ID` callouts
  confirmed (the mating-dimension identity argument in §8a).
- **`215176-002-A.pdf`**'s parts list resolving to `213668-002`, and
  **`213668-002 A.1...pdf` zone B12** (`76.86 ±0.10`, row 41, the one row moved
  to `traced`) — confirmed exact.
- **`214700-002-A.pdf`** — general-tolerance block `X.XX = ±0.10` (row 38),
  and zone D5 `5.00 ±0.05` (row 39) — both confirmed exact.
- **`NAS1151- NAS1158.PDF`** — rendered the actual TABLE I page (this
  document's text layer is OCR garbage, correctly flagged as such and not
  used for any value). Every one of NAS1154's eleven transcribed columns
  (head diameter, gage diameter, shank diameter, washer-face thickness, head
  height, recess depth/diameter, grip-length shoulder, fillet radius, overall
  length) matches the rendered table cell-for-cell, including the two
  columns (`shank_diameter` vs `gage_diameter`) the author deliberately chose
  between and recorded the rejected alternative for.
- **`trelleborg_aerospace_gb_en.pdf`** — the section heading ("Table I Turcon
  Slydring... Piston and Rod Bearing") is on PDF page 239 (printed footer
  237); the footer that literally reads "239" is on PDF page 241 — both
  confirmed by direct render/search, exactly reproducing the claimed +2
  printed-page offset and the workbook's "catalog p~239" match. The bearing
  exposure formula and the "0.127 mm minimum" recommendation on PDF page 242
  are also confirmed verbatim.

Confidence labels are honest throughout: numeric mismatches are scored
`mismatch` (not silently reconciled to the workbook), a strong-but-unconfirmed
identity is `candidate` (not rounded up to `traced`), and the Trelleborg
figure that cannot be reproduced without a dash-number choice the workbook
doesn't state is left as a registered `absence` with `closed_by` naming what
would close it — not guessed. No invented numbers found anywhere in this
handoff.

### 2–6. Signs, LMC/MMC, RSS, nominal-in-range, cotter/castellation quantisation

**N/A** — no `StackElement`, `Term`, `fold()` or `checks` array in this
handoff; nothing here computes anything. No cotter/castellation hardware is
newly in scope.

### 7. Traced ratio

Re-derived myself, not copied from the lesson:

- `venv-win/Scripts/python.exe tests/debug_report_tolerance_stacks.py --ratio`,
  run in the main checkout **before** merging this handoff: **5 traced / 3
  inferred / 18 untraced of 26** (seeded), **30 traced / 9 inferred / 20
  untraced of 59** (all stacks) — matches the lesson's "unchanged" claim
  exactly, which is correct: no `stack_*.json` is touched by this commit.
- This worksheet's own internal count (not a SOP-defined ratio, but the
  number this handoff's deliverable actually moves) re-derived from the §8b
  per-row table, independently of §8f's own arithmetic: 23 rows in the
  per-row table split 1 `traced` (row 41) + 1 `convention-traced` (row 38) +
  7 `mismatch` (23, 30, 33, 35, 49, 53, 55) + 2 `candidate` (27, 39) + 12
  `still blocked` (31, 42, 45, 52, 59, 62, 34, 36, 50, 54, 56, 63) = 23. Feeding
  those into §3a's prior 43-row breakdown reproduces §8f's table exactly:
  `traced` 4→5, `convention-traced` 0→1, `mismatch` 3→10, `candidate` 8→10,
  `gap` 28→17, located 15/43→26/43. No stale-count defect found.

---

## Also verified

- **Tests.** Merged `handoff/endstop_retrace_acquired_docs` into this review
  branch (one conflict, in `PROVENANCE.md` — two sibling handoffs
  (`stack_export_tabular` and this one) each appended an "Amended again
  2026-09-04" clause to the same README.md provenance cell; resolved
  additively, keeping both clauses in date order, nothing removed). Full suite
  green post-merge: **602 passed, 1 skipped** (the pre-existing node-fs
  viewer skip, worktree-only). Re-ran after resolving the conflict.
- **Guard can-fail.** Mutated `shank_diameter.max` in the new NAS1154 event and
  confirmed `test_nas1154_shank_diameter_is_the_functional_fastener_size`
  goes red with the mutated value; reverted (`git checkout --`) and confirmed
  clean before finishing.
- **Drawing-checker read-only invariant.** Took my own before/after snapshot
  with `scripts/snapshot_drawing_checker.py` (5767 entries both times) —
  **diff EMPTY** for my own review session, on top of the tactical session's
  own reported before/after (5651→5767, 116 added, explained in the lesson as
  drawing-checker's own eager-ingestion pass, not this session's doing).
- **Schema hygiene.** Both new `spec-parse/v0` events use only registered
  `subject_kind` values (`family`, `part_number` — both in `SUBJECT_KINDS`),
  the `Absence` shape matches `name`/`why`/`closed_by`, and
  `ALL_EVENT_FILES`/library-subjects/document-set assertions were all extended
  to match.
- **`data/inbox/specs/` and `data/inbox/drawings/`** untouched (append-only;
  confirmed by the empty drawing-checker diff and by this handoff writing no
  files under `data/`).
- **`docs/reference/`, `ARCHITECTURE.md`, `apps/viewer/`** — untouched by
  `c2ae7c6`, correctly: no new module, no viewer-visible field.
- **Intake queue.** `docs/spec_library/intake_queue.json` correctly not
  touched — its `rows` reference only the three SOP stacks' own gaps, and
  neither new spec closes one of those today; the lesson's reasoning for not
  extending `test_the_queue_holds_every_row_the_pitch_link_lesson_ranked`'s
  hardcoded range is sound.
- **Insert-only / append-only disciplines** — `PROVENANCE.md`'s row is
  amended (not rewritten), the worksheet's new material is a new §8 plus two
  short pointer blockquotes at the superseded sections (§3a, §4b), not an edit
  of the old figures.

## Findings

None that rise to should-fix or blocker. One nit, addressed by me, not left
for anyone:

- **nit** — the text-layer-per-character-span trap (`215071-C.pdf`,
  `213668-002`) that cost this review a false "zero hits" moment is new to
  this repo's checklist. Added as a third sighting under the existing "A text
  layer is a locator, not a reading" overlay entry
  (`docs/prompts/REVIEW_AGENT.md`), rather than filed as an issue — it is
  reviewer-workflow guidance, not a defect in the handoff.

## Note for the next reviewer

This handoff's own internal worksheet count (§8f, the `located`/`gap` split)
has no `_counts()`-style function backing it the way the SOP's traced ratio
does — nothing mechanises it, same gap noted after `endstop_graft_workorder`.
I re-derived it by hand from the §8b per-row table and it reproduces exactly;
a future re-trace of this worksheet should do the same rather than trust the
table's own footer arithmetic.
