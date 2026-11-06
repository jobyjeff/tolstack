---
type: feature
priority: med
status: open
area: viewer/annotate pose
reporter: agent
found_by: docs/sessions/HANDOFF_20261105_the_grid_and_the_dag_move_with_the_mechanism.md
---

# The 3D pane's own play and scrubber do not move the kinematic page's pose

`the_grid_and_the_dag_move_with_the_mechanism` made the pose a first-class input
on the kinematic study page: one control over the envelope chart (play, a travel
slider, a typed blade angle, the stops), read by the grid, the DAG, the chart's
cursor and the 3D pane. The page drives the pane one way only. It posts the
pane's own `seek <driver mm>` on every frame of a drag or of play, and `pause`
when its own play starts (`topology_app.js`, `syncPanePose` / `startPlay`).

The other direction is missing. The handoff fenced the annotator out of scope,
so nothing in `apps/annotate/` changed. The pane's own transport still works:
its play button, its scrubber, its `+`/`-` step and the space-bar shortcut
(`apps/annotate/app.js`, `tickSweep` / `setSweepIndex`). It moves the scene and
nothing else. The grid, the DAG and the chart stay where the page's pose was.
Two play controls on one screen can disagree, which is what the handoff's "where
the 3D pane already owns a play control, unify, do not duplicate" was meant to
prevent.

## What would close it

- The annotator posts its sweep position to the embedding shell whenever it
  moves, for example `{type: "annotate:sweep", index}` from `applySweepFrame`,
  through the existing `postToShell`. The shell answers it with `livePose(index)`
  while the pane is playing and `setPose(index); render()` when it stops. The
  unit is already shared: a pose is the pane's own fractional `sweep.index`
  (`VA.kinematicPose`), and the play pace is the same constant, paired by
  `tests/test_kinematic_pose_pace.py`.
- Or, when embedded, the pane hides its own transport and the page's control
  is the only one. That is a smaller change, but it drops the pane's speed and
  loop settings.

The first option keeps both controls and keeps them in step. It is also the only
one that needs no design call.
