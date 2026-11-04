# LESSONS 2026-11-03 — the_slide_joint_is_the_mounts_bushings_against_the_piston_body

Handoff: `docs/sessions/HANDOFF_20261103_the_slide_joint_is_the_mounts_bushings_against_the_piston_body.md`.
Source: Jeff's forge note `20261103T165357_43vf96`, plus one answer he gave
live during this session (below). Every mesh number here was measured at the
parts' recorded assembly occurrences in the main checkout's `data/meshes/`.

## Old joint vs new

| | before (trunk) | after (this branch) |
|---|---|---|
| slide edge | `gas_spring_bushing_coaxiality`: `hub_spindle_bore_axis` → `gas_spring_mount_bushing_bore`, `cylindrical_slide` | `pitch_plate_slide_bushings_to_piston_body`: `gas_spring_mount_bushing_bore` → `gas_spring_piston_body_od`, `cylindrical_slide` |
| ground end | the hub, "hub spindle bore axis -- the gas-spring bushing bore" | 213668-002 mount, `hardware_ref: GR04WB328AT11`, face declared on the mount (cylindrical) |
| moving end | `gas_spring_mount_bushing_bore`, on `[mount, gas_spring]` | `gas_spring_piston_body_od` on 214700-002 (body `pitch_plate`, already a member) |
| hub node | two interfaces in one name | "hub spindle bore axis"; edges unchanged |
| plate end | "pitch plate spindle bore axis" (it is a boss) | "pitch plate pilot boss axis", face declared on the plate (cylindrical) |
| new | — | `pitch_plate_pilot_in_piston_id` (plate boss Ø41.04 in piston ID Ø41.072) + structural `piston_body_id_datum_to_od` on the piston |
| re-pointed | `gas_spring_installed_length` from the bushing bore | from `gas_spring_mount_flange` (the gas spring's own grounded end) |

**The dropped half of the hub's name** ("the gas-spring bushing bore") is
**gone**, not moved to a new node. Those bores are the mount's, and they
already had a node (`gas_spring_mount_bushing_bore`), which now sits on the
mount alone.

**Jeff's live answer (2026-11-03)** to "which part of the pitch plate's body
carries its axis face":

> The tabs on the pitch plate have 4 surfaces that make up a broken 41.04mm
> diameter boss (both sides of both tabs), and the piston has an ID datum with
> a 41.072mm […]. The piston's 47.574mm OD is what interfaces with the gas
> spring bushings. Those dimensions are from the 2d drawings, CAD might be
> slightly different.

The mesh matches him:

- plate boss faces 487/521: r 20.520;
- piston ID faces 33/34: r 20.536, concave;
- piston OD faces 166/167: r 23.787, convex (Ø47.574).

None of these is cited as a value. They appear in notes only. 214700-002 is
not in the drawings inbox.

**The hardware ref.** 217755 A's parts list carries `GR04WB328AT11` as find 45,
"TRELLEBORG SLYDRING, SIZE -328, TURCON T11", qty 2, sheet 6 DETAIL W (read
from drawing-checker's run `20260723_163810_217755_A.1…`). It is now a
`not_transcribed` hardware entry, with the claim counts moved 29→30, 4→5 and
28→29. A new `test_every_node_hardware_ref_resolves_to_a_hardware_entry`
holds nodes to the SOP's Step 4 rule.

## The schema word (deliverable 4)

`Node.face = {part, surface}` (`NODE_FACE_FIELDS`), plus `Node.hardware_ref`.

- `part` must be one of the node's own parts.
- `surface` must be one of `FITTED_SURFACE_CLASSES`.
- Where `face` is declared, it answers before the name: in
  `build_contact_suggestions._end`, in `propose_bindings` (both its
  wrong-part and its wrong-shape checks), and in
  `fg.end_surface_class(..., declared)`, which returns `where: "declared"`.
- Both fields reach the topology projection's node rows.

The handoff's phrase "which part of the body the face is on" turned out to
mean **one of the node's parts**, not another member of the body. Jeff's
answer put the plate end's face on the plate. A Slydring's face is bound on
the mount that holds it, and the ring itself is named in `hardware_ref`.

The annotator does **not** read `face` yet (apps were fenced):
`ISSUE_20261103_the_annotator_does_not_read_a_nodes_declared_face.md`.
Declared on four nodes only: the slide's two ends, the plate's axis and the
plate's pilot.

## Where the mount's placement came from (deliverable 3)

**It is from source, not from mates.** rotorkit's
`assembly_extract_20261001T022446Z` had already recorded 213668-002's
occurrence:

- `report.json` coverage: instance `213668-001.1`, at path
  `217755-001/prd-e-03300520.1/215176-001.1/213668-001.1`, `placement_world`
  = identity;
- outcome `validation_only`, `identical_face_table: true` against our
  `6d5b1321…`.

rotorkit never installed the occurrence, because the single-part mesh was
already in the store with the same face table. So "not in the 3D model" was a
store gap, not a missing occurrence in the STEP.

**Frame check.** All 1927 B-rep `VERTEX_POINT`s of the run's
`parts/asm217755_213668_002.stp` are within 9e-6 mm of a vertex of our mesh,
so the two frames are one. The placement is also corroborated by geometry:

- at identity, the mount's r 25.387 seat grooves are coaxial (0.000 mm) with
  the piston's OD at the piston's own recorded occurrence;
- the axial ranges overlap.

**What was written:** an `extraction` block (kind `xcaf_product_validation`) in
`C:\workspace\tolstack\data\meshes\6d5b…\provenance.json`. It carries the
instance verbatim and a `placement_source` naming the run, the validation and
the vertex check. The pre-edit file is saved in this session's scratchpad.
`data/meshes/README.md` and `fit_bound_features.py`'s docstring no longer say
the mount has no occurrence.

**The no-`needs: jeff` ask was not filed:** a source places the mount.

## Contact suggestions and proposals, before → after

Before: the live projection, built 2026-11-03 00:15 from master `03880aca`.
After: built from this branch into a scratch data root, with meshes read from
the main checkout. **The shared projection was not written.** Rebuild it in
the main checkout after merge.

| | before | after |
|---|---:|---:|
| gap edges | 17 | 17 |
| ok | 10 | 11 |
| no_occurrence | 1 (`gas_spring_bushing_coaxiality`) | **0** |
| no_contact | 2 | 2 |
| no_mesh | 4 | 4 |
| single clear top | 3 | 4 |

- **`pitch_plate_slide_bushings_to_piston_body`:** 1 candidate, `contact`. It
  pairs the mount's r 23.971 bore lands (113/121/129/629/631/633) with the
  piston OD (166/167), at clearance 0.184 mm.
  - The engine cannot see the Slydring seats (r 25.387, a 1.6 mm wall),
    because the rings are not in the mesh.
  - Proposed: **0056**, `from` face 53 (lower seat groove, `medium`; the groove
    pair is read from the 1.6 mm wall, not from a drawing), and **0057**, `to`
    face 166 (`high`).
- **`hub_to_pitch_plate_spindle_coaxiality`:** 10 candidates, as before, all
  pairing the plate's r 16.5 boss. **Not re-proposed.** The plate's real boss
  faces 487/521 fit `other`, so a proposal on them is refused for shape
  (`ISSUE_20261103_a_two_row_cylinder_band_fits_other_so_the_plate_pilot_boss_cannot_be_proposed.md`).
  The standing proposal 0055 on face 439 is the wrong feature, and only a
  human can reject it
  (`ISSUE_20261103_reject_the_pitch_plate_centre_proposal_on_the_small_boss.md`, `needs: jeff`).
- **Deleted edge:** no event in the log named `gas_spring_bushing_coaxiality`
  (checked over all 55). So there was nothing to supersede, and nothing is
  orphaned.
- **Proposal log:** 55 → 57 events.
- **The mount's three interfaces** the handoff names (`gas_spring_mount_hub_face`,
  `endstop_feather_contact`, `tan_link_mount_gas_spring_seat`) are
  *mating-surface nodes*. The engine runs on gap edges only
  (`ISSUE_20261029_contact_suggestions_run_on_gap_edges_only.md`), so they
  never had a `no_occurrence` row of their own. What the placement changes is
  the slide's row, and the mount is now drawn.

## What the tipping term would need

The term is clearance over spacing, as a `disk` tilt on `plate_slide`'s axis
components. It needs three inputs, none of which can be cited yet:

- the Slydring's installed ID band (no datasheet);
- 214700-002's OD band (no drawing);
- the ring spacing, about 28 mm between the groove centres in the mesh, which
  213668-002's drawing would cite.

Filed with the ask:
`ISSUE_20261103_the_bushing_tipping_term_needs_the_slydring_and_piston_body_bands.md`.
The studies' "bushing tipping" notes are still true and were left alone.

## Gotchas

- **The rail's joint ends come from linkage, not from the topology.**
  `linkage/linkage/vpa.py` `JOINT_FEATURES` joins `plate_slide` to
  `hub_spindle_bore_axis`/`pitch_plate_spindle_bore_axis`. So the DoD's
  "slide listed on 213668-002 and 214700-002" waits on a linkage republish
  (`ISSUE_20261103_linkages_plate_slide_still_joins_the_hub_and_the_plate.md`).
  The node ids were kept for that reason.
- **Don't re-dump the topology JSON.** It mixes inline and expanded objects,
  and `json.dumps(indent=2)` re-flows ~280 lines. Patch the spans: the
  scratch editor replaced each object's text by its `"id"`.
- **Layout pins moved:**
  - `layout_crossings` went from 16/81/62 to 16/68/52;
  - the product walk went from 169 to 172 rows (`apps/viewer/tests.js`'s
    `[real]` pin, updated);
  - the kinematic lit set and its bridge are unchanged: 21 edges / 21 nodes,
    hidden walk 42×8. This was checked with a Python replica of
    `VA.closeLitSet` + `VA.bridgeLitSet`, which reproduces trunk's pin
    exactly.
- `build_contact_suggestions.py` took **5 m 56 s** (it was ~2 m 18 s on
  10-29). The mount's 1083 faces now join the axis edge's every-face
  comparison.

## Verification record

- **Full suite**, in this worktree: `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -p no:cacheprovider`
  (no xdist in the venv, single process). Result: **4 failed, 1697 passed,
  1 skipped, 2 deselected**, wall time 6 m 14 s, recorded `inside budget`.
  Two of the four were real and are fixed since:
  - the witness anchor on the `not_library` claim, re-pointed 28→29;
  - two `PROVENANCE.md` rows, amended.

  Those two files then passed on a rerun (54 passed).
- **The other two, and why they are red here:**
  - `test_viewer_js_suite`: the deliberate worktree red (the browser and
    `[real]` tiers are main-checkout only).
  - `test_contact_suggestions.py::test_real_the_live_projection_has_the_schema_and_a_row_per_gap_edge`:
    it reads the main checkout's projection, which was built from trunk and
    still has `gas_spring_bushing_coaxiality`. Against this branch's
    scratch-built projection (copied into the worktree's `data/` for the run,
    then removed) the file is **14/14**.
- **Mutation witness** `--only "the projection this tier reads was built from
  this tree"`, the one spec whose anchor this branch changed: **0/2, "the tier
  was red before the mutation"**.
  - That is the guard itself firing. The main checkout's projections predate
    this tree's `hardware_entries.json`.
  - It can only be witnessed after the post-merge rebuild
    (`scripts/rebuild_projections.ps1`, which goes BEFORE the four tiers).
- **Not run:** `node apps/viewer/run_tests.cjs`, `node apps/annotate/run_tests.cjs`
  and the browser TRUTH tier, against a projection rebuilt from this tree.
  They need the shared projections, and this branch did not write them. The
  one `[real]` pin this change moves (169→172 layout rows) was updated from
  the Python replica above.

## Screenshots

`docs/sessions/shots_20261103_the_slide_joint_is_the_mounts_bushings/` was
taken by `tests/debug_slide_joint_shots.mjs` against the live server on
8000. That server runs trunk's code and projections over the main checkout's
data, so it already sees the mount's new sidecar. The four shots:

- `1_kinematic_study_scene.png`: the kinematic study with the 3D pane open.
- `2_base_body_rows.png`: the rows of the `base` body.
- `3_mount_isolated.png`: **213668-002 drawn**, alone, at its recorded
  occurrence, inside the linkage's joint lines at the hub seat. Before this
  session it was drawn nowhere.
- `4_joints.png`: meant to show the open joints group. The chip toggled and
  the list did not open.

What the shots cannot show yet:

- **The rail's hub row reading "hub spindle bore axis".** The live
  projection is trunk's. It appears after merge and
  `scripts/rebuild_projections.ps1`.
- **The slide listed with its ends on 213668-002 and 214700-002.** This also
  waits on linkage
  (`ISSUE_20261103_linkages_plate_slide_still_joins_the_hub_and_the_plate.md`).
