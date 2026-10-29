---
priority: low
depends_on: []
model: sonnet
hitl: false
---

# HANDOFF 2026-10-29 — the_rebuild_says_when_its_inputs_are_absent_and_a_link_is_named_by_its_drawing: two small burndown rulings

Source: the 2026-10-29 strategy burndown (`dispatch/docs/strategy/HANDOFF_20261029_strategy.md`)
ruling on dispatch's `ISSUE_20260930_actuator_rebuilds_over_absent_inputs_stamp_clean_provenance`
(decided announce-not-refuse on 2026-10-16, never staged — third session to
carry it) and consuming `docs/strategy/BRIEF_20260916_link_name_authority.md`.
Baseline: `master` 2026-10-29. Scope: `scripts/rebuild_projections.ps1` and
the provenance stamp it prints/writes, the topology/stack JSON `display`
fields named below, `apps/viewer/` **label rendering only** (one function),
tests, `docs/`. Do NOT touch `apps/viewer/views/topology.js` layout code,
`kinematic.js`, or the annotator — owned by the other 2026-10-29 tolstack
handoffs.

## Deliverables

1. **The rebuild announces absent inputs; it never refuses.** When
   `scripts/rebuild_projections.ps1` runs where the gitignored inputs it reads
   are missing (a worktree with no `data/inbox/*`), every projection it writes
   carries `provenance.inputs_absent: [<relative paths>]` and the script's
   stamp line prints `inputs absent: n` in yellow; exit code unchanged (0).
   Measured case: 2026-09-29, tolstack's merge candidate rebuilt over an empty
   `data/` and stamped clean. A guard that reads the stamp (dispatch's duty,
   not this repo's) can then tell "built from nothing" from "built from
   everything". Record in the lesson exactly which inputs the rebuild reads so
   dispatch's `[tests] candidate_inputs` declaration for tolstack can be
   written from it.
2. **A link is named by its drawing; ids do not move.** Decision from the
   brief: the **drawing title block is authoritative for display**; committed
   ids (`tan_link_to_pitch_plate`, `pitch_link_to_pitch_plate`, `pitch_plate_215197`,
   `pitch_flange_215197`) stay as they are — 170 tracked files and three
   shared projections key on them. Each topology/stack JSON that names a link
   or a re-cited plate gains a `display_name` ("Pitch anti-rotation link
   212956-005", "Pitch link 213862-002", "Pitch plate 215735-001/-002") and a
   one-line `naming_note` recording the crossing (the 260729 workbook's "Tan
   Link" = the drawing's PITCH ANTI ROTATION LINK; Jeff's "pitch link" = the
   drawing's PITCH LINK; `215197` superseded by `215735`). The viewer shows
   `display_name` where it shows the id today, with the id in the tooltip.
   `docs/SOP_TOLERANCE_STACK.md` gets the rule in one paragraph: ids are
   stable handles, display names follow the drawing.

## Definition of done

- A rebuild in a scratch worktree with no inputs writes `inputs_absent` and
  exits 0; the main-checkout rebuild writes `inputs_absent: []`.
- Every link/plate node above shows its display name in the viewer; deep
  links, crop keys, binding keys and projection keys unchanged (the `[real]`
  tier and `node scripts/run_viewer_browser_tests.mjs` green).
- `PYTHONIOENCODING=utf-8 venv-win/Scripts/python.exe -m pytest -q` green.
- The dispatch issue resolves on Complete (its `handoff:` names this file);
  the brief is marked CONSUMED by the strategy session.
- Lesson: the input list for item 1; every file that gained a `display_name`.
