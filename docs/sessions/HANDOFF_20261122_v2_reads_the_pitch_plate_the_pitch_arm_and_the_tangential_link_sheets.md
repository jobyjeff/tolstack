---
priority: high
depends_on: [v2_carries_the_ten_citations_v1_already_has_and_its_own_stop_stacks]
model: opus
hitl: false
---

# HANDOFF 2026-11-22 — v2_reads_the_pitch_plate_the_pitch_arm_and_the_tangential_link_sheets: twelve open v2 dimensions on three drawings already read get their callout, or a named gap

Source: strategy session 2026-11-22
(`dispatch/docs/strategy/HANDOFF_20261122_strategy.md`);
`docs/sessions/lessons/REVIEW_20261119_the_links_and_the_pitch_plate_stack.md`
("The step is now transcription, not acquisition"). Baseline: trunk with the
two links ahead merged: v2 has a study, ten edges valued from v1, and two
bands still read from v1 (both from 215735-A). Scope:
`docs/topologies/topology_vpa_end_stop_v2.json` (dimensions on the edges
below only), v2's kinematic study file, tests for the new values. Do NOT
touch: v1's files; any id; `apps/`; the spec library (the next link); edges
of other parts. Never write to
`C:\workspace\tolstack\data\inbox\feature-identity\`.

**The repo's one rule binds every line of this handoff: a value cites the
callout it was read from, or the edge stays open with the reason. Nothing is
recalled, estimated or measured off a mesh.**

## The edges

| Part | Sheet and runs | Open v2 edges |
|---|---|---|
| 215735-001 pitch plate | `C:\workspace\drawing-checker\data\inbox\drawings\215735-A.pdf`; runs `C:\workspace\drawing-checker\data\runs\20260813_180734_215735-A` and `…\20260819_153213_215735-A` | `pitch_plate_pilot_to_piston_flange`, `pitch_plate_pilot_to_piston_fasteners`, `pitch_plate_link_bushing_bores_position`, `pitch_plate_link_flanged_bushing_radius`, `pitch_plate_link_flanged_bushing_bore_to_seat`, `pitch_plate_tan_link_bushing_bores_position`, `pitch_plate_tan_link_flanged_bushing_radius`, `pitch_plate_tan_link_flanged_bushing_bore_to_seat`, and the pitch link lug's axial height edge added on 11-22 (its id is in the lesson of `the_blade_pitch_study_folds_on_v2_and_names_what_v2_adds`) |
| 215071-001 pitch arm | `…\drawings\215071-C.pdf`; run `…\runs\20260904_181257_215071-C` | `pitch_arm_radius`, `pitch_arm_bore_to_clamp_face` |
| 213863-004 machined tangential link | `…\drawings\213863-004-A.pdf`; run `…\runs\20260910_154233_213863-004-A` | `tan_link_race_bores` |

What is already known, so you do not re-derive it:

- Both 215735-A and 215071-C are sheets of another dash that dimension this
  dash too (the lesson of `an_open_dimension_says_where_its_drawing_stands`
  read their notes). Confirm it on the sheet for each edge you cite, and say
  where the sheet says so.
- v1 already cites two callouts on 215735-A that v2's study still borrows:
  `pitch_plate_flange_to_link_hole` (position Ø0.2 to A B C, held as ±0.1)
  and `pitch_plate_tan_link_attach_radius` (sheet 2, position Ø0.2 to A B).
  Read the same frames for v2's edges; do not copy v1's reading unseen.
- How an agent has done this before: `docs/sessions/completed/HANDOFF_20261020_the_travel_chain_cites_its_three_drawings.md`
  and `HANDOFF_20261026_the_tangential_link_cites_its_drawing.md`, with their
  lessons. They read the page renders with vision and the PDF text layer
  through PyMuPDF from drawing-checker's venv
  (`C:\workspace\drawing-checker`), because those runs' JSON carried no
  dimensions. Check each run's JSON first; a newer run may carry them.
- The citation shape is `dimension.source_ref`, `kind: "drawing"`, with
  `export{status, pdf, sha256, runs[…]}` listing **every** run of that export
  (`tests/test_export_runs_match_the_run_log.py`; the command that fills
  `runs` is named in that test's failure message). View and box go in `note`
  as the earlier citations do.

## Deliverables

1. **Each edge gets its callout or stays open, by name.** For every edge in
   the table: find the callout that bands the relation between the edge's two
   ends, transcribe nominal and band as printed, cite sheet, view and frame.
   A position or profile frame is carried as the frame says (zone shape,
   datums); how it becomes a band on this edge follows what v1's citations of
   the same frames did, and the lesson states the reading in one line per
   edge. Where the sheet has no callout for the relation (basic dimension
   with no frame, a reference dimension, nothing), the edge stays open and
   its note says what is on the sheet instead. An edge whose two ends the
   sheet relates only through a third feature is a gap with that said, never
   a sum you compute.

2. **v2's study reads the sheet.** The two bands v2's study still borrows
   from v1 now come from v2's own edges where deliverable 1 valued them. If
   the study's numbers move, the lesson tables each stop's total before and
   after and which reading moved it; a difference from v1 is a finding for
   Jeff's review page, never something to reconcile by editing either side.
   The parity test of the first link is updated to say exactly which
   contributors still equal v1's and which now differ, with the reason in the
   test's name or message.

3. **Each citation opens to its crop.** The viewer already shows a cited
   dimension's crop (`scripts/build_viewer_crops.py`). After a rebuild into a
   scratch data root, every edge valued here opens to the crop of the frame
   it cites. No viewer code is expected; if a crop is missing, find the
   cause.

## Definition of done

- Default pytest green in the main checkout; value-level pins for every
  dimension added (nominal, band, document, sheet); the two fast node tiers
  green.
- Shots at 1536 wide, read with vision, from a scratch-root serve on a
  scratch port (never 8000): v2's grid showing the plate's rows valued, and
  one opened row per drawing showing its crop beside the number. For each
  cited value, your own check that the crop shows the digits you
  transcribed.
- Lesson (`docs/sessions/lessons/LESSONS_20261122_v2_reads_the_pitch_plate_the_pitch_arm_and_the_tangential_link_sheets.md`):
  one row per edge: cited (callout as printed, sheet, view) or open (what the
  sheet has instead); the study's numbers before and after; v2 edges with a
  value before and after; any question only Jeff can answer, worded for his
  review page.
