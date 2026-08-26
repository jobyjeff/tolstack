---
priority: high
depends_on: []
---

# HANDOFF 2026-08-25 — fastener_stack_shadow: reverse-engineer the rotor fastener length stack (shadow exercise with known answer)

> **⚠ INTERACTIVE EXCEPTION (HITL), 1 item:** the ground truth is a screenshot
> of Jason Ryan's excel tolerance stack, posted in Slack
> (`C06TS7XDG15`, thread ts `1784738867.093289`) — agents can't read Slack.
> **Jeff: save that screenshot (and, if handy, the actual xlsx) into
> `C:\workspace\tolstack\data\inbox\tolerance_stacks\` as
> `260825_rotor_fastener_jason.<png|xlsx>` + a PROVENANCE.md entry, before or
> shortly after launch.** Agent: if it's not there yet, do NOT block — build
> the stack independently first (that's the better experiment anyway: derive,
> THEN compare), and only diff against Jason's values once the file lands. If
> the session ends before it lands, ship the stack with the comparison
> section marked pending and say so in the lesson.

Source: strategy session 2026-08-25 (Jeff's atomic notes
`20260825T153610_xyrwgw` "Shadow initiative" + `20260825T175146_eocnel`).
Context: the rotor fastener length issue was already resolved by other
engineers — this is deliberately a **shadow exercise**: reverse-engineer the
stack from definition documents, compare against Jason's finished answer,
and harvest SOP improvements. It is also the baseline tracked stack for this
joint going forward. Baseline: trunk `master`. Scope: a new
`docs/tolerance_stacks/stack_*.json` + `WORKSHEET_*.md` + any new
`hardware_entries.json` rows + spec-library events; do NOT touch the viewer
(`apps/viewer/` — parallel handoff `stack_viewer_layout_v2` owns it) and do
NOT touch the End_Stop workbook (parallel handoff `endstop_graft_workorder`
owns it).

## The joint

Rotor fastener grip/length adequacy — the stack behind the Slack thread
above: fastener grip vs clamped-material thickness range across tolerances
(the same *class* of stack as the completed pitch-link fastener work, so the
SOP and `SOURCE_REF_KINDS` vocabulary already fit). Establish the exact
fastener part number(s) and clamped stack-up from the drawings + spec library;
if the drawing set in `C:\workspace\tolstack\data\inbox\drawings\` (absolute
main-checkout path; worktree `data/` is empty) doesn't cover the joint,
record each missing document as a gap per the SOP's cite-or-gap rule and
list the needed drawing numbers prominently in the lesson — Jeff exports
them next pass. **Eager-with-incomplete-data is the point; a gap list is a
valid deliverable.**

## Deliverables

1. **The stack**, per `docs/SOP_TOLERANCE_STACK.md` (Steps 0–8, cite-or-gap,
   value-level provenance): `stack_rotor_fastener_length.json` +
   `WORKSHEET_rotor_fastener_length.md`, spec values via spec-library events
   (`spec-parse/v0`) where a standard is read (NAS/MS specs are in
   `data/inbox/specs/`), hardware entries via the existing
   `hardware_entries.json` conventions.
2. **The comparison** (once Jason's screenshot is in the inbox): a section in
   the worksheet diffing your elements/values against his — agreements,
   discrepancies with your best explanation, and anything he included that
   you structurally missed (those are the SOP gaps).
3. **SOP harvest**: concrete SOP edit *proposals* (do not apply — list them
   in the lesson; SOP edits land via their own reviewed handoff, precedent
   `sop_edits_apply`) for whatever the derive-then-compare loop exposed.
4. **Projection rebuild** so the stack is viewable:
   `scripts/build_viewer_projection.py` (+ crops if you cite drawing regions)
   into the main checkout's `data/projections/viewer/` per the projection-
   provenance rules.

## Definition of done

- Stack JSON + worksheet exist, traced ratio computed per the SOP's single
  definition, every element `traced`/`inferred`/`untraced-as-gap` — zero
  recalled values (`tests/test_tolerance_stack.py` conventions green on the
  new stack).
- Comparison section present (or explicitly pending on the HITL input).
- Full suite green (`venv-win/Scripts/python.exe -m pytest -q`).
- Lesson (`docs/sessions/lessons/LESSONS_20260825_fastener_stack_shadow.md`):
  the missing-documents list, the comparison verdict (how close did the
  from-scratch derivation get?), SOP edit proposals, and — for the strategy
  layer — how far 2D-drawing-face data alone carried this stack (this
  number gates the 3D-annotation-surface draft).
