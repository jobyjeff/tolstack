---
priority: high
depends_on: [rotorkit/the_piston_cover_214958_002_is_extracted_from_217755]
model: opus
hitl: false
---

# HANDOFF 2026-11-08 — model_v2_is_the_end_stop_linkage_in_five_bodies_and_the_nav_switches_models: a second topology holds the end-stop linkage as five rigid bodies, one blade, one pitch link and one tangential link, with no tolerances yet; the nav lists models and opens this one

Source: Jeff's forge note `20261108T001814_kpoev0` (2026-11-08) and his "Go,
stage M1" the same night. His words: *"Let's create a new, simpler version of
the model, focusing on just the kinematic end stop tolerance. We can model each
rigid body as a chained stack with a single component … trying to mash all of
these studies (all the fastener grip length stacks etc) is just creating way
too much unnecessary complexity which is making it difficult to debug things
like the dag layout and formatting."* — *"we discussed making the top node the
'model', but I don't see any way to switch between models in the tolstack app.
We'll need to add that."* — *"I do still want to get all of the correct 3d
bodies into the model from the start. This means adding the piston cover, but
we should model just a single blade, pitch link, and tangential link to start
out to help declutter things."* The strategy plan this is the first rung of is
`C:\workspace\dispatch\docs\strategy\drafts\DRAFT_tolerance_analysis_over_the_kinematic_model.md`,
section "2026-11-08 — the reset" (M1). **This handoff adds no tolerance and no
study.** M2 adds one placeholder term per body; this rung is the graph, the
3D, the DAG and the switcher, judged by eye.

Baseline: trunk `master` after the 11-05 batch, merged with `integration`
(`the_kinematic_study_reads_the_republished_sweep…`,
`the_linkage_play_control_is_the_only_one…` and
`a_kinematic_row_shows_the_numbers_the_fold_uses_or_refuses` may be in flight —
merge `integration` before you measure). The cover mesh is installed by the
rotorkit dependency; its lesson names the `mesh_part_id` and the alias row.
Scope: `docs/topologies/` (one new file, one alias row), `tolerance_stack/topology.py`
only if the new part field needs it, `scripts/build_topology_projection.py`,
`apps/viewer/views/nav.js`, `apps/viewer/topology_app.js` (boot + switcher),
`apps/annotate/` (the one occurrence rule below), `docs/DAG_TOPOLOGY.md`,
`docs/ANNOTATION_SURFACE.md`, `CLAUDE.md`'s one-topology sentence, tests. Do
NOT touch `topology_vpa_pitch_linkage.json` or any existing study, the kinematic
study loader, the play transport, colours or the grid's value columns.

## The model, decided

1. **File and identity.** `docs/topologies/topology_vpa_end_stop_v2.json`,
   `schema: joby.tolerance_stack/topology/v0`, `id: vpa_end_stop_v2`, title
   per the SOP's titling rule (a short noun phrase — e.g. "End-stop pitch
   linkage, one blade"), `units: mm`, `provenance` naming this handoff, Jeff's
   note id and the P2 sweep. **Studyless** (`docs/DAG_TOPOLOGY.md`, "A topology
   with no studies is a document kind, not an unfinished one") — M2 adds the
   study.
2. **Five mechanism bodies, exactly linkage's.** `base`, `blade`, `pitch_plate`,
   `pitch_link` (`kind: link`), `tan_link` (`kind: link`), with the part lists
   `C:\workspace\linkage\linkage\vpa.py` names (`BODY_PARTS`, `LINK_PARTS`) —
   `tests/test_topology.py::test_the_mechanism_bodies_are_linkages_own` pairs
   them when linkage is on disk, and the v1 file is the worked example
   (`base`: hub, tan_link_mount_215175_002, gas_spring_mount_213668_002;
   `blade`: blade_root, pitch_arm; `pitch_plate`: pitch_plate_215177_001,
   gas_spring_piston_214700_002; `pitch_link`: pitch_link + its spherical
   bearing; `tan_link`: tan_link_212956_005 + its two bearings, the declared
   difference v1 already records). **Three riders**, as in v1:
   `piston_head_lower_214699_002` and `piston_head_upper_214698_002` ride
   `pitch_plate`; `piston_cover_214958_002` rides `base`. Jeff's "the base
   consists of hub assy, tan link mount assy, gas spring mount assy, piston
   cover" is honoured by the rider — the cover moves with the base and is a
   body of its own because the linkage pairing test lists three base parts.
   **Nothing else**: no gas spring, no VPA, no piston, no ring gear, no
   hydraulic brake, no fastener, washer or bushing parts. "All or nothing"
   (`DAG_TOPOLOGY.md`, "Bodies") then holds with far fewer parts.
3. **Nodes and edges: the joints only, and reuse v1's ids.** The P2 sweep
   artifact (`C:\workspace\tolstack\data\inbox\linkage-sweeps\vpa-pitch-p2-20261105-204957.json`,
   `geometry.features[]`) names ten v1 nodes by body:
   base → `gas_spring_mount_bushing_bore`, `hub_blade1_root_bearing_bore`,
   `hub_spindle_bore_axis`, `tan_link_lower_sphere_centre`; blade →
   `hub_blade1_root_bearing_bore`, `pitch_link_lower_sphere_centre`;
   pitch_plate → `gas_spring_piston_body_od`, `pitch_link_upper_sphere_centre`,
   `pitch_plate_spindle_bore_axis`, `tan_link_upper_sphere_centre`. **v2 uses
   these exact node ids**, so the same sweep binds without a republish, and
   **reuses v1's edge ids for every joint edge that exists in v1** (the slide
   on the 213668-002 bushings against the 214700-002 piston body, the blade
   hinge, the two link length edges, the two spherical-joint gap edges, the
   feather-stop and low-stop contact pairs). A `feature-identity/v0` binding
   names a topology edge (`feature_identity.StackKey`), so reusing the id is
   what carries Jeff's existing bindings into v2 — list in the lesson which
   bindings carried and which edges of v2 are new and unbound. Edges carry **no
   `dimension`** (v1's cite-or-gap note applies: a valueless edge's `note` says
   what would close it). Add the stop faces as nodes (the cover's −7° stop
   face, the mount's +72° feather stop face, the two piston-head faces) since
   M2's terms end there.
4. **One blade, one pitch link, one tangential link.** The annotator draws a
   part at every recorded occurrence (`docs/ANNOTATION_SURFACE.md`, "Where a
   part is drawn": the tangential link three times, the pitch arm five). v2
   declares which: a `part` may carry `"occurrence": <the recorded
   occurrence's key or index, in the sidecar's own terms>` and the scene draws
   **only that one** for a part so declared, in and out of sweep mode, while a
   part without the field keeps the every-occurrence rule — v1 is unchanged.
   Which occurrence: blade 1 (v1's title already says "blade 1"; the sweep's
   `hub_blade1_root_bearing_bore` node names it) and the pitch link and
   tangential link that attach to it — read the placements, pick the pair
   nearest blade 1's pitch-arm sphere, and record the choice with its
   `placement_world` in the part's `note`. Document the field in
   `ANNOTATION_SURFACE.md` under "Where a part is drawn" and in
   `DAG_TOPOLOGY.md`'s format section (additive, stays `/v0`).
5. **The nav lists models and opens v2.** `VA.renderNavTree`
   (`apps/viewer/views/nav.js:70-85`) already iterates `tree.topologies`; the
   boot (`topology_app.js:583-592`) falls back to `topologies[0]`. Make the
   topologies a titled **Models** section with v2 **first** (projection order
   is the builder's; sort v2 first or give the file an explicit `order`), each
   model's studies and kinematic studies nested under it so switching models
   switches everything below; a deep link `?topology=` still wins; the last
   chosen model is remembered (`localStorage`, the annotator's own key style)
   so a reload lands where Jeff left it. The 3D pane follows the model
   (`every_study_opens_in_3d_showing_only_its_parts`, 11-03: the scene is
   filtered to the open thing's parts — v2's part set is the filter).
6. **Docs say so.** `CLAUDE.md`'s "Since 2026-10-26 there is one topology per
   product" becomes "one topology per *model*; the model is the top node of
   the nav (2026-11-08)"; `DAG_TOPOLOGY.md` gets the same sentence and a short
   "Models" paragraph naming v1 and v2 and what v2 leaves out; its committed
   examples section gets v2's row. Any claim or test that counts topologies
   (`tests/test_kinematic.py:951`'s "one topology" wording,
   `tests/test_topology.py:1057`'s "the one topology that declares bodies")
   is re-pinned to the new truth, never deleted.

## Definition of done — by eye, on the merged tree, then by test

- In the main checkout, projections rebuilt (`scripts/rebuild_projections.ps1`),
  served at `http://127.0.0.1:8000/tolstack/viewer/topology.html`: the nav's
  Models section lists v2 and v1; v2 opens by default; the **DAG is five body
  containers in one loop** (base — blade — pitch link — plate — tan link —
  base, the stop pairs hanging off base and plate), no container around the
  whole model, no edge spanning the graph's height, and **no label overprinting
  a label at the default zoom** — take the shot at 1600 and 2560 wide.
- The 3D pane on v2 draws **one** blade, pitch arm, pitch link and tangential
  link, the hub, both mounts, the plate, the piston body, both heads **and the
  cover** (the rotorkit mesh through the new alias row), and every bound joint
  node sits on its face — the lesson's still must show no node floating in
  space; where a v2 edge is new and unbound, its node is drawn as unbound and
  the lesson lists it. Play the sweep from the pane: the five bodies move, the
  cover moves with the base, the heads with the plate.
- Switch to v1 and back: v1 renders exactly as before this handoff (pin one
  v1 DAG screenshot before you start and diff it after).
- Fast tier, `node apps/viewer/run_tests.cjs`, `node apps/annotate/run_tests.cjs`,
  the browser tier green in the main checkout; `--changed-since integration`
  witnesses pass; the linkage pairing test passes for v2 too.
- Lesson (`docs/sessions/lessons/LESSONS_20261108_model_v2_is_the_end_stop_linkage_in_five_bodies_and_the_nav_switches_models.md`):
  the merged-page screenshots above (this is what Jeff reads — the DAG at two
  widths, the 3D at rest and mid-sweep, the nav with both models), the
  node/edge table (v1 id reused / new), the bindings that carried, the
  occurrence chosen for each single part with its placement, and anything
  about the five-body layout that the layout code got wrong even at this size
  (that is M2's input, stated rather than fixed here).
