# LESSONS 2026-10-20 — the_sweep_rail_shows_the_mechanism

In sweep mode the annotator's rail is the mechanism now: bodies, joints and,
when the run was opened from a kinematic study, that study's contributors at
the nearest stop. Inspect only. What follows is what the diff does not say.

## The artifact keys the tree reads

Read off P2 (`vpa-pitch-p2-20261016-235852`) before building anything:

| key | what the tree takes from it |
|---|---|
| `bodies[]` (`name`, `ground`, `parts`) | the bodies group, in order; moving bodies open by default |
| `links[]` (`joint`, `parts`) | a two-force member's parts, listed under its joint |
| `points[0].joints` | which joints exist, in order (5 on P2) |
| `mechanism.row_labels` | each joint's **type** (below) |
| `geometry.features[]` (`label`, `topology`, `node`\|`edge`, `body`) | each joint's features (unique node/edge refs, first appearance first) and the body at each end (`<joint>.point_a[*]` / `point_b[*]`) |

Not used: `mechanism.driver` (the driver is a joint type, see below),
`measures` (the readouts under the bar already show them; the tree does not
repeat them), `points[].poses` (only through the existing
`AA.sweepBodyJoints`, as the fallback for a joint's bodies on a run with no
feature joins — the 10-15 runs).

**The artifact never states a joint's type**, and neither the handoff's
side-table lesson nor any file in tolstack had one. What it does carry is each
joint's residual rows (`mechanism.row_labels`, `<joint>.<row>`), and in
linkage a type *is* its row tuple (`linkage/joints.py`: `TYPE` + `ROW_NAMES`).
Every tuple is distinct, so the reading is exact. (The handoff's lesson path,
`LESSONS_20261016_geometry_parameters_name_their_topology_feature.md`, does not
exist in `C:\workspace\linkage`; the types it listed match what the rows say.)

## Joint type → everyday words

Python owns the types: `tolerance_stack/kinematic.py`'s
`LINKAGE_JOINT_ROW_NAMES` (a copy of linkage's pairs, compared whole against
`linkage/joints.py` by `tests/test_kinematic.py` when the sibling is on disk),
generated as `LINKAGE_JOINT_TYPES` + `LINKAGE_JOINT_ROW_SIGNATURES` (index for
index; the generator renders tuples, never mappings). The words are JS-authored
copy in `AA.SWEEP_JOINT_TYPE_WORDS`, a `VOCAB.table` over the Python key set.

| linkage type | residual rows | word | P2 joint |
|---|---|---|---|
| `distance` | gap | ball-ended link | `pitch_link`, `tan_link` |
| `revolute` | dx dy dz tilt_u tilt_w | hinge | `blade_hinge` |
| `cylindrical` | tilt_u tilt_w offset_u offset_w | slide | `plate_slide` |
| `axial_position` | position | driver | `actuator` |
| `spherical` | dx dy dz | ball joint | — |
| `prismatic` | tilt_u tilt_w spin offset_u offset_w | straight slide | — |
| `screw` | tilt_u tilt_w offset_u offset_w lead | screw | — |
| `fixed` | dx dy dz rot_u rot_w rot_axis | fixed joint | — |

A joint whose rows match none (a relaxed row) has no type word, never a guessed one.

## Decisions the handoff left open

- **A node feature is coloured by the binding at its own end.** Bindings are
  per topology *edge*, one face per direction, so a node feature is read
  through an edge: the one between it and the joint's other node when the
  topology has one (`pitch_link_length` for the pitch link,
  `hub_to_pitch_plate_spindle_coaxiality` for the slide and the driver,
  `tan_link_length`), else the first edge that ends on it. `blade_hinge`'s two
  ends are the same node (`hub_blade1_root_bearing_bore`), so it falls back to
  the first edge, `blade_root_bearing_to_pitch_arm_seat`, at its `from` end —
  arbitrary but stated. Hover runs `highlight <t> <edge> <from|to>` (a new
  optional third word); re-pick runs `goto <t> <edge>`.
- **Opening a joint selects it.** A `<details>` toggle is the one click; a
  separate select control would be a second affordance for one intent. One
  selection at a time: a contributor selected lets the joint go.
- **The stop is chosen by the study's measure, not by index**, matching the
  builder (`stop_index` finds a stop by value). On P2 the points are 1° apart
  in blade pitch, so the switch (32.5°) falls at the index midpoint anyway; on
  a run spaced by actuator travel the two would differ.
- **The run picker drops the study.** A study folds one run; switching runs
  from the bar is leaving it. Not carried silently.
- **The tree is built and removed, not hidden**, so bind mode's rail DOM is
  byte-identical (`tests/fixtures/annotate/bind_rail_snapshot.json`, captured
  from `9a29acd` before any change here, HTML comments stripped; regenerate with
  `--write-bind-rail-snapshot`). The hidden furniture is one class on
  `#workspace` plus `:has()` for the study label, so no id was added to the bind
  markup.
- **Feature rows reuse `.el-row--<state>`** (the rule is not scoped to
  `.el-row`), so the colour has one declaration. The rows are `tree-row`, not
  `el-row`, so every `.an__rail .el-row` selector elsewhere still counts only
  element rows.
- **The viewer was touched, minimally**, despite the scope line: deliverable 3
  needs the study id on the pane's launch. `VA.annotateParamsFor` adds
  `kinematicId`; `annotateLink` and `annotateExecCommands` carry it, each in a
  new branch above the old one, so the existing witness anchors still resolve
  (one spec's `find` was updated for the changed `annotateParamsFor` line).

## What the pane shows today

The kinematic study folds the **older** P2 run (`…-20261015-013931`, filed as
`ISSUE_20261020_the_blade_pitch_kinematic_study_folds_the_older_p2_run.md`),
which carries no `geometry.features[]`. So in the viewer's pane the joints have
their types and bodies but **open into no features**; the tree on the newer
P2 (standalone, or `?sweep=<1016>&kinematic=<study>`) has them. When the study
moves to the 10-16 run, the pane gets them with no change here.

## What the LOD tree still cannot show

Level 2 of Jeff's model — a body's own internal dimension chains (the pitch
plate's spindle bore to its attach bores) — because nothing attaches a chain
study to a body. Filed with a recommendation as
`ISSUE_20261020_the_sweep_rail_cannot_show_a_bodys_internal_dimension_chains.md`
(`audience: strategy`).

## Found on arrival

- The main checkout was clean.
- `integration` was red on
  `tests/test_mutation_witnesses.py::test_the_issue_each_mutation_cites_is_in_the_tree`:
  18 specs cited the 3D-pane handoff at its `active/` path, which the board
  move had emptied. Repointed in its own commit (`witnesses: repoint 18
  specs…`); the class is filed as
  `ISSUE_20261020_a_mutation_spec_citing_an_active_handoff_reddens_pytest_when_that_handoff_completes.md`.
  This handoff's own specs cite this lesson for that reason.

## Gotchas

- `AA.exec` returns a plain value for a synchronous verb, so `.catch` on it
  throws. Rail controls go through `railExec`, which wraps both.
- A later `border-left` shorthand overrides an earlier `.el-row--<state>`
  colour at equal specificity: the tree's rule sets width and style only.
- Setting `open` on a freshly built `<details>` queues a `toggle` event; the
  handler ignores toggles that match the remembered state, or a repaint would
  re-select whatever joint was open.
- Heredocs through the Bash tool still eat `\n` in JS strings (this session
  broke `run_tests.cjs` once that way). Write patch content to files.

## Verification, as recorded

Every `[real]` and browser run read projections built **from this branch's
committed tree** into `C:\workspace\tolstack\data\scratch\sweep_rail\`
(gitignored): a copy of `data/inbox`, `data/meshes` and `data/projections`,
with the topology, viewer, part-names, kinematic and crops projections rebuilt
there (the crops with drawing-checker's interpreter). The freshness check paired
them with the tree. The temporary `docs` and `venv-win` junctions in that root,
and the `node_modules` junction in the worktree, are removed. The root itself
holds only copied data and built projections; delete it after the review. The
main checkout was not written to.

- `node apps/annotate/run_tests.cjs` (worktree, `[real]` reading the main
  checkout's runs): **205/205** (197 + 8 new).
- `node apps/viewer/run_tests.cjs --repo <scratch>`: **544/544**, no tier
  skipped.
- `node scripts/run_viewer_browser_tests.mjs --repo <scratch>`, full: **28/28
  suites** in 157 s, including the new `annotate sweep rail …` (13/13) and
  `3D pane follows the selection …` (13/13, one new check).
- `node apps/annotate/run_browser_check.mjs`: **67/67** (its `[real]` studyless
  check now reads the element list after `sweep off`).
- `node scripts/run_mutation_witness_tests.mjs --repo <scratch>`, the **full
  registry**: 237/258 on the first pass, and all 21 misses were `python`
  witnesses whose interpreter could not start (no `venv-win` under the scratch
  root). With that junction armed, `--only python__`: **21/21**. So **258/258
  witnessed**: the 21 new specs, the two pre-existing viewer specs whose code
  this touched, and every other spec. Enrollment: fast 74/544, annotate
  60/205, browser 89/529 enrollable (561 declared). The pins were raised to
  205 and 561 declared. One new browser guard has no spec: the P2 suite's
  skip line, which is always true.
- `venv-win/Scripts/python.exe -m pytest -q` (worktree, at `0ace5e3`, before
  this lesson's text): **1 failed, 1513 passed, 1 skipped, 5:08**. The failure
  is the documented worktree-only `tests/test_viewer_js_suite.py`. The skip is
  the `test_fit_bound_features.py` re-extraction that is not installed.
- Not run: `scripts/rebuild_projections.ps1`. It refuses to run from a worktree.
  The scratch root was rebuilt builder by builder instead.
