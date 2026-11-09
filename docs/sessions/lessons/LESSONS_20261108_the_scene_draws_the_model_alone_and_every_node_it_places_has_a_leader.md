# LESSONS 2026-11-08 — the scene draws the model alone, and every node it places has a leader

Handoff: `HANDOFF_20261108_the_scene_draws_the_model_alone_and_every_node_it_places_has_a_leader.md`.
Probe: `tests/debug_scene_alone_and_leaders.mjs` (hand-run; `--projections` takes
projections built from this tree into a scratch data root).

## The (a)/(b) diagnosis: (a), by evidence

Reproduced before any change, v2 with the pane open, then `sweep latest` (P2):

| state | `.seam__leader` | DAG dots (`lastTopoRender.seam.dots`) | anchors posted / placed | `lastSeamDraw.skipped` |
|---|---:|---:|---:|---|
| pane at rest | 0 | 0 | none (bind mode: model layer off) | `lastSeamDraw` null |
| P2 loaded | 0 | 0 | 23 / 22 | all three lists **empty** |

`skipped` empty with 22 anchors in hand means nothing was ever attempted, not
`noAnchor`. That's cause **(a)**: `views/topology.js` passes `lit = null` when
nothing is marked, and `VA.seamDots` returned no dots for a null lit set. (b) was
not the cause: the pane already posts every node, placed by link end, binding
or section. Fix: `VA.seamDots` with no lit set gives a DAG end to every node
the DAG draws. No new mechanism, and the leader is still drawn only where the
scene posted an anchor.

## What changed, by site

- `apps/viewer/topology.js` `VA.seamDots`: null lit means every drawn node.
  With a study, only its lit set, as before. The viewer README bullet and the
  unit test that pinned "the whole walk has none" are rewritten.
- `apps/annotate/sweep.js` `AA.modelAloneShas` / `AA.modelAloneHides`: a
  topology that declares any `occurrence` is a model drawn alone.
  `app.js` applies it at five sites:
  - `scopeToParts` loads the model's own untargeted parts (the three bearings)
    rather than the store;
  - `applyPartScope` hides anything that isn't the model's;
  - `contextBaseShas` in sweep mode lists the model's parts as "In this model";
  - `cmdSweep` / `anchorSweepBodies` hide what is open and skip opening the
    run's carried bolts;
  - the sweep frame never puts a non-model part back on screen.
  `subjectOccurrences` reads model parts only, so a body's checkbox is not
  half-ticked by a bolt another topology left open.
- `scene.frameMechanism`: at rest a model drawn alone is framed on its parts,
  leaving out an occurrence far larger than the median, using the sweep's own
  `SWEEP_CONTEXT_RATIO`. Without it the camera ended on whatever the last
  `loadPart` framed: a close-up of the blade, with the mechanism out of shot.
- `model_layer.js` `AA.modelSkeletonEnds`: a node the run's features name as
  an end of **any** joint (slide, hinge, actuator) and with no link end or
  binding anchors at the skeleton's point. It uses the existing `joint`
  source, read after `bound` and before `section`. This made
  `hub_blade1_root_bearing_bore` (the blade hinge) placed and led. Before, it
  fell back to an off-screen section centre and posted `null`.
- v1 is untouched: it declares no occurrence, so it still draws every
  occurrence and the store as faint context (shot 7).

## Which nodes are anchored by what (P2 loaded, integration's projections, 25 nodes)

The run's `geometry.features` name **9** distinct nodes, not the handoff's ten.
`pitch_link.length` and `tan_link.length` name edges.

- **Skeleton / link end (`joint`), 7:** `hub_blade1_root_bearing_bore`,
  `hub_spindle_bore_axis`, `pitch_plate_spindle_bore_axis`,
  `pitch_link_lower_sphere_centre`, `pitch_link_upper_sphere_centre`,
  `tan_link_lower_sphere_centre`, `tan_link_upper_sphere_centre`.
- **Binding (`bound`), 2:** `gas_spring_mount_bushing_bore`, `gas_spring_piston_body_od`.
- **Section centre, 16:** every other node.
- **Neither, 0.** At the +72° stop, `tan_link_lower_sphere_centre`'s point
  leaves the camera's view and posts `null`, so 24 of 25 are placed there.

The two spindle nodes were `bound` against master's projections and are
`joint` against integration's. The bindings are keyed to v1's edge ids, and
integration's v2 renamed that spindle edge. They land on the same solver
point either way, but it's the datum-rename handoff's consequence, not this
one's.

Leaders with P2 loaded, at the 1500-tall viewport: **21 of 25**. The other 4
(`pitch_arm_link_bore`, `pitch_arm_root_seat` and the two pitch-link sphere
centres) are `offDag`: their dots are below the pane's visible height. Every
skeleton joint node whose dot is on screen has its leader. The browser check
counts this (`[real] with the P2 run loaded and no study, every joint node the
scene drew has its leader across the seam`).

## The shots (`shots/the_scene_draws_the_model_alone_and_every_node_it_places_has_a_leader/`)

All of these were taken with integration's topology and bindings projections
from a scratch root (see "Projections", below). The red "Data is older than
the latest code" banner in them comes from that override, not from this
change.

1. `1_v2_pane_at_rest.png` — 15 meshes for 15 parts, "Other parts (37)"
   folded and unticked, framed on the mechanism. Tight in this tall portrait
   pane; at 1100 tall it reads better.
2. `2_v2_sweep_loaded.png` — "15 of 15 parts placed" (12 of 12 with
   integration's run anchoring), dim leaders from every on-screen DAG dot.
3. `3_v2_mid_sweep.png` — the same 15 parts mid-sweep, leaders following.
4. `4_v2_plus72_stop.png` — the +72° stop.
5. `5_v2_node_selected.png` — a DAG node selected stays in sweep, and its
   leader is in the accent.
6. `6_v2_row_selected.png` — a **grid row** selected re-drives the pane to
   `goto` and leaves sweep, and the leaders go (see "Found").
7. `7_v1_pane_open.png` — v1, as before: every occurrence, store context.
8. `8_v1_back_to_v2.png` — v1 → v2 in one page: 15 parts drawn, and v1's
   context is gone.
9. `9_v2_node_hovered.png` — after play/pause, a hovered DAG node's leader
   is "hot". Bodies' checkboxes are full (they were half-ticked before the
   `subjectOccurrences` fix).

## What the click-around found that the handoff didn't ask about

- **A grid row click leaves the sweep** on a studyless model (shot 6). Filed:
  `docs/issues/ISSUE_20261108_a_grid_row_selected_on_a_studyless_model_leaves_the_sweep_and_its_leaders.md`
  (`audience: strategy`, three options, option 1 recommended). That's why the
  DoD's "a row selected with its leader in the accent" is shown with a DAG
  node instead.
- **No leaders at rest.** Bind mode has the model layer off, so the scene
  places nothing and there's nothing to lead to. This is consistent with "every
  node the scene places". Option 3 of the issue above covers it.
- **Body checkboxes half-ticked after v1 → v2**: fixed here (see above).
- Seen and noted, not fixed (handoff's instruction): the pane header's
  "folder needed" badge, and the "747 likely faces … on one axis, 0.000 mm
  apart ×3" lines on a selected row.
- At rest in a tall, narrow pane the mechanism framing is tight: `_frameBox`
  sets distance from the box size, not the canvas aspect. Cosmetic; not
  filed.

## Projections — the DoD's main-checkout rebuild was not done, on purpose

The main checkout is on `master`, and master's v2 topology (23 nodes) and
feature-identity builder both predate integration's (25 nodes, accepted
events folded). Running `rebuild_projections.ps1` there would rebuild the
**older** v2 into the shared projections. So I built integration's topology
and bindings projections from this tree into
`C:\workspace\tolstack\data\scratch\the_scene_draws_the_model_alone\` and
pointed the probe at them with `--projections`. The shared projections are
untouched. The batch merge's `rebuild_projections.ps1` (which runs
`build_feature_identity_projection.py` as step 5 since 2026-11-08) is the
rebuild that puts integration's v2 on the served page.

## Tests worth knowing about

- The browser tier and the probe run from a worktree once a `node_modules`
  junction to the main checkout's is in place. It's gitignored
  (`node_modules/`, with the slash) and git-invisible, and the
  mutation-witness shadow copies only tracked paths.
- `tests/test_mutation_witness_shadow_concurrency.py` fails in this worktree
  with `WinError 3`: the long slug plus long lesson-shot names overflow
  MAX_PATH. Already filed as
  `ISSUE_20261104_a_lesson_screenshot_name_overflows_max_path_in_the_shadow_concurrency_test.md`.
- An existing witness (`browser__no-leader-across-the-seam-for-a-node-outside-the-lit-set`)
  anchored on the old `seamDots` lines and was re-pointed at the new `ids`
  line, with the same break.
</content>
</invoke>
