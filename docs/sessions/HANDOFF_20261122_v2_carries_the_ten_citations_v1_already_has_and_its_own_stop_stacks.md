---
priority: high
depends_on: [the_blade_pitch_study_folds_on_v2_and_names_what_v2_adds]
model: sonnet
hitl: false
---

# HANDOFF 2026-11-22 — v2_carries_the_ten_citations_v1_already_has_and_its_own_stop_stacks: ten v2 edges take the citation v1 holds under the same id, and v2's study stops borrowing them

Source: strategy session 2026-11-22
(`dispatch/docs/strategy/HANDOFF_20261122_strategy.md`); the measurement
below. Baseline: trunk with
`the_blade_pitch_study_folds_on_v2_and_names_what_v2_adds` merged: v2 has a
study whose bands and stop stacks are read from v1. Scope:
`docs/topologies/topology_vpa_end_stop_v2.json` (dimensions on the ten edges
below only), `docs/topologies/kinematic_study_vpa_end_stop_v2_blade_pitch_at_the_stops.json`,
new `docs/topologies/study_vpa_end_stop_v2_*.json` stop-stack studies,
`tests/test_kinematic.py` and the topology tests the new values touch. Do NOT
touch: v1's files; any v2 id, node or edge; `apps/`; any v2 edge not in the
table (the next two links read new callouts). Never write to
`C:\workspace\tolstack\data\inbox\feature-identity\`.

## Measured 2026-11-22

v2 reuses v1's ids, and an id both models have names the same feature
(`docs/DAG_TOPOLOGY.md`, "Models"). Ten v2 edges have no value while v1's edge
of the same id carries a cited dimension:

| v2 edge (same id in v1) | Part | Drawing |
|---|---|---|
| `gas_spring_mount_datum_a_to_end_stop` | `gas_spring_mount_213668_002` | 213668-002 |
| `gas_spring_mount_flange_to_end_stop` | `gas_spring_mount_213668_002` | 213668-002 |
| `piston_cover_flange_to_end_stop` | `piston_cover_214958_002` | 214958-002 |
| `piston_head_lower_thickness` | `piston_head_lower_214699_002` | 214699-002 |
| `piston_head_lower_face_flatness` | `piston_head_lower_214699_002` | 214699-002 |
| `piston_head_upper_thickness` | `piston_head_upper_214698_002` | 214698-002 |
| `pitch_arm_link_hole_to_clocking_hole` | `pitch_arm` | 215071-001 |
| `pitch_link_length` | `pitch_link` | 213862-002 |
| `tan_link_length` | `tan_link_212956_005` | 212956-005 |
| `tan_link_mount_overall_height` | `tan_link_mount_215175_002` | 215175-002 |

An edge's `dimension_ref` reaches stack files only
(`tolerance_stack/topology.py`, about :2003-2026), so v2 carries a citation
inline. `tests/test_export_runs_match_the_run_log.py` requires a citation's
`export.runs` to list every run of that export; 213668-002 has six since
2026-11-19 (run `20261119_132629`), and the handoff
`an_export_citation_picks_up_a_new_drawing_checker_run_in_one_command`
(merged before this) added the command that rewrites them.

## Deliverables

1. **The ten edges carry v1's citation.** For each row, v2's edge takes the
   dimension v1's edge has: nominal, band, `source_ref` and its `export`,
   exactly. Before copying each one, check that v2's edge runs between the
   same two features as v1's (ends and `part`); where it does not, do not
   copy: leave the edge open and table it in the lesson with both pairs of
   ends. Do not re-read a drawing here and do not change a value; if a v1
   citation looks wrong, file an issue.

2. **v2's study reads v2's own edges.** In v2's study, each contributor whose
   band was borrowed from one of these ten v1 edges now reads v2's edge. The
   two bands still borrowed after this (the pitch link lug's axial height and
   the tangential lug's position, both from 215735-A) stay borrowed; the next
   link reads them from the sheet.

3. **v2's own stop stacks.** v1's study places each stop with three chain
   studies (`study_vpa_pitch_linkage_feather_stop_axial_position.json`,
   `study_vpa_pitch_linkage_travel_between_end_stops.json`, and
   `vpa_pitch_linkage_hub_to_feather_stop`, a declared gap). For each of the
   first two, if every edge it selects exists in v2 under the same id and
   now carries a value, author the same study on v2
   (`study_vpa_end_stop_v2_<same suffix>.json`, `topology: vpa_end_stop_v2`)
   and point v2's kinematic study at it. If one selected edge is missing or
   open on v2, leave that stack borrowed and say which edge in the lesson.
   The declared gap stays a declared gap.

4. **The page shows the change by itself.** No viewer code: the row badges
   the previous link added must now read these rows as valued on this model,
   and each opens to its citation and crop as v1's does. If a row still reads
   as borrowed or open after the rebuild, find out why before closing; a
   builder that needs a line to list v2's studies is in scope.

## Definition of done

- Value-level tests: v2's study folds to the same total and per-contributor
  terms as v1's at both stops and for the range (the parity test of the
  previous link, still green, now with v2's own edges); each v2 stop-stack
  study folds to its v1 twin's number, compared by computing both. Default
  pytest green in the main checkout; the two fast node tiers green.
- Rebuild the projections into a scratch data root as the previous link's
  lesson describes, serve on a scratch port (never 8000), and shoot v2's +72
  stop grid at 1536 wide: the ten rows read as valued here. Read the shot.
- Lesson (`docs/sessions/lessons/LESSONS_20261122_v2_carries_the_ten_citations_v1_already_has_and_its_own_stop_stacks.md`):
  the ten rows with copied / not copied and why; which stop stacks are now
  v2's own; the count of v2 edges with a value before and after (0 → n of
  105); what still reads from v1, by id.
