---
priority: med
depends_on: []
---

# HANDOFF 2026-09-10 — endstop_piece_part_acquisition: acquire the 4 remaining piece-part drawings + 2 bearing specs, then retrace

> **⚠ INTERACTIVE EXCEPTION (HITL), 1 item:** ask Jeff to acquire six
> documents by their own part/spec numbers (not by feature description — see
> "Ask precisely" below): drawings `215198-001`, `215198-002`, `214723-002`,
> `213863-004`; spec sheets `MS14101` and `MS14103` (dash `-3` of each).
> Don't block — open the ask immediately, then do the spec-library intake /
> re-trace pass once they land in drawing-checker's `data/inbox/drawings/`
> and this repo's `data/inbox/specs/`. Nothing else in scope depends on them
> arriving first.

Source: `docs/issues/ISSUE_20260906_endstop_piece_part_acquisition.md`, filed
by handoff `endstop_location_stack` (2026-09-06) deliverable 4, carrying
forward the acquisition list handoff `endstop_retrace_acquired_docs`
(2026-09-04) left in its lesson's "Left for the next session"
(`docs/sessions/lessons/LESSONS_20260904_endstop_retrace_acquired_docs.md`).
Baseline: trunk tip. The endstop ground truth is
`docs/tolerance_stacks/WORKSHEET_endstop_vision_baseline.md` (§8 re-trace —
read its row dispositions before anything else). Scope: `data/inbox/specs/`
(spec-library events + projection), the endstop worksheet/gap-list docs,
tests; do NOT touch `apps/viewer/` (owned by other in-flight handoffs) and do
NOT modify existing `data/inbox/` contents (append-only — only add the new
files named below).

## Ask precisely

Ask Jeff for these by their own part/spec numbers, not by feature name —
asking for "the tangential link mount" or "the anti-rotation link" returned
the same two dimensionless assembly sheets already in hand (`215175-A`,
`212956-005-A`) on the 2026-09-04 pass, and will again:

- `215198-001` / `215198-002` — MOUNT, TANGENTIAL LINK, CW/CCW (the actual
  toleranced housing; `215175-A` is a dimensionless assembly that only
  balloons these)
- `214723-002` — BUSHING, SEALED, TANGENTIAL LINK
- `213863-004` — the pitch/anti-rotation link's toleranced body
  (`212956-005-A` carries only a parenthesized reference length for it)
- `MS14101` and `MS14103`, dash `-3` of each (per `212956-005-A`'s own parts
  list) — Military Standard spherical-bearing size-tolerance sheets, not yet
  in `data/inbox/specs/`

## Deliverables

1. **Acquire the four drawings** into drawing-checker's
   `data/inbox/drawings/` and **the two spec sheets** into this repo's
   `data/inbox/specs/`. Snapshot drawing-checker before and after
   (`scripts/snapshot_drawing_checker.py`) per the read-only invariant; a
   non-empty diff limited to `data/runs/` eager-ingestion entries is expected
   and fine (2026-09-04 precedent) — confirm no `data/inbox/drawings/` entry
   itself changed.
2. **Re-trace the six affected worksheet rows** once acquired, following the
   method already worked out in
   `docs/sessions/completed/HANDOFF_20260904_endstop_retrace_acquired_docs.md`
   (page-count pass over every document first; value-only matching produces
   confident garbage — identify the feature, not the number; the
   general-tolerance block is per-drawing, never universal):
   `pitch_link_length` (rows 31/52), `tan_link_mount_height` (42),
   `hub_top_deck_to_tan_link_mount_seat` (45),
   `pitch_plate_flange_to_gas_spring_bushing` (62 — owner refined to
   `214723-002` as a hypothesis, not yet confirmed), plus rows 34/36/50/54/56
   (spherical-bearing size tolerances, untouched by any session so far).
   Update `docs/tolerance_stacks/WORKSHEET_endstop_vision_baseline.md` §8 in
   place (dated correction blockquotes, or a successor section — follow the
   worksheet's own convention) and `docs/tolerance_stacks/README.md`'s
   Contents-table row.
3. **Spec-library intake for MS14101/MS14103**
   (`spec-parse/v0` events + projection rebuild, per
   `docs/spec_library/README.md`): value / demonstrable absence / unreadable
   discipline — never a licence to infer.
4. **Report the new traced ratio** before/after, computed via
   `debug_report_tolerance_stacks.py --ratio` — do not hand-restate the
   number in prose. (Reviews dated 2026-09-06 on this repo independently
   flagged the same defect class twice: a stale count restated in a doc/note
   that the underlying data had outgrown — compute it fresh here.)

## Definition of done

- Each of the six rows above carries a new, cited disposition (traced /
  measured absence / still blocked) in the worksheet; traced ratio reported
  before/after using the SOP's own computed number.
- Spec-library events committed for MS14101 and MS14103 with value-level
  tests on a sample of parsed values.
- Suite green (`venv-win/Scripts/python.exe -m pytest -q`; from a worktree
  the venv is `C:\workspace\tolstack\venv-win\Scripts\python.exe`).
- Lesson (`docs/sessions/lessons/LESSONS_20260910_endstop_piece_part_acquisition.md`):
  the disposition table, the new traced ratio, and — if any of the six
  documents did not arrive in time — say so plainly and leave the
  still-blocked rows named for the next session, same discipline the
  2026-09-04 lesson used for this same list.
