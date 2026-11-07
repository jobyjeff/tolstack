---
type: chore
priority: med
status: triaged
area: topology/kinematic-study
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261105_the_rail_holds_still_and_takes_the_face_jeff_picked.md
handoff: docs/sessions/HANDOFF_20261106_the_kinematic_study_reads_the_republished_sweep_and_its_checks_match_by_id.md
resolution: triaged 2026-11-06 (triage) -- folded into the_kinematic_study_reads_the_republished_sweep_and_its_checks_match_by_id (same study file and browser suite)
---

# The kinematic study still folds the P2 run whose slide joins the hub

Linkage republished the pitch sweeps on 2026-11-05 with `plate_slide` re-pointed
to the mount's bushings and the piston body. The runs are
`vpa-pitch-{s,p1,p2}-20261105-204957`, and their solved values match
`-20261016-235852` entry for entry (linkage lesson
`LESSONS_20261105_plate_slide_names_the_bushings_and_the_piston_body.md`).
Handoff `the_rail_holds_still_and_takes_the_face_jeff_picked` copied all three,
byte for byte, into `data/inbox/linkage-sweeps/` (main checkout).

The page Jeff opens (`?kinematic=vpa_pitch_linkage_blade_pitch_at_the_stops`)
boots the pane on the study's `sweep.run_id`. That is still
`vpa-pitch-p2-20261016-235852` in
`docs/topologies/kinematic_study_vpa_pitch_linkage_blade_pitch_at_the_stops.json`,
so his rail still shows the plate slide's ends as the hub's and the plate's bores.
`?sweep=vpa-pitch-p2-20261105-204957` shows the corrected row.

To do, in one change:

- re-point the study's `run_id` (and its `sweep` provenance sentence);
- map `plate_slide` to `pitch_plate_slide_bushings_to_piston_body` in
  `tests/test_topology.py`'s `SWEPT_JOINT_EDGES`. This is linkage's filed
  tolstack half: `linkage/docs/issues/ISSUE_20261105_tolstack_maps_plate_slide_to_the_bushings_to_piston_body_edge.md`;
- move the browser and annotate `[real]` pins that name `vpa-pitch-p2-20261016-235852`
  (`SWEEP_RAIL_RUN` and its mutation spec, `run_browser_check.mjs`, `run_tests.cjs`'s
  `P2_FILE`, `apps/viewer/tests.js`);
- rebuild the projections.
