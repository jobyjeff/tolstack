# Lessons — v2 carries the ten citations v1 already has, and its own stop stacks

## The ten rows

Ends and `part` were compared by script: all ten v2 edges run between the same two
nodes, on the same part, as v1's. All ten **copied** (dimension block verbatim,
`source_ref` and `export.runs` included; the stale "Value to come" note removed,
since the viewer renders notes and the prose guard bans `source_ref` in them).

| edge | v1 holds | confidence |
|---|---|---|
| gas_spring_mount_datum_a_to_end_stop | 213668-002 76.86 ±0.10 | traced |
| gas_spring_mount_flange_to_end_stop | 213668-002 8.667 ±0.5 (note 12) | traced |
| piston_cover_flange_to_end_stop | 214958-002 82.154 ±0.02 | traced |
| piston_head_lower_thickness | 214699-002 2.491 ±0.05 | traced |
| piston_head_lower_face_flatness | 214699-002 flatness 0.05 as ±0.025 | inferred |
| piston_head_upper_thickness | 214698-002 6.556 ±0.25 (note 6) | traced |
| pitch_arm_link_hole_to_clocking_hole | workbook B26 | **untraced** |
| pitch_link_length | workbook B31 | **untraced** |
| tan_link_length | 213863-004-A 61.40 ±0.05 | traced |
| tan_link_mount_overall_height | 215198-A 79.00 ±0.10 | traced |

The handoff's table said "citation" and named drawings for all ten; two are workbook
bands with no drawing behind them and two name a different drawing than the table.
Copied as told, honestly labelled; filed as
`docs/issues/ISSUE_20261123_two_of_the_ten_v1_citations_v2_took_are_untraced_workbook_bands_not_drawings.md`.

## Stop stacks

- **v2's own:** `study_vpa_end_stop_v2_travel_between_end_stops.json` (all four edges
  valued); v2's kinematic study points at it. Folds to v1's number, computed both ways.
- **Still v1's:** `vpa_pitch_linkage_feather_stop_axial_position` — it selects
  `piston_body_shoulder_to_top` and `piston_body_flange_to_top`, which v2 does not have
  (v2 has `piston_body_id_datum_*` edges, all open). `vpa_pitch_linkage_hub_to_feather_stop`
  stays a declared gap.

## Counts

v2 edges with a value: **0 → 10 of 105.**

## What still reads from v1, by id

Study bands: `pitch_plate_flange_to_link_hole`, `pitch_plate_tan_link_attach_radius`
(215735-A). Stack: `vpa_pitch_linkage_feather_stop_axial_position`,
`vpa_pitch_linkage_hub_to_feather_stop` (gap). The sweep run is v1's, as before.

## Study contributors

pitch_link_length, pitch_arm_radius and tan_link_mount_height now `dimension_ref` v2's
topology. tan_link_length keeps its inline band about zero (a basic dimension 61.40
cannot be a `dimension_ref`); its `borrowed_from` now names v2's edge.

## Looked at

Scratch root `data/scratch/study_v2` rebuilt from this tree, served on 8897 (not 8000).
Shot `shots/v2_carries_the_ten_citations_v1_already_has_and_its_own_stop_stacks/02_v2_plus72_1536.png`
(read): only the two 215735-001 rows wear BORROWED; the pitch arm, pitch link and the
rest read as valued. The first shot, taken before the kinematic projection finished
rebuilding, still showed BORROWED on the arm and link — stale data, not a builder gap.
The page's "data is older than the latest code" banner is the scratch root's dirty-tree build.

## Tests

- Worktree `pytest -q` (first run, before the fixes below): 13 failed — 10 prose-guard on my
  note text, `test_model_v2_locates_...` (asserted every v2 edge unvalued), the doc-names-every-document
  guard (DAG_TOPOLOGY.md now names the new study), and the deliberate worktree red
  `test_viewer_js_suite_is_green`. First three fixed; re-run result below.
- `node apps/annotate/run_tests.cjs`: 334/334. `node apps/viewer/run_tests.cjs`: 527/527
  with the [real] tier skipped; `--repo` on the scratch root failed only the freshness gate
  (projection built from a dirty tree), not a check.
- No new guard; no witness spec added, so the witness runner was not run.
