# LESSONS 2026-11-08 — model_v2_is_the_end_stop_linkage_in_five_bodies_and_the_nav_switches_models

Model v2 (`docs/topologies/topology_vpa_end_stop_v2.json`) is committed: five
mechanism bodies, three riders, one blade / pitch link / tangential link, the
two stops, no tolerances, studyless. The nav lists **Models**, opens v2 by
default, remembers the last model, and the 3D pane draws v2's declared parts
once. v1 renders exactly as before (checked as markup, below).

## The shots (what Jeff reads)

All in `shots/model_v2_is_the_end_stop_linkage_in_five_bodies_and_the_nav_switches_models/`,
taken by `node tests/debug_model_v2_shots.mjs` against projections built from
this branch into the main checkout's gitignored `data/scratch/model_v2/` (the
stale-data banner on them is that harness: the scratch topology projection is
newer than the main checkout's other projections — not a page defect).

| shot | what it shows |
|---|---|
| `1_nav_and_v2_dag_1600.png` | the nav: MODELS — v2 open (its tag chip, its *Kinematic model* row), v1 folded to one row; STACKS below |
| `2_v2_dag_1600_full.png`, `2_v2_dag_2560_full.png` | v2's whole DAG at both widths (viewport-only `2_v2_dag_*.png` beside them) |
| `before_v1_dag_1600.png` / `3_v1_dag_1600_after.png` | v1 before this handoff and after |
| `4_v2_3d_at_rest.png`, `4b_v2_3d_at_rest_mechanism.png` | the 3D pane on v2 at rest, framed on the whole drawing and on the mechanism (the cover is the tall cylinder) |
| `5_v2_3d_mid_sweep.png`, `6_v2_3d_low_stop.png` | the P2 sweep playing **on v2** (the rail says v2), mid-sweep and at the low stop: 21 of 21 parts placed |

**v1 unchanged, measured, not eyeballed:** the drawn rails SVG plus every grid
row of `?topology=vpa_pitch_linkage`, dumped from integration's `apps/` (main
checkout's projection) and from this branch's (scratch projection): 146,769
bytes each, `cmp` identical. (`--dump-v1` on the debug script; pixels would
have differed by the banner alone.)

**Draw counts on v2** (the scene's own matrices): blade root, pitch arm, pitch
link, tangential link, its two bearings, hub, both mounts, plate, piston, both
heads and the cover — **1 each**, at rest and mid-sweep. The pitch-link
bearing draws 2 (one per end of blade 1's link, both under `213862-002.1`).
The tangential link's carried inner link `213863-004` draws 3 at rest and 1
in sweep: at rest it is not a v2 part and is only the faint context below.

## Nodes and edges (v1 id reused / new)

All 23 nodes are v1 ids. 25 of 27 edges are v1 ids; two are new, both inside
the pitch-plate body, because v1 joins the plate and the piston only through
its bodies list and a DAG needs an edge to hold the body together:
`pitch_plate_pilot_in_piston` (gap, `pin_in_bore`, plate spindle axis → piston
ID datum) and `piston_body_id_datum_to_head_seat` (structural, piston body).
Stop faces: `endstop_feather_contact` (+72°, one mating node — the lower head
touches the mount there, so per the hard-contact rule it is one node, not a
pair), `piston_head_upper_step_face` and `piston_cover_end_stop_shoulder`
(−7°), with `travel_between_end_stops` the clearance between them.
`tests/test_topology.py::test_a_model_that_reuses_anothers_ids_means_the_same_feature_by_each`
holds every shared id to the same kind, ends, part and interface as v1's.

Left out of v2 although v1 has events on them: `pitch_plate_attach_height`
(parallel to `pitch_plate_attach_radius`, same two nodes — one edge per body
chord is enough to place them), the bearing sub-graphs
(`*_centre_is_this_bearing`, ball-centre offsets, `pitch_link_eye`) and every
hardware edge.

## Bindings — what carries, and the surprise

**The handoff's premise was half right.** A `feature-identity/v0` key is
`(topology_id, edge_id)`, and the annotator filters on `topology_id` — reusing
the edge id alone carries nothing. Decision (not in the handoff): v2 declares
`"ids_from": "vpa_pitch_linkage"`, and the annotator reads v1's records on
shared edge ids as v2's until v2 has its own (`AA.identityReadThrough`, behind
`mergedIdentityProjection`, read-only). The same field makes a v1 sweep play on
v2 when v2 is open (`AA.sweepPlaysOn`) and gives studyless v2 the *Kinematic
model* row on v1's newest run. Documented in `DAG_TOPOLOGY.md`, "Models".

Edges of v2 with events in the log under v1's id (so they carry):
bound — `pitch_link_length`, `tan_link_length`,
`hub_to_pitch_plate_spindle_coaxiality`,
`pitch_plate_slide_bushings_to_piston_body`; proposals only —
`hub_spindle_to_tan_link_mount_face`, `tan_link_mount_height`,
`gas_spring_mount_flange_to_end_stop`, `pitch_plate_attach_radius`,
`pitch_plate_tan_link_attach_radius`, `piston_head_lower_thickness`,
`piston_head_upper_thickness`, and the four spherical joints.
New and unbound: the two new edges above, and every other v2 edge with no
events (`hub_blade_axis_offset`, the mount and cover structurals, the blade
and arm structurals, `piston_body_id_datum_to_od`,
`piston_head_lower_face_flatness`, `travel_between_end_stops`).

**What the shots cannot show: no node sits on a bound face**, in v1 or v2,
because the bindings projection the page reads is from 2026-11-05 and holds
proposals only. It cannot be rebuilt: four events share a seq (Jeff's
2026-11-06 accepts of both link lengths collide with agent proposals 56–59),
and after renumbering those in a scratch copy the fold finds a proposal
answered twice. Filed high:
`docs/issues/ISSUE_20261108_four_feature_identity_events_share_a_seq_so_the_bindings_projection_cannot_be_rebuilt.md`.
The read-through itself is shown working in the pane (15 v1 records answered
under v2) and by `apps/annotate/run_tests.cjs`.

## Occurrence chosen for each single part

`part.occurrence` = the sidecar's `instance_path` joined with `/`. Each part's
note carries its `placement_world`.

| part | occurrence (tail) | why |
|---|---|---|
| `blade_root` | `prd-e-03372837.1/211587-001.3` (recorded on the instrumented `asm217755_551438_001`) | blade 1; the design mesh's only own occurrence is another blade |
| `pitch_arm` | `prd-e-03372837.1/prd-e-03262343.1/215071-001.2` | blade 1's arm: rotation about CAD X alone |
| `pitch_link` | `prd-e-03478612.1/213862-002.1` (on instrumented `asm217755_546293_002`) | blade 1's link; lower ball at (83.000, −44.550, −22.700) |
| `tan_link_212956_005` | `prd-e-03478614.1/prd-e-03438709.1` | plate-end ball nearest blade 1's pitch-arm ball (115.6 mm vs 118.4, 203.3) **and** the one P2 poses |
| `spherical_bearing_tan_link`, `…_ms14103_3` | the two bearings under that link | follow the link |

The handoff's heuristic and the sweep agree for the tangential link only by
the plate end; by the mount end the `.2` link is nearer (133 mm vs 170). The
sweep must win: a pin that disagreed with the solver's own joint point would
leave the pinned part unmatched in sweep mode. A pinned part can earn only its
declared occurrence in sweep mode, and under any pin a mesh only carried inside
a moving occurrence draws where it is carried.

## What the layout gets wrong at five bodies (M2's input, not fixed)

Filed as `docs/issues/ISSUE_20261108_model_v2s_five_body_dag_draws_a_column_not_a_loop.md`
(audience strategy, with options): no loop is drawn — the walk stacks base,
tan link, plate, heads, cover, pitch link, blade; the blade-hinge rail spans
the graph's whole height; the lower-head label sits on the plate container's
edge and the one-row riders' labels sit on rail glyphs; the grid starts half
way down and is clipped at 1600. No container wraps the whole model — that one
holds.

## Gotchas for the next agent

- **The annotator's mesh aliases come from `annotate.json`**, copied by
  `build_kinematic_projection.py`, not from `docs/topologies/part_mesh_aliases.json`
  directly. A new alias row is invisible to the 3D pane until the kinematic
  projection is rebuilt — the cover did not draw until I rebuilt it.
- **Paths over 260 characters fail silently in Python's `Path.is_dir()`**: a
  scratch data root under the session scratchpad found 0 meshes through a
  junction. Use the main checkout's `data/scratch/` (short) instead.
- `rebuild_projections.ps1` does not run `build_feature_identity_projection.py`,
  which is how the bindings projection could go stale for three days unnoticed.
- The nav only expands the open model when there are two or more; with one (or
  none open) it lists everything, so single-topology fixtures render as before.
- Two dedent-rotted mutation anchors in `views/nav.js` were re-pointed
  (`browser__real-the-mechanism-tree…`, `browser__the-tour-opens-a-kinematic-study…`),
  and the renamed nav guard's spec replaced.

## Scratch left in the main checkout

`data/scratch/model_v2/` and `data/scratch/model_v2_root/` (gitignored; junctions
to `data/meshes`, `data/inbox`, `data/projections/parts`,
`data/projections/feature-identity`, plus projections built from this branch).
Kept for the reviewer to re-run the shots and the `[real]` tiers against;
delete with `rmdir` on the junctions first.
