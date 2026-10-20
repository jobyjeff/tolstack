---
priority: med
depends_on: [the_3d_pane_opens_in_the_mode_the_study_wants]
model: opus
---

# HANDOFF 2026-10-20 — the_sweep_rail_shows_the_mechanism: in sweep mode the rail is bodies → joints → parts, the run's measures, and the open study's contributors — inspect only

Source: strategy session 2026-10-20, Jeff's lock (one shell) and his LOD
sketch from 2026-10-16: collapsed = bodies and joints; expand a body into its
parts; expand a joint into the faces that define it; a study's contributors
one level down. His complaint on 2026-10-20: in sweep mode the rail showed
the bind workflow's furniture for an unrelated topology and study ("Cotter
hole clearance", washer thicknesses) beside the pitch-linkage animation.
Baseline: `integration` with the pane handoff merged (the rail handoff's
"sweep arrival selects its topology" and "studyless topology lists every
edge" are in). Scope: `apps/annotate/` (app.js's rail rendering, sweep.js,
style.css, commands.js for one `inspect` verb, tests),
`docs/ANNOTATION_SURFACE.md`. Do NOT touch the bind flow's writes, the
viewer, or the sweep bar.

## What the artifact gives the rail

A `linkage-sweep/v1` run (P2: `C:\workspace\tolstack\data\inbox\linkage-sweeps\vpa-pitch-p2-20261016-235852.json`):
`bodies` (body → parts), `links` (joint → parts), `mechanism` (`name`,
`driver`, `row_labels`, …), `geometry.names` / `geometry.features[]`
(`{label, topology, node|edge, component, body}` — 60 entries, 59 with a
topology ref), `measures` (names + units), `points[].joints` /
`points[].poses` per frame, `reference`. The joint types and the two bodies
of each joint are in the linkage lesson's side table
(`C:\workspace\linkage\docs\sessions\lessons\LESSONS_20261016_geometry_parameters_name_their_topology_feature.md`):
`pitch_link` distance (pitch_plate, blade), `tan_link` distance (base,
pitch_plate), `blade_hinge` revolute (base, blade), `plate_slide`
cylindrical (base, pitch_plate), `actuator` axial_position (base,
pitch_plate; the driver). Read which keys the artifact actually carries
before assuming this list; say in the lesson what you used.

## Deliverables

1. **Mode-aware rail.** In sweep mode the bind furniture hides: "Set up
   automatically", the study select, the element list, the rail filter. The
   topology select stays (read-only label is fine: the sweep chose it). In
   bind mode nothing changes.
2. **The mechanism tree.** Bodies as the top level (name, part count,
   collapsed by default except the moving ones); a body expands into its
   parts (the existing parts-panel rows — checkbox, Isolate, the named
   label from the rail handoff — so a part row exists in exactly one
   implementation); joints as the second top-level group (type in everyday
   words — "ball-ended link", "hinge", "slide", "driver" — and the two
   bodies); a joint expands into its defining features: each
   `geometry.features[]` entry of that joint, as the topology node/edge name
   with its binding state coloured as the element rows do today, and a
   hover that highlights the bound face (the pane handoff's `highlight`
   path, called in-process here). Selecting a joint highlights its beads
   (the existing `sweep-tip` hover shape) until deselected. The measures
   stay where they are (the readouts under the bar); the tree does not
   repeat them.
3. **The open study's contributors.** When the pane opened this sweep from
   a kinematic study (the viewer passes the study id with the `sweep`
   command — extend the verb: `sweep <run> [study]`; the hand-mirror rule
   applies), or `?sweep=<run>&kinematic=<study>` boots it, a third group
   lists the study's ranked rows for the stop nearest the current frame
   (read from the kinematic projection through the same transport the
   viewer uses; absent → the group is absent). A row is the contributor's
   name, its magnitude with unit, and the gap mark; selecting it highlights
   its feature and, if the feature is a length (an edge between two
   features), both ends. The group's head says which stop it is reading
   ("at the −7° stop") and changes as the frame crosses the midpoint.
4. **Inspect only; reselect is a jump.** Nothing in this rail writes. A
   feature row's "re-pick" control runs `goto <topology> <edge>` at the
   as-modelled frame — which leaves sweep mode and lands in the bind flow on
   that edge, the existing write boundary. `docs/ANNOTATION_SURFACE.md`
   gains the paragraph that says so.
5. **The truncation rule** (`dispatch/prompts/TACTICAL_AGENT.md`, "Truncated
   text is always discoverable"): every tree row's full text is reachable at
   the rail's minimum width; the tree uses the rail's resize.

## Definition of done

- Browser TRUTH tier on P2: sweep mode shows no study select and no element
  list; two top-level groups (bodies, joints) with the counts the artifact
  carries; expanding `pitch_link` lists its two sphere-centre features with
  their binding colour; opening from the kinematic study shows six
  contributor rows under "at the −7° stop" at frame 0 and the same six under
  "at the +72° stop" at frame 79; selecting a row highlights a face;
  "re-pick" on a bound feature lands in bind mode with that edge selected
  at the as-modelled frame; bind mode is byte-identical in the DOM to before
  this handoff (a snapshot test).
- `node apps/annotate/run_tests.cjs` green in the main checkout, the
  `[real]` tier reading P2; `venv-win/Scripts/python.exe -m pytest -q` green
  but for the documented worktree-only red; doc guards pass.
- Lesson (`docs/sessions/lessons/LESSONS_20261020_the_sweep_rail_shows_the_mechanism.md`):
  the artifact keys the tree reads; how the everyday joint-type words map to
  the artifact's types (one table, in Python-owned vocabulary if the words
  come from linkage's types); what the LOD tree still cannot show (a body's
  internal dimension chains — level 2 of the model — until a chain study is
  attached to a body).
