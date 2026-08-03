---
priority: high
depends_on: [tolstack_founding]
---

# HANDOFF 2026-08-03 — pitch_link_stack: a from-scratch tolerance stack for the pitch link → pitch plate joint, per the SOP

Source: Jeff's atomic note `20260803T153839_cwzuzq` (his proposed next
step, near-verbatim). Baseline: `tolstack_founding` merged — the SOP
(`docs/SOP_TOLERANCE_STACK.md`), the review checklist, the `tolerance_stack`
fold package, and `data/inbox/specs/` all exist in this repo. Scope: this
repo; drawing-checker is a **read-only data source**
(`C:\workspace\drawing-checker\data\runs\`, `data/inbox/drawings/`) — read
its artifacts, never import its code, never write there.

## The assignment

Build the **pitch link → pitch plate joint** grip/thread-engagement stack
from scratch, following the SOP. This joint has very similar architecture
to the tangential link → pitch plate joint analysed in slice 1, and is
visible in the *same view* of the 217755 assembly drawing — but **there is
no workbook to transcribe from this time.** That is the point: slice 1's
numbers were lifted from Jeff's xlsx (`values_status: inline`, 1 of 17
element instances traced); this session proves the workflow can source
every value honestly or name the gap.

## Deliverables

1. **The stack**, in this repo's schemas: `stack_definition/v0` (+ hardware
   entries) for the pitch link → pitch plate joint, `check_result`s (WC and
   RSS, verdict vocabulary per the SOP) computed through the
   `tolerance_stack` fold module, and a human-readable worksheet in
   `docs/tolerance_stacks/` following the slice-1 worksheets' format.
2. **Every value sourced or gapped — nothing invented.** Acceptable
   sources, in preference order: a drawing callout (drawing-checker run
   artifacts for 217755 — structured JSON, balloons, crops — cite document
   / sheet / printed zone / view / callout in `source_ref`); a spec
   datasheet in `data/inbox/specs/` (brute-force it: read the PDF, vision
   if needed — many are poor photocopies; cite file + page); the assembly
   parts list (yields `confidence: inferred` for presence/nominal, per the
   SOP). Values recalled from training data are prohibited as a source.
   Anything unobtainable becomes an explicit `gaps` entry
   (`confidence: untraced` values only where the SOP permits, loudly).
   Slice 1's ranked gap list applies here too — expect NAS-bolt grip
   tolerance / thread run-out and castellated-nut slot geometry to be the
   hard ones; if the joint is cotter-retained, the quantised-grip caveat
   must appear in the worksheet.
3. **SOP friction report.** You are the SOP's first consumer. Every place
   it was ambiguous, wrong, or silent goes in the lesson as a concrete
   proposed edit (do not edit the SOP mid-run; propose).
4. **Ready-for-review package.** When the stack is done, the work must be
   reviewable by a second agent against `docs/prompts/REVIEW_AGENT.md`
   (dispatch's review flow handles the actual review after this session —
   your job is that every checklist item is *answerable* from your
   artifacts, especially per-value source citations and the
   traced/inferred/untraced ratio).

## Definition of done

- The stack JSONs validate and fold through the `tolerance_stack` package
  (value-level tests pinning the computed WC/RSS results, same style as the
  ported slice-1 tests); full suite green.
- Zero unexplained values: `grep`-ably, every element carries a
  `source_ref` that is traced/inferred-with-citation, or appears in a gaps
  list. The lesson states the traced ratio outright (slice 1 scored 1/17 —
  beat it honestly or explain why the sources don't exist).
- Worksheet present; verdicts stated with the marginal vocabulary where WC
  and nominal disagree.
- Lesson (`docs/sessions/lessons/LESSONS_20260803_pitch_link_stack.md`):
  the SOP friction report (proposed edits), the gap list in
  spec-library-intake form, and — explicitly — anything you were tempted
  to fill from memory/training data and refused (that record is evidence
  for the spec-sheet-pipeline decision).
