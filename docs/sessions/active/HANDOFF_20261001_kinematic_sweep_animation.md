---
priority: high
depends_on: []
model: opus
---

# HANDOFF 2026-10-01 — kinematic_sweep_animation: the annotator plays a linkage sweep — stick figure first, then the STEP bodies anchored to the rigid bodies, with playback controls

> **⚠ LAUNCH GATE (cross-repo, not a `depends_on` slug):** do not launch
> until `C:\workspace\linkage`'s
> `HANDOFF_20261001_sweep_artifact_carries_poses_for_animation` has merged
> and at least one `linkage-sweep/v1` file exists in
> `C:\workspace\tolstack\data\inbox\linkage-sweeps\`. Everything here reads
> that file; the `v0` files on disk carry no poses.

Source: Jeff, 2026-10-01 — *"I need a way to review/verify the results, and an
animated sweep would be the most ideal. Two proposed phases (or maybe all at
once): a 'stick figure' animation using simple points/lines … even better
would be to anchor the 3d bodies to the kinematic rigid bodies and animate
those through the sweep. The 2 force members (pitch links and tangential
links) may need some creativity since we agreed to model them as distance
constraints … Let's build this (animation controls with playback speed,
draggable time bar etc) into the tolstack 3d viewer."* Both phases, one
handoff, this order. Nothing like it exists: the only animation in this repo
is the 2D DAG re-spine (`apps/viewer/README.md`, "The animation is
presentation and nothing else"); `apps/annotate/scene.js` is a static
three.js r169 scene with OrbitControls and a `requestAnimationFrame` loop
that only re-renders.

Baseline: `master`. Scope: `apps/annotate/**` (new `sweep.js`; additions to
`scene.js`, `commands.js`, `app.js`, `index.html`, `style.css`),
`docs/ANNOTATION_SURFACE.md`, `apps/annotate/run_tests.cjs` + a new pure-logic
test file, `tests/` (a Python pairing test if any Python-emitted name is
read). Do NOT touch `apps/viewer/**` except, if you add a deep link from the
viewer's topology page, `VA.annotateLink` and that one call site; do NOT
touch `tolerance_stack/**`, `docs/topologies/**`, or `data/inbox/**` (the
sweeps inbox is linkage's to write and append-only). The three parallel
tolstack handoffs on the board own the viewer and the Python side.

## What the artifact gives you (read one before designing)

`linkage-sweep/v1` (`data/inbox/linkage-sweeps/<run-id>.json`), per the
linkage handoff: `frame` (poses are relative to the as-modelled pose in the
217755 assembly frame at 72° blade pitch, zero travel); `bodies[]` with
`name`, `ground`, `parts` (tolstack topology part ids from
`docs/topologies/topology_vpa_pitch_linkage.json`); `links[]` (`joint`,
`parts`) for the distance-constraint members; `points[]` of 80 with
`driver_value` (actuator travel, mm), `measures` (`blade_pitch`,
`actuator_travel`, `motor_angle`), `converged`, `residual_norm`, `poses`
(per body: `translation`, `rotvec`), `joints` (per joint: `point_a_world`,
`point_b_world`, `axis_world`), `links` (per distance joint: reconstructed
`translation`/`rotvec`, `length`, the spin-free convention); `reference`
(the 3DX sheet's blade pitch per point, source A); `source` = `sheet` | `cad`.
Two runs will exist: **S** (2 bodies, the plate point prescribed on ground)
and **P1** (3 bodies, prismatic plate). P1 is the one to design against.

Mesh side, all already in this repo: meshes at `data/meshes/<sha256>/`
(`positions.f32`, `indices.u32`, `face_ids.u32`, `manifest.json`,
`provenance.json`), loaded lazily through the storage adapter by
`scene.loadPart(sha256)`. **A mesh is in the product's own local frame;
`provenance.json`'s `extraction.instances[]` records `placement_world` (a
3×4 row-major rotation+translation, 12 floats) per occurrence and the
annotator applies none of it today** (`data/meshes/README.md`,
`CLAUDE.md` "the one place a placement matrix is applied" is
`fit_bound_features.py`). Part id → mesh goes through
`docs/topologies/part_mesh_aliases.json` and the parts panel's existing
resolver (`app.js::resolveMeshOrThrow`); `hub` and `pitch_arm` have alias
rows, `pitch_link`'s body and `blade_root` do **not** (blocked on
`ISSUE_20260930_blade_1s_pitch_link_is_the_instrumented_546293_002.md` — a
decision, not a missing file), `spherical_bearing_pitch_link` resolves to the
MS14101-3 mesh with two instances under `213862-002.1`, and the plate detail
is `asm217755_215735_001`.

## Deliverables

0. **Two alias rows, under Jeff's 2026-10-01 ruling** (the one exception to
   the `docs/topologies/**` fence — these two rows in
   `docs/topologies/part_mesh_aliases.json` and nothing else there). Jeff:
   *a topology part names the design, non-instrumented part; the
   instrumented pitch link has a proving ring built in, so that one should
   be the non-instro mesh; the blades' 3D geometry is identical (strain
   gauges are 2D); none of this affects the 3D kinematics.* So:
   `pitch_link` → `asm217755_213862_002` (5 solids, instances
   `213862-002.2`–`.5`); `blade_root` → one of the two installed
   `216332-001` meshes (`asm217755_216332_001_1ed2bfd5`, 20 solids, or
   `…_1ff0bced`, 15 solids — both record instance `211587-001.3`; pick one,
   say why, note the other in the row's evidence). Write the rows in the
   table's existing evidence register (drawing number, parts-list find,
   provenance path), and mark
   `ISSUE_20260930_blade_1s_pitch_link_is_the_instrumented_546293_002.md`'s
   "Done when" items as met in your lesson — the issue carries the ruling
   verbatim and closes through its `handoff:` back-link. **Consequence for
   phase 2:** blade 1's occurrence in the STEP is the instrumented
   `546293-002` at `213862-002.1`; you draw the **design** mesh there, so
   the placement comes from the instrumented mesh's provenance
   (`asm217755_546293_002`, instance `213862-002.1`), not from the design
   mesh's own instances (blades 2–5). Before trusting that, check the two
   meshes share a local frame: fit or read the two bearing-bore centres in
   each mesh's local coordinates and compare; if they differ, derive and
   apply the offset and record it. Same for the blade.

1. **Sweep mode.** `sweep <run-id | latest>` (command verb, registered through
   `commands.js`'s `register`, and a `?sweep=<run-id>&t=<driver value>` deep
   link through the same path as `goto` — this app's standing rule is that
   every entry is a verb) loads the file from the inbox, validates the
   schema literally (`linkage-sweep/v1`; refuse anything else with the
   schema it found), and puts the app in sweep mode: the hint bar's one line
   shows **run id · source (`sheet` / `cad`) · mechanism name · 80 points ·
   N not converged**. Source must be impossible to miss — Jeff's whole
   concern is knowing whether he is looking at sheet geometry or
   CAD-fitted geometry. Face picking and binding are **disabled while the
   current frame is not the as-modelled one** (poses ≠ identity), with a
   one-line reason in the bar; at the 72° frame everything behaves as
   before. Leaving sweep mode restores the scene exactly.

2. **Phase 1 — the stick figure.** From `points[t].joints` and `poses`: a
   small sphere per joint (colour by joint type; the draggable legend is not
   needed, a tooltip on hover is), a line per distance link between its two
   ends, a triad per body at its pose (ground's triad drawn once, muted),
   and a faint **trail** of each joint's path over the whole sweep (toggle).
   A non-converged point is drawn in the warning colour and the scrubber
   marks it. Readouts beside the bar at the current frame, numbers only,
   from the artifact (this app formats digits, never wording — same rule
   the inspection table set in atp-post, and `reader_facing_bans.js`'
   rules apply to any word you do author): blade pitch (solved), blade
   pitch (reference, when `reference` carries it) and their difference,
   actuator travel, motor angle, `|A − B|` of each link against its
   `length`, residual norm. Those four numbers are the verification.

3. **Phase 2 — anchored bodies.** For each `bodies[]` entry resolve its
   `parts` to mesh instances and parent the loaded meshes under a per-body
   `THREE.Group` whose matrix is `pose(t) ∘ placement_world`. **Which
   instance** (five pitch arms, five pitch links, three mounts) is decided
   by geometry, not by name: at frame 0 of the artifact's as-modelled pose
   (index 79, 72°) pick the instance whose placed joint feature lands
   nearest the artifact's joint point for that body (the arm's link-bore
   centre against the `pitch_link` joint's `point_b_world`; the hub needs
   no choice), record the chosen `instance_name` and the residual in the
   bar's disclosure, and refuse (draw the stick figure only, say why) when
   the nearest is farther than 1 mm or two instances tie. A part with no
   alias row or no installed mesh renders the honest "no installed mesh"
   state the parts panel already has — the stick figure for that body still
   draws. The **distance-constraint links** use `points[t].links[*]`'s
   reconstructed pose (spin-free, the artifact states the convention; show
   it in the tooltip) for the link body and its two bearings — the
   bearings travel with the link for this handoff; whether a ball should
   instead follow the body it is pressed into is noted in the lesson, not
   built. Optional **ghost** of the as-modelled pose (the `ghost` verb's
   transparency exists already) under a toggle.

4. **Playback controls**, in the bar (one line at rest, per Jeff's 09-21
   ruling; the controls are that line in sweep mode): play/pause, speed
   (0.25× … 4×), loop / ping-pong, step ± one point, and a **draggable time
   bar along the driver** (actuator travel, mm, with blade pitch shown at
   the handle) that scrubs continuously — interpolate between sweep points
   (lerp translation, `THREE.Quaternion.slerp` on the rotations; the
   stick-figure points interpolate linearly and the readouts show the
   nearer point's numbers with the index). Keyboard: space, ←/→, Home/End.
   Verbs for all of it (`play`, `pause`, `speed <x>`, `seek <mm | #index>`,
   `loop on|off|pingpong`, `layer stick|bodies|trail|ghost on|off`) so the
   command box and the deep link can drive the same state. `prefers-reduced-
   motion` means step, not animate — same answer the viewer gave.

5. **Docs.** `docs/ANNOTATION_SURFACE.md` gains a "Sweep mode" section:
   what it reads, the frame rule, the instance-choice rule, the link
   convention, the verbs, and the sentence that this is a **viewer of a
   solver's output and writes nothing** — the app's one write path is
   untouched.

## Definition of done

- With P1 published: `?sweep=<p1 run-id>` opens the annotator in sweep mode;
  pressing play sweeps 64.466 → 0 mm and back; the stick figure's blade
  hinge point stays fixed, the pitch-link line keeps `|A − B| = 105.9905`
  to display precision throughout, the arm's joint traces a circle about X,
  the plate's point moves along Z (P1) — and with run S loaded the same
  point follows the sheet's curved path. Screenshot both at four frames
  (−7°, 17°, 41°, 72°) into `docs/sessions/lessons/assets/`, light and
  dark, with the readouts visible.
- Phase 2 on P1: hub, pitch arm (the chosen instance named), pitch-link
  bearings and the plate detail move with their bodies; the readout of
  blade pitch at the scrubber handle matches the frame; a body whose part
  has no alias row shows the honest state and the stick figure still draws
  for it. Scrubbing to an unconverged point (fabricate one in a fixture
  copy) shows the warning treatment.
- Pure-logic tests in `apps/annotate/run_tests.cjs`'s tier: interpolation
  (endpoints exact, midpoint of a 90° rotation is 45°), scrubber ↔ driver
  mapping (monotone, both ends), instance choice by joint-point agreement
  (nearest wins, tie refuses, > 1 mm refuses), pose composition against a
  hand-computed 4×4, schema refusal message. Browser automation is not run
  on this machine (the step_tessellation lesson) — the screenshots are the
  browser evidence; say which checks are only screenshot-verified.
- `node apps/annotate/run_tests.cjs` and `venv-win/Scripts/python.exe -m
  pytest -q` green.
- Lesson (`docs/sessions/lessons/LESSONS_20261001_kinematic_sweep_animation.md`):
  the instance chosen per body with its residual; what the annotator
  needed from the artifact that it did not carry (file against linkage, do
  not patch here); the bearing-follows-which-body question; the measured
  frame rate with all meshes loaded (the hub is 286 solids) and whether a
  lower tessellation tier was needed.
