---
priority: high
depends_on: []
---

# HANDOFF 2026-09-06 — endstop_location_stack: the end-stop-location tolerance stack, built as a DAG study against the S461 requirements

Source: strategy session 2026-09-06. Jeff owns the end-stop-location and
mechanical-stroke stacks as **real deliverables with Polarion requirements**
(his 2026-09-03 note, restated in the locked 3D-annotation brief). Both gates
are met: the requirements are pulled (below) and the traced substrate landed
(`docs/sessions/lessons/LESSONS_20260904_endstop_retrace_acquired_docs.md` —
read it, plus the worksheet it extends). Baseline: `integration` with
`endstop_retrace_acquired_docs` and `viewer_consolidation` merged. Scope:
`docs/topologies/` (new/extended topology + endstop studies + checks),
`docs/tolerance_stacks/` prose, tests; a small additive `source_ref`
vocabulary change if needed (see item 2). Do NOT touch the four existing
pitch-system study documents' numbers, `tolerance_stack/stack.py`'s fold, the
spec-library events, or `apps/` (the annotation app is a parallel staged
handoff, `annotation_surface_mvp` — coordinate only through the identity-key
vocabulary, never through shared file edits).

## Inputs (all on disk now; `data/` = main checkout only, absolute paths)

1. **Requirements**:
   `C:\workspace\tolstack\data\inbox\requirements\S461_equipmentrequirements_20260906.json`
   — all 254 S461 equipmentrequirements pulled 2026-09-06 from the Polarion
   Delta mirror (`manufacturing.polarion.workitem`; full provenance + the
   exact SQL inside the artifact; schema `joby.tolstack/requirements-pull/v0`).
   Append-only inbox: never edit it; a re-pull is a new dated file. The
   endstop-location family: **S461-231 / S461-241 / S461-263 "End stop"**
   (draft; 241's text: "propeller pitch end stops at −7° and +72°"),
   **S461-805 "Blade Pitch Position Accuracy"**, **S461-607 "Blade pitch
   angle variation"** (both draft). `c_description` is HTML-ish — strip tags,
   quote the requirement text verbatim in citations, and carry `c_status`
   (draft vs validated) wherever a requirement is cited: a check against a
   draft requirement must say so.
2. **Ground truth**:
   `docs/tolerance_stacks/WORKSHEET_endstop_vision_baseline.md` — 43 rows,
   §8 is current state (26/43 located; per-row dispositions; F4/F5/F9/F10
   are open Jeff questions — build with the drawing values and record each
   workbook disagreement as a finding, never resolve one by fiat).
3. **Documents**: the drawings in
   `C:\workspace\drawing-checker\data\inbox\drawings\` (215071-C, 216231-B.1,
   214700-002-A, 215176-002-A, 215175-A, 212956-005-A, 217262-A + priors) and
   the specs in `data/inbox/specs/` (NAS1151–NAS1158 — OCR-garbage text
   layer, verify against rendered crops per the retrace lesson; Trelleborg).
   drawing-checker's inbox is read-only to this repo; run the snapshot guard
   (`scripts/snapshot_drawing_checker.py`) before/after as the retrace
   session did.

## Deliverables

1. **The stack, on the DAG archetype** (`docs/DAG_TOPOLOGY.md` binds): extend
   `docs/topologies/topology_pitch_system.json` (or add a linked topology if
   the graph genuinely doesn't fit — justify in the lesson) with the
   end-stop chain: stop faces → pitch-arm/linkage → blade pitch angle,
   crossing the one sanctioned linear↔rotary transform. Studies close the
   derived gaps the requirements constrain — suggested: one study per stop
   direction (−7° side, +72° side); every element cites per the one rule
   (cite or gap; `untraced` only as an explicit listed gap; parts-list rows
   are never `traced`).
2. **Requirement-cited checks.** Each study carries check(s) whose targets
   quote the requirement (id + verbatim text + `c_status` + the pull
   artifact's filename). If the existing `source_ref` vocabulary has no
   `requirement` kind, add one as a module-level constant with the usual
   prose-pairing test — vocabulary drift is this repo's most-repeated defect.
   A check on a stack with untraced elements reports `complete: false` and
   must never render as a hardware verdict (the standing CheckResult rule).
3. **The unresolved-identity list, in the annotation surface's key
   vocabulary.** Every element whose feature identity is unresolved (the
   retrace's blocked/candidate rows) is enumerated as `{topology_id, edge_id}`
   — exactly the stack-side key `annotation_surface_mvp`'s
   `feature-identity/v0` events bind. This list is the interlock between the
   two handoffs; put it in the lesson and in the worksheet's next section.
4. **Honest accounting**: the stack's traced ratio via the SOP's one
   definition (`debug_report_tolerance_stacks.py --ratio`), the gap list
   (still-blocked rows: piece parts 215198-001/-002, 214723-002, 213863-004
   and the MS14101/MS14103 spherical-bearing specs are unacquired — a
   separate acquisition todo is filed for Jeff; do not block on it), and the
   mismatch findings carried forward (F4/F5/F9/F10 + any new).

## Definition of done

- Topology + studies fold through the one `fold()`; tests pin the totals
  value-by-value and pair the requirement citations against the artifact
  (value-level: the quoted text, the status, the id set).
- The −7°/+72° checks compute against real folded numbers or report
  `complete: false` with the blocking gaps named — either honest outcome
  passes; an invented value fails review.
- Full suite green; ARCHITECTURE.md row if any new module.
- Lesson (`docs/sessions/lessons/LESSONS_20260906_endstop_location_stack.md`):
  the unresolved-identity list (item 3), which requirements ended up checkable
  vs blocked-on-gaps, topology-extension decisions the stroke stack (staged
  next, same files) must respect, and any `requirements-pull/v0` artifact
  shortcomings the eventual polarion-sync stream should fix.
