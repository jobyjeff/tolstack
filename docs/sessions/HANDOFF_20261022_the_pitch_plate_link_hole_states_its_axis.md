---
priority: med
depends_on: [tolstack/an_export_lists_every_run_that_consumed_it]   # both edit topology_pitch_system.json / topology_vpa_pitch_linkage.json; the export fix is small and lands first so this one merges over it
model: opus
---

# HANDOFF 2026-10-22 — the_pitch_plate_link_hole_states_its_axis: read the link hole's axis off 215735-A and widen its ⌖Ø0.2 to a disk

Source: `docs/issues/ISSUE_20261022_the_pitch_plate_link_hole_has_no_axis_so_its_position_zone_stays_a_band.md`
and its parent `docs/issues/ISSUE_20261016_a_kinematic_contributor_reads_a_diametral_position_zone_as_a_one_axis_band.md`
(auto-resolved when `a_general_profile_note_bands_a_model_defined_term`
completed, but that handoff could not convert the contributor — reopened and
routed here by the 2026-10-22 second triage sweep). Baseline: trunk after the
2026-10-22 second batch merge, plus `an_export_lists_every_run_that_consumed_it`.
Scope: `docs/topologies/topology_pitch_system.json`,
`docs/topologies/topology_vpa_pitch_linkage.json` (the link-hole
interfaces only), `docs/topologies/kinematic_study_vpa_pitch_linkage_blade_pitch_at_the_stops.json`,
`tests/test_kinematic.py`, the worksheet/lesson tables that restate the
study's numbers. Do NOT touch: `tolerance_stack/kinematic.py`'s zone kinds
(`disk` already exists — `ZONE_KINDS`), any other contributor, F4 of
`docs/tolerance_stacks/WORKSHEET_endstop_vision_baseline.md` (Jeff's call;
leave it open), anything in drawing-checker (read-only).

## Deliverables

1. **Establish the link hole's axis from the drawing — never guess it.** The
   SOP rule ("What a term cites when its drawing does not band it") makes a
   position zone `⌖Øw` a kinematic `disk` of radius w/2 over the two
   components normal to the feature's axis, and forbids guessing the axis.
   The callout is 215735-A's `5X ⌀ 7.950 +0.015/0.000` with `⌖⌀0.2 A B C`
   (sheet 2, zones B9/C4 per the worksheet's row 32). Read the drawing's
   views — `C:\workspace\tolstack\data\inbox\drawings\215735-A.pdf`, and
   drawing-checker's runs of it (93 rows in
   `C:\workspace\drawing-checker\data\runs.jsonl` mention 215735; read the
   `page_*.png` renders and per-page JSON) — for the hole's direction
   (radial or axial to the spindle) and record which view and callout
   establish it. Cite the drawing; a mesh glance is not a citation.
2. **If the drawing settles it:** state the axis on both topologies'
   interfaces (`pitch_system`'s `pitch_plate_link_hole`,
   `vpa_pitch_linkage`'s `pitch_plate_link_attach_bore`) with its
   `source_ref`, convert contributor `pitch_plate_attach_height` to a `disk`
   of radius 0.1 over the two `pitch_link.point_a` components normal to that
   axis, drop the now-covered component from both checks' `excluded_terms`,
   rebuild, and report the verdict delta at −7° and +72°. The 2026-10-21
   estimate was about +0.002° / +0.005° worst case with no verdict change —
   re-measure it, do not copy it. Re-pin
   `tests/test_kinematic.py::test_real_the_first_study_pins_both_stops_against_p2`
   and every table that restates those numbers. The viewer's kinematic page
   already renders a disk contributor; confirm the row reads right and say
   what you saw.
3. **If it does not:** change nothing in the study, add a dated addendum to
   the 2026-10-22 issue naming the views you read and why none states the
   direction, and file a new issue with `needs: jeff` and an `ask:` of the
   shape "Bind the pitch plate's link hole in the annotator on
   asm217755_215735_001" — that binding is the other route
   (`scripts/fit_bound_features.py` then fits the bore axis). That is a
   complete outcome, not a failure.

## Definition of done

- Either the contributor is a cited `disk` with re-measured verdicts and
  re-pinned tests, or the issue carries the evidence that the drawing is
  silent plus a person-blocked follow-up; in both cases nothing is guessed.
- `venv-win/Scripts/python.exe -m pytest -q` green (bridged worktree per
  CLAUDE.md); viewer `[real]` tier run against a projection rebuilt from
  this tree.
- Lesson: which view/callout establishes the axis (or that none does), the
  measured delta, and whether a disk over both in-plane components makes
  F4's "one callout counted twice" question concrete (describe, do not
  decide).
