---
priority: low
depends_on: []
---

# HANDOFF 2026-08-31 — endstop_vision_baseline: task B — can an agent derive the end-stop stack from drawings alone? (calibrated baseline, expected to fail)

Source: `C:\workspace\dispatch\docs\strategy\drafts\DRAFT_3d_annotation_surface.md`
("Parked here: the end-stop vision baseline (task B)") — staged 2026-08-31
because its ground truth now exists. Baseline: trunk. Scope: this repo's
`data/` outputs + one worksheet + lesson; read-only everywhere else
(drawing-checker's tree is READ-ONLY — snapshot-count its
`data/inbox/drawings/` + `data/runs/` before and after, per the
fastener_stack_shadow lesson's discipline).

## What this is — an experiment, not a deliverable

A **calibrated capability baseline**: attempt to derive the end-stop
tolerance stack from the drawings alone — 217755 **sheet 3, SECTION E** (the
"behemoth": dozens of contributors, tightly packed, most part nominals only
in 3D CAD). It is EXPECTED to fail; the product is the precise record of
WHERE it fails. Its breakage list is the requirements input for the
3D-annotation-surface MVP (the draft above). Do not polish the stack; polish
the failure record.

## Protocol (binding, in order)

1. **Written prediction FIRST.** Before opening the drawing: write
   predictions into the worksheet — expected element count, which elements
   will be derivable from 2D faces, which will dead-end (and why: missing
   nominal? cross-sheet balloon chase? view interpretation?). Commit this
   section before the attempt so it can't be revised in hindsight.
2. **Capped attempt.** Derive the stack from the drawing exports in
   `C:\workspace\drawing-checker\data\inbox\drawings\` (newest 217755
   export; absolute main-checkout path) + existing drawing-checker run crops.
   Follow the repo SOP (cite-or-gap: NO training-data spec recall — every
   value cites a drawing zone/spec or is an explicit gap). Cap: one focused
   pass, no more than ~a session's honest effort on the derivation itself;
   when an element dead-ends, record the dead-end and move on — grinding is
   contrary to the experiment.
3. **Score against ground truth**:
   `C:\workspace\tolstack\data\inbox\tolerance_stacks\260825_End_Stop_JC.xlsx`
   (Jeff's hand-built rollup) and its transcribed worksheet
   (`endstop_graft_workorder`, 2026-08-25 — 43 element instances; note its
   caveats: rows 26/57 provisional, row 68 inclusion question, F1 pitch-
   condition ambiguity — score against what the sheet SAYS, flag where the
   sheet itself is uncertain rather than guessing its intent). Score =
   per-element: found/missed, value match/mismatch, correctly-identified
   gap.
4. **Breakage taxonomy** (the actual deliverable): classify every failure —
   view interpretation, cross-sheet balloon chasing, nominal absent from 2D
   (which part file would have it), sensitivity/motion-ratio needed, other.
   These categories map straight onto the 3D-annotation draft's requirements.

Optional variant arm (only if Jeff has dropped CAD section-view screenshots
with per-component colors into `data/inbox/tolerance_stacks/` — check, don't
ask): repeat the attempt against those instead of/alongside the drawing; the
tradeoff to observe is no balloons on the colored view.

## Definition of done

- Prediction section committed before the attempt (verifiable in git
  history).
- Worksheet with: predictions, attempt results, per-element score table,
  breakage taxonomy with counts.
- Drawing-checker read-only snapshot diff: EMPTY.
- Full suite green (this handoff should add no code; if a small scoring
  helper is worth keeping, it lives in `tests/debug_*` per convention).
- Lesson (`docs/sessions/lessons/LESSONS_20260831_endstop_vision_baseline.md`):
  prediction vs outcome (calibration), the taxonomy totals, and a direct
  paragraph addressed to the 3D-annotation brief: "what the surface must do
  that 2D provably cannot."
