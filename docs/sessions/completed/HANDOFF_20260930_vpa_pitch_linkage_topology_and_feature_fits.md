---
priority: high
depends_on: []
model: opus
---

# HANDOFF 2026-09-30 — vpa_pitch_linkage_topology_and_feature_fits: a topology of the pitch linkage's joints for Jeff to bind in the annotator, and a fit that turns a bound sphere or bore into an assembly-frame centre or axis

Source: Jeff, live, 2026-09-30, founding the `linkage` solver repo: *"the
agent could build the original tolerance stack with the components I
outlined … (doesn't need to have any actual studies, just needs to have the
right components). Then I could use the tolstack 3d annotator to select the
spherical centers. Might as well also select the hub/gas spring bores even
though I'm fairly confident they're aligned with z and x axes. Initial
locations can be pulled from 217755 which is modeled at 72deg (against the
feather hard stop)."* The fitted centres and axes are **source B** for
`C:\workspace\linkage\docs\sessions\HANDOFF_20260930_pitch_sweep_spike.md`
(source A is the 3DX sweep sheet); the two are compared there, not here.

Baseline: trunk `master` after the 2026-09-30 batch. Scope:
`docs/topologies/` (one new topology document + alias rows),
`scripts/fit_bound_features.py` (new) + `tolerance_stack/` support,
`apps/annotate/face_geometry.js` + `suggestions.js` (sphere kind, item 4),
`tests/`, `docs/ANNOTATION_SURFACE.md`, `docs/DAG_TOPOLOGY.md` (one
paragraph). Do NOT touch `apps/viewer/**` or `scripts/build_topology_projection.py`'s
layout code (two parallel viewer handoffs own them); do NOT run or modify
rotorkit's extraction (rotorkit `HANDOFF_20260930_extract_pitch_linkage_parts`
installs the missing meshes; this handoff must work on the meshes installed
**today** and simply gain parts when those arrive).

## What the solver needs from this repo, in one sentence

Nominal joint geometry in the **assembly frame at 72° pitch**: the two
pitch-link spherical-bearing centres (blade 1), the spindle / gas-spring
bushing axis (expected CAD Z), the blade-1 root bearing axis (expected CAD
X), and, for phase 2, the tangential link's two sphere centres — each as a
fitted nominal with its provenance (mesh sha, face id, instance path,
placement, fit residual). **Not a tolerance, ever**: a fitted nominal is
`source_ref.kind = "mesh"`, and the cite-or-gap rule for tolerances is
untouched (CLAUDE.md; `DAG_TOPOLOGY.md` "Not a solver" — this repo still
computes no pose; it measures a mesh).

## The parts and what is installed (2026-09-30)

Rigid bodies per Jeff, with the 217755 A.1 / 216231 B.1 / 213862-002 A parts
lists (drawing-checker runs) supplying the drawing numbers:

| body | parts | mesh today (`data/meshes` `part_id`) |
|---|---|---|
| base | hub `214373-002` (hub assembly), tangential-link mount `215175-001` (detail `215198-001`), gas-spring mount `213668-002` | `asm217755_215175_001`, `asm217755_215198_001`, `machined_213668`; **hub not yet** (rotorkit handoff) |
| blade (+ pitch arm) | blade `216332-001` (`551438-001` instrumented), pitch arm `215071-001` | `blade_oml` (clean OML, separate STEP); **pitch arm not yet** |
| pitch link assy `213862-002` | body `213861-002` + 2× `MS14101-3` | bearings = **`asm217755_MS14101_3_9bfdb344`** (instance paths `213862-002.1/MS14101-3.1`, `.2` — this is the *pitch-link* bearing geometry); **body not yet** |
| pitch plate + piston | `215177-001` install (detail `215735-001`), gas spring `PMF200521` (body + rod) | `asm217755_215177_001`, `asm217755_215735_001`, `asm217755_PMF200521` |
| tangential link assy (phase 2) | `212956-005` *PITCH ANTI ROTATION LINK ASSEMBLY* ×3 = link `213863-00x` + `MS14101-3` (`_84a75703` geometry) + `MS14103-3` | all installed |

**Correction to carry into the alias table's notes and the 09-15 lesson's
candidate rows:** `212956-005` is the **tangential** (anti-rotation) link
assembly, per the 217755 parts list — the 2026-09-14 rotorkit lesson's
"pitch_link → 212956-005" was a guess and is wrong; the pitch link is
`213862-002`. That also resolves the "two ids, three MS14101-3 meshes"
question: `_9bfdb344` (under `213862-002`) is the pitch link's bearing,
`_84a75703` (under `prd-e-03438709` = `212956-005`) is the tangential
link's; `MS14103-3` is the tangential link's other end.

## Deliverables

1. **`docs/topologies/topology_vpa_pitch_linkage.json`** — a topology, no
   studies, built to be bound. Parts: reuse the existing ids where the part
   is the same physical thing (`hub`, `pitch_plate_215177_001`, `pitch_link`,
   `pitch_arm`, `blade_root`, `gas_spring`, `gas_spring_mount_213668_002`,
   `tan_link_mount_215175_002` — the alias table resolves by topology-part
   string, so reuse keeps today's meshes attached) and add `drawing` fields
   from the table above (`hub` → `214373-002`, `pitch_arm` → `215071-001`,
   `pitch_link` → `213862-002` with the body `213861-002` in its note,
   `blade_root` → `216332-001`, `gas_spring` → `PMF200521`); add
   `spherical_bearing_pitch_link` (`MS14101-3`), `tan_link_212956_005`,
   `spherical_bearing_tan_link` (`MS14101-3` / `MS14103-3`). Nodes are the
   **joint interfaces** (kind `mating_surface`, or `datum_feature` for the
   two axes), named so the annotator's suggestion table can read a surface
   kind off the words — suggested set: `hub_spindle_bore_axis` (the
   gas-spring bushing bore, expected Z), `hub_blade1_root_bearing_bore`
   (expected X), `pitch_arm_root_seat`, `pitch_arm_link_bore`,
   `pitch_link_upper_sphere_centre`, `pitch_link_lower_sphere_centre`,
   `pitch_plate_link_attach_bore`, `pitch_plate_gas_spring_bore`,
   `gas_spring_rod_end`, and the phase-2 four for the tangential link.
   Edges are the kinematic dimensions a binding attaches to (bindings key
   on **edges**, `feature_identity.StackKey` has no node kind — so every
   feature Jeff must click needs an edge with that feature at its `from` or
   `to`): `pitch_link_length` (lower → upper sphere centre, part
   `pitch_link`), `pitch_arm_radius` (blade axis → arm link bore, part
   `pitch_arm`), `pitch_plate_attach_radius` and `_height` (spindle axis →
   plate attach bore, part `pitch_plate_215177_001`), `hub_blade_axis_offset`
   (spindle axis → blade-1 bore, part `hub`; nominal 0 if they intersect),
   `gas_spring_bushing_coaxiality` (spindle axis → bushing bore), and the
   tangential-link pair. **Dimension values: cite or gap.** Where the 3DX
   sheet gives a number — the pitch-link length is `|A − P|` across
   `C:\workspace\atp-post\docs\references\250530_pitch_motion_ratios.xlsx`
   sheet `250530 pitch sweep` cols C–E vs G–I, and must come out constant —
   cite it as `kind: workbook` with the cells; everything else is an
   explicit `untraced` gap on the gap list with a one-line note of what
   would trace it (the drawing callout, or this handoff's fit). No invented
   nominals. `units: mm`, `provenance.worksheet` absent (none exists);
   the document's `description` says what it is for and that it is
   studyless by design.
2. **Alias rows** in `docs/topologies/part_mesh_aliases.json` for every part
   that has a mesh today, with evidence from `provenance.json` and the
   parts lists (`spherical_bearing_pitch_link` → `asm217755_MS14101_3_9bfdb344`,
   `spherical_bearing_tan_link` → `asm217755_MS14101_3_84a75703` and
   `asm217755_MS14103_3` as two rows if the schema is one-mesh-per-row — say
   so; `gas_spring` → `asm217755_PMF200521`, `tan_link_212956_005` →
   `asm217755_212956_005`, `tan_link_mount_215175_002` → the dash-number
   question from the 09-15 lesson is **answered by the parts list**: the CW
   assembly is `-001`, `-002` is CCW — alias to `asm217755_215175_001` and
   record it). Parts whose mesh is not installed yet (`hub`, `pitch_arm`,
   `pitch_link` body, `blade_root`) get **no row** — the "no installed mesh"
   empty state is the honest answer until rotorkit's run lands; list them in
   the lesson as the rows to add, with the expected `part_id`s
   (`asm217755_214373_002`, `asm217755_215071_001`, `asm217755_213861_002`,
   `asm217755_216332_001`).
3. **`scripts/fit_bound_features.py` → `data/projections/feature-geometry/fits.json`.**
   For every `bound` event in `data/inbox/feature-identity/` (projection via
   `tolerance_stack.feature_identity.build_projection`): load the mesh
   (`positions.f32` / `indices.u32` / `face_ids.u32`), take the face's
   triangles, fit **plane, cylinder and sphere** by least squares (plane and
   cylinder already exist in `apps/annotate/face_geometry.js` — port the
   same algorithms to Python in `tolerance_stack/feature_geometry.py` so the
   two agree; sphere is new: linear least squares on `|p − c|² = r²`), pick
   the kind with the smallest RMS residual relative to the face's size,
   report all three residuals. Output per binding, **in the part's local
   frame**: kind, centre / axis point + direction / plane point + normal,
   radius, RMS, triangle count. Then **per occurrence** of the part in the
   assembly (`provenance.json` `extraction.instances[].placement_world`,
   3×4 mm; and, once rotorkit's run lands, its full-expansion
   `placements.json` — read it if present, by absolute path
   `C:\workspace\rotorkit\data\runs\<run-id>\placements.json`, else fall
   back to provenance): the same geometry transformed into the **assembly
   frame**, one row per occurrence with its `instance_path`. The annotator
   draws parts at local origin and applies no placement
   (`ISSUE_20260921_cross_part_face_relations_need_assembly_placement.md`) —
   this script is where placement is applied, and it says so. Gate it like
   every shared projection (`scripts/projection_provenance.py`).
   **Test it on today's meshes without any binding**: synthesise events in a
   tmp inbox against the pitch-link bearing `asm217755_MS14101_3_9bfdb344`
   (pick its spherical face by inspection — the ball — and a bore) and the
   pitch-plate detail's bushing bores; the sphere fit must recover a radius
   consistent with MS14101-3 (ball ⌀ from the spec; the bore is
   `4.826 mm` per the 09-10 trace) within tessellation error, and the two
   bearing occurrences under `213862-002.1` must land at two distinct
   assembly-frame centres whose distance equals the sheet's `|A − P|` to
   within a millimetre — **if it does, source B is already in hand for the
   solver before Jeff binds anything**; report the number.
4. **The annotator recognises a sphere.** `face_geometry.js` sends a sphere
   to `other` today, so an edge named "sphere centre" gets no face
   suggestions. Add a `spherical` surface kind (fit as in item 3, in JS),
   the words that ask for it (`sphere`, `spherical`, `ball`, `centre`,
   `center`), and keep the fence: suggestions colour, never bind; the
   mutation witness for the fence must still redden. Same-part relation for
   spheres: `concentric` is not computable without placement — declare the
   gap as the table already does for cross-part planes.
5. **Docs:** `ANNOTATION_SURFACE.md` gains the fit projection and the
   "placement is applied here and nowhere else" sentence; `DAG_TOPOLOGY.md`
   gains one paragraph naming the studyless kinematic topology as a
   legitimate document kind (joints as nodes, kinematic dimensions as edges,
   consumer = `linkage`) and restating that the fence holds.

## Definition of done

- `topology_vpa_pitch_linkage.json` loads (`tolerance_stack.topology.load_topology`),
  projects (`scripts/rebuild_projections.ps1`), appears in the viewer nav
  with its gap list, and opens in the annotator with every aliased part's
  mesh offered and the un-meshed parts reported as "no installed mesh".
- `fits.json` built from the synthetic bindings in item 3 with the numbers
  above; the sheet-vs-fit link length reported.
- `pytest -q`, `node apps/annotate/run_tests.cjs`, the browser tier and the
  mutation witnesses green in the main checkout (rebuild projections first).
- Lesson (`docs/sessions/lessons/LESSONS_20260930_vpa_pitch_linkage_topology_and_feature_fits.md`):
  the `212956-005` correction and the three-mesh resolution; the alias rows
  deferred to rotorkit's run with their expected ids; the fitted bearing
  centres (assembly frame, 72°) and their distance vs the sheet; whether
  `instances` in provenance was the full expansion or not; what Jeff has to
  click, in order, as a numbered list he can follow.
