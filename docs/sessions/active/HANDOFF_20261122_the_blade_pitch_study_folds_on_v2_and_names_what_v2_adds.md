---
priority: high
depends_on: [a_take_on_a_lug_feature_binds_that_lugs_own_face, the_viewer_node_suite_runs_inside_its_default_tier_timeout, an_export_citation_picks_up_a_new_drawing_checker_run_in_one_command, a_body_row_in_the_nav_takes_a_resting_hover_every_time]
model: opus
hitl: false
---

# HANDOFF 2026-11-22 — the_blade_pitch_study_folds_on_v2_and_names_what_v2_adds: the first study on v2 — blade pitch at the stops, on the same sweep, with a row for every part v2 has and v1 lumped

Source: strategy session 2026-11-22
(`dispatch/docs/strategy/HANDOFF_20261122_strategy.md`), Jeff's note
`20261122T211136_iubdsx` ("what are next steps?") and his 11-19 note
("Getting the kinematic end stop study fully incorporated is top priority").
This is F4 of `dispatch/docs/strategy/drafts/DRAFT_tolerance_analysis_over_the_kinematic_model.md`.
Baseline: trunk after the four handoffs in `depends_on` merge (the 11-19 chain
is already on `master`, batch-merged 2026-11-21 at `53271c6c`). First link of
a chain of seven that ends in
`the_walk_reads_the_v2_study_and_the_map_on_the_merged_page`.

Scope: `tolerance_stack/kinematic.py`, `scripts/build_kinematic_projection.py`,
`docs/topologies/topology_vpa_end_stop_v2.json` (one added edge, deliverable 2),
a new `docs/topologies/kinematic_study_vpa_end_stop_v2_blade_pitch_at_the_stops.json`,
`apps/viewer/views/kinematic.js` and what it needs to list the study under v2,
`tests/test_kinematic.py`, `docs/DAG_TOPOLOGY.md`. Do NOT touch: v1's
topology, v1's study file or its pinned numbers; `apps/annotate/`; the map's
layout and routing (`apps/viewer/map.js`, `docs/topologies/map_vpa_end_stop_v2.json`:
a later link re-arranges it) beyond what the added edge and deliverable 6
force; the nav tree's rows (owned by a later link); `C:\workspace\linkage`
(another repo; no change is needed, see below). Never write to Jeff's binding log,
`C:\workspace\tolstack\data\inbox\feature-identity\`; he is binding in it this
week.

## What is true today (measured 2026-11-22, read-only; re-check each line you rely on)

- v2 (`docs/topologies/topology_vpa_end_stop_v2.json`: 78 nodes, 104 edges,
  `ids_from: "vpa_pitch_linkage"` at line 7) has **no study and no edge with a
  value**.
- The one kinematic study is on v1:
  `docs/topologies/kinematic_study_vpa_pitch_linkage_blade_pitch_at_the_stops.json`
  (sweep `vpa-pitch-p2-20261105-204957`, measure `blade_pitch`, datum stop
  `plus72`, two stops each with an `axial_stack` of `study_ref`s, six
  contributors, two reach checks against S461-261).
- Its sensitivities come from
  `C:\workspace\tolstack\data\inbox\linkage-sweeps\vpa-pitch-p2-20261105-204957.json`
  (`kinematic.py::sweep_path`, `load_sweep`), joined on the exact parameter
  label (`pitch_link.point_a[2]`). No binding and no `fits.json` is read:
  `kinematic.py` imports only `stack` and `topology`.
- **A v2 study on that sweep is refused today.** The run's
  `geometry.features[]` entries say `topology: vpa_pitch_linkage`
  (`C:\workspace\linkage\linkage\vpa.py:395`), and `_reconcile_feature`
  accepts only `None` or the study's own topology id
  (`kinematic.py`, the `entry.get("topology") not in (None, topology.id)`
  line, about :713). `kinematic.py` has no `ids_from` handling; the 3D pane
  does (`apps/annotate/sweep.js:190`).
- The four sphere-centre nodes the run names exist in v2 under v1's ids:
  `pitch_link_lower_sphere_centre`, `pitch_link_upper_sphere_centre`,
  `tan_link_lower_sphere_centre`, `tan_link_upper_sphere_centre`.
- A kinematic study may hold a contributor with no value: a `gap` reason, or a
  `dimension_ref` to a valueless edge (`kinematic.py:762-784`). It shows its
  sensitivity and enters no term (`tests/test_kinematic.py:173`, `:1663`). A
  band may be borrowed from another topology's edge (`:746-768`). A
  `study_ref` among contributors folds a chain study's leaves at
  `|J| × ratio` (`:959-1016`), on one scalar `parameter`, no nesting.
- A contributor's `edge` and `feature` must be in the study's own topology
  (`kinematic.py:1108-1114`). Two of v1's six contributor edges are not in
  v2: `pitch_plate_attach_height` and `pitch_plate_tan_link_attach_radius`.
  v2 has `pitch_plate_link_flanged_bushing_radius` and
  `pitch_plate_tan_link_flanged_bushing_radius` (pilot boss → each lug's
  flanged bushing bore) and **no axial edge** on the plate for the pitch link
  lug.

## Deliverables

1. **The study code reads a model that reuses another's ids.** Where a sweep
   feature names the topology the study's topology declares in `ids_from`,
   and the node or edge id it names exists in the study's topology,
   `_reconcile_feature` accepts it: by `docs/DAG_TOPOLOGY.md` "Models" that id
   is the same feature in both. Any other topology name still refuses, with
   the message it has. No change in linkage; the mechanism is the same.

2. **The plate's axial height for the pitch link lug is an edge again.** One
   structural edge on `pitch_plate_215735_001`, no new node, from
   `piston_body_plate_flange_seat` to `pitch_plate_link_flanged_bushing_bore`
   (suggestion: that is the pair 215735-A's position callout bands; if the
   drawing datums say otherwise, author what the drawing says and record why).
   No value yet: `215735-001`'s sheet is transcribed two links later. Its note
   says which v1 edge it stands where (`pitch_plate_attach_height`). The map
   must still report no layout notes with the edge added.

3. **The study on v2.** Author
   `docs/topologies/kinematic_study_vpa_end_stop_v2_blade_pitch_at_the_stops.json`
   (id `vpa_end_stop_v2_blade_pitch_at_the_stops`, `topology:
   vpa_end_stop_v2`): the same sweep run, measure, datum, stops, targets and
   checks as v1's. Contributors, one per sweep column set, as below. Where
   v2's edge has no value yet, the band is **borrowed from the v1 edge v1's
   study already reads** (`dimension_ref` across topologies) so the first v2
   number is v1's number, on v2's parts.

   | Sweep columns | v1 contributor | v2 contributor edge | Band, for now |
   |---|---|---|---|
   | `pitch_link.length` | `pitch_link_length` | `pitch_link_length` (same id) | as v1 |
   | `pitch_link.point_b[0..2]`, sphere | `pitch_arm_radius` | `pitch_arm_radius` (same id) | v1's `pitch_arm_link_hole_to_clocking_hole` |
   | `pitch_link.point_a[2]` | `pitch_plate_attach_height` | the new edge of deliverable 2 | v1's `pitch_plate_flange_to_link_hole` |
   | `tan_link.length` | `tan_link_length` | `tan_link_length` (same id) | v1's inline 213863-004-A dimension |
   | `tan_link.point_a[2]` | `tan_link_mount_height` | `tan_link_mount_height` (same id) | v1's `tan_link_mount_overall_height` |
   | `tan_link.point_b[0..2]`, sphere | `pitch_plate_tan_link_attach_radius` | `pitch_plate_tan_link_flanged_bushing_radius` | v1's `pitch_plate_tan_link_attach_radius` |

   The stops' axial stacks: reference v1's three chain studies as v1's study
   does (`study_ref` carries a `topology`), unless the code refuses a
   cross-model `study_ref`; if it does, make it accept one under the same
   `ids_from` rule and say so in the lesson. v2's own stop stacks come after
   the drawings are cited.

4. **A row for every part v2 has and v1 lumped.** v1 put each ball centre on
   its mating part in one step. v2 has the parts between: at each lug, the
   flanged bushing's press fit and wall, the bolt in the bushing, the race on
   the bolt, the race bore to its ball; at each link end, the outer race's
   press fit and its outside diameter to centre; at the arm and the mount,
   the stand-in pin. Each of these edges that lies on v2's route from a
   contributor's edge to the ball centre it moves is a **row of the study on
   that contributor's columns**, with its sensitivity shown and no value
   (`gap`), in route order. Nothing is invented: no row gets a number here.
   Measure first whether two contributors may share a sweep column today; if
   the code refuses, make it accept (each is its own term on the same
   coefficient) and pin it with a test on a fixture. The lesson carries the
   table: v2 edge, columns, why it is on the route. An edge you judge moves
   no column of this sweep (a member along the bolt's axis where the sweep has
   no column, the washers and grip Jeff set aside on 11-19) is listed in the
   lesson as left out, with the reason.

5. **The page.** The study is listed under model v2 where v1's is listed
   under v1, and opens to the same views (`apps/viewer/views/kinematic.js`:
   verdicts, the envelope chart, a stop's stack as the grid with the
   sensitivity column). `scripts/build_kinematic_projection.py` builds both
   studies. On v2's grid a reader can tell, without opening anything, three
   kinds of row apart: valued on this model's own edge, valued from the other
   model's edge, and no value yet. Use a short badge of everyday words, never
   a sentence and never an internal name; the row opens to the citation or to
   what is missing. Every surface the fact reaches: the nav's study row, the
   verdict line, the grid, the gap card (`views/kinematic.js`, about :1284),
   and the line under the grid that today reads "Nothing is recorded as
   missing for this assembly." on a model with no values
   (`docs/issues/ISSUE_20261120_design_the_gap_panel_says_nothing_is_missing_on_a_model_with_no_values.md`):
   with this study it must not say that on v2. A page never describes itself:
   no caption about what the study is or how to read it.

6. **Selected, the study is a lit route on the map.** v1's study already
   lights its contributors and the edges they cite
   (`apps/viewer/tests.js`, "a kinematic study lights its contributors and
   the edges they …", about :11445; the map's lighting by key is
   `apps/viewer/views/map.js`, about :116). Measure what the map does for
   v1's study today, then make v2's light the same way: the six contributor
   edges, every added row of deliverable 4, and each leaf edge of the stop
   stacks that v2 has under the same id. Jeff, 11-19: "a study simply traces
   a subset". What is not on the route stays readable, only quieter. No new
   control.

## Definition of done

- `python -m pytest tests/test_kinematic.py` green, with new value-level
  coverage: (a) **parity** — with the six contributors and the borrowed
  bands, v2's study folds to the same total and the same per-contributor
  terms as v1's at both stops and for the range, compared by computing both
  in the test, never by restating digits; (b) each added row carries a
  sensitivity and enters no term; (c) a sweep feature naming any topology
  other than the study's own or its `ids_from` still refuses. v1's existing
  pins unchanged. The gate you run is the repo's changed-since tier; do not
  add a tier.
- The viewer's suites that read the kinematic projection are green, and the
  map's "[real] the map draws the model's counts" still reports zero notes
  on v2.
- **Looked at with vision.** Rebuild the projections from your tree into a
  scratch data root (a copy of `C:\workspace\tolstack\data\inbox`,
  `data\meshes` and `data\projections` under
  `C:\workspace\tolstack\data\scratch\study_v2\`; the walk of 11-19 did the
  same, `docs/sessions/lessons/LESSONS_20261119_the_walk_reads_the_links_and_the_pitch_plate_stack_on_the_merged_page.md`,
  "How the tree was served"), serve it on a scratch port, never on 8000, and
  never press Rebuild on 8000. Shots at 3840 and 1536 wide of: v2's nav with
  the study row, the verdicts, the +72 stop's grid, the gap card. Read each
  shot before citing it. After the merge the same is seen at
  `http://127.0.0.1:8000/tolstack/viewer/topology.html`, model v2.
- Jeff's binding log is byte-for-byte what it was when you started (count and
  hash before and after, in the lesson). It will have grown by his own hand
  if he bound during your run; say which case it was.
- Lesson (`docs/sessions/lessons/LESSONS_20261122_the_blade_pitch_study_folds_on_v2_and_names_what_v2_adds.md`):
  the contributor table as authored; the added-rows table of deliverable 4
  and the left-out list; the two numbers at each stop (v1's and v2's, equal);
  whether a shared column or a cross-model `study_ref` needed code; what the
  next two links (the drawings' citations) must switch from borrowed to own,
  by edge id.
