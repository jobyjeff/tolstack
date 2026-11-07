---
priority: high
depends_on: []
model: sonnet
hitl: false
---

# HANDOFF 2026-11-06 — the_kinematic_study_reads_the_republished_sweep_and_its_checks_match_by_id: trunk's browser red cleared, and Jeff's rail shows the corrected plate slide

Source, three issues in one change because they touch the same study file and the same browser
suite:
- `docs/issues/ISSUE_20261106_two_kinematic_page_browser_checks_still_match_the_old_edge_names.md`
  (high). This is the known red the 2026-11-06 batch merge took onto master.
- `docs/issues/ISSUE_20261105_the_kinematic_study_still_folds_the_p2_run_whose_slide_joins_the_hub.md`
  (med; Jeff's page shows the wrong ends for the plate slide).
- `linkage/docs/issues/ISSUE_20261105_tolstack_maps_plate_slide_to_the_bushings_to_piston_body_edge.md`
  (linkage's filed tolstack half).

Routed by the 2026-11-06 triage sweep. Baseline: tolstack master `15dae286`. The batch merge
(`66159c33 → 405bad81`) ran the browser tier in the main checkout. Result: **42/43**, and the
suite `kinematic study page (deep link, chart hover, contributors, no projection)` passed
25/27. Scope: `docs/topologies/kinematic_study_vpa_pitch_linkage_blade_pitch_at_the_stops.json`,
`tests/test_topology.py`, `scripts/run_viewer_browser_tests.mjs`, the annotate/viewer test pins
that name the old run, and their mutation specs. Do NOT touch `apps/annotate/run_browser_check.mjs`'s
reduced-motion and speed checks. `the_annotate_pacing_checks_step_a_virtual_clock`, staged in
parallel, owns those.

## Deliverables

1. **The two red checks match by id, not by prose.**
   - `[real] hovering a sensitivity shows its curve across the sweep, both signs of the mount height's on its axis`
     matches `/tangential link mount/`.
   - `[real] clicking a term row selects pitch_plate_attach_height in place: …` matches
     `/pitch-link attachment bore, height/`.

   `2e97a77a` shortened both names (table in the high issue). Match on `data-id` plus the
   name read from the projection, so the next rename cannot redden them. Each check's mutation
   spec must still witness it. While this suite is red, every witness spec in it reports NOT
   WITNESSED (the issue lists 14 entries).
2. **Re-point the study to the republished sweep.** In the study JSON, change `sweep.run_id` (and
   its provenance sentence) from `vpa-pitch-p2-20261016-235852` to `vpa-pitch-p2-20261105-204957`.
   It is already in the main checkout's `data/inbox/linkage-sweeps/`, and its solved values
   match entry for entry. In `tests/test_topology.py`'s `SWEPT_JOINT_EDGES`, map `plate_slide`
   to `pitch_plate_slide_bushings_to_piston_body`. Linkage's issue also recommends dropping
   `cylindrical_slide` from `hub_to_pitch_plate_spindle_coaxiality` and keeping it as an axis
   comparison, so that only one edge claims to be the slide. Do it unless something in the
   tree depends on it, and say which in the lesson.
3. **Move the `[real]` pins that name the old run**: `SWEEP_RAIL_RUN` and its mutation spec,
   `run_browser_check.mjs`, `run_tests.cjs`'s `P2_FILE`, and `apps/viewer/tests.js`. Then
   rebuild the projections (`scripts/rebuild_projections.ps1`, per CLAUDE.md).
4. **Surface:** `?kinematic=vpa_pitch_linkage_blade_pitch_at_the_stops` shows the plate slide's
   ends as the mount's bushings and the piston body, not the hub's and plate's bores. Take one
   screenshot of the rail for the lesson.

## Definition of done

- The browser tier is 43/43, or every remaining red is named with an issue. Run the default,
  viewer and annotate tiers too, plus the witness tier `--changed-since master` for the specs
  you touched, all per CLAUDE.md.
- The two checks' mutation specs are witnessed.
- Lesson (`docs/sessions/lessons/LESSONS_20261106_the_kinematic_study_reads_the_republished_sweep_and_its_checks_match_by_id.md`):
  the screenshot and the `cylindrical_slide` call.
