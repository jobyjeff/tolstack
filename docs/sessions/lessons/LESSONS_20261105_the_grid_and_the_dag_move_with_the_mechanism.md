# Lessons: the grid and the DAG move with the mechanism (2026-11-06)

Shots: `shots/the_grid_and_the_dag_move_with_the_mechanism/`. The film of one play cycle is
`play_cycle.png`: 28 frames 250 ms apart in page time, from −7° up to +71° and back to −5°.
Beside it is `play_cycle.json`, which records the angle, the chart cursor's x, one term's
sensitivity and contribution, the foot, the grid's top and four bar ends at every frame. The
click-around stills are `1_…` to `7_…`.

## How J is read between sweep points

A pose is a **fractional sweep point index**: 12.25 is a quarter of the way from point 12 to
point 13 (`VA.kinematicPose`, `views/kinematic.js`). That is the 3D pane's own unit, its
scrubber's `sweep.index`. Within one step the driver is linear in it, so the `seek <mm>` the
page posts lands the pane on the same pose.

Every number shown at a pose is a projection number, read linearly in the index between the
two points either side of it:

- each linkage term's **signed coefficient** comes from `contributors[].by_point[]`. Its sign
  is the sign of the interpolated value, and the sensitivity column shows its magnitude.
- each term's **magnitude** is interpolated from `by_point[].magnitude`. It is not recomputed
  as |J| × band in JS. Interpolation is linear, so the shown terms still sum to the
  interpolated `envelope[].worst_case_half` (the linkage sub-stack's total). Where a
  coefficient keeps its sign between the two points, the interpolated magnitude equals
  |interpolated J| × band exactly. The `[real]` three-bars test checks that at 30°.
- the **foot** and the linkage sub-stack's total come from `envelope[]`.

Nothing is folded in JS. A pose exactly on a stop's point **is that stop**: the stack is built
from `stops[]`, i.e. `fold_at_stop`'s output, not from interpolated points. A `[real]` test
checks that the interpolated values at both stop points print the per-stop fold's numbers
term by term and in total, and that the stack at the stop pose equals the stop's own stack.

## What the stop rows show at a non-stop pose

The stop-position sub-stack and its sub-studies stay at the stop the grid was last shown at
(`state.kinematicStop`). Their header says so: `9 terms · ±1.195 mm · at the −7 deg stop`.
The foot then reads `blade pitch at 37.6 deg | ±0.204 deg · RSS ±0.122`. That total is the
linkage alone, because off a stop the stop's axial chain is not in the loop and the
envelope folds only the linkage. So the total drops from ±2.355 at −7° to ±0.263 one point
later. That drop is physical, not a bug.

A stop button moves the pose onto that stop. A pose that lands on the other stop's point
switches the rows to that stop at the next settled render. A frame of play never changes
rows: on the other stop's point it clears the pose's `stop` (`framePose`), and that is why
`VA.kinematicStack` accepts a pose object as well as an index.

## Did contribution become the kinematic default? Yes, with one change of plan

`contribution` is a fourth `VA.EDGE_LENGTH_MODES` entry. A page offers it only when it has
lengths to draw (`contributions: true`). It is the default there (`VA.edgeLengthModeFor`) and
`state.edgeLengthMode` starts as `null`. Elsewhere the cycle skips it (`VA.nextEdgeLengthMode`).

**The first version drew nothing that moved.** It used every contribution on screen as the
yardstick, like the other modes. The stop terms are an order of magnitude bigger (the cover
flange is ±0.864 deg; the largest linkage term is ±0.156), so every linkage bar sat under
the one-row floor, and the linkage bars are the only ones that change with the pose. The
shipped mode (`VA.kinematicPoseLengths`) draws the **linkage terms only**, against **one
yardstick for the whole sweep**: the largest linkage contribution reached at any point. A
bar is then the same length for the same contribution at every pose, and the DAG's motion
shows the terms changing size (`pitch_plate_attach_height`: 0.156 → 0.112 → 0.149). Stop
terms floor and are marked. The alternatives are filed for strategy:
`docs/issues/ISSUE_20261106_the_contribution_length_mode_leaves_the_stop_position_terms_unscaled.md`.

## The DAG per frame: the pose film

The tween handoff's keyframe engine, applied to poses (`VA.poseFilm` / `VA.poseFilmBuilder`,
`views/topology.js`):

- The pane is rendered at 9 evenly spaced poses **into detached roots**. Their attributes
  are paired with the live nodes by position in the tree, and each frame eases the live
  nodes. No node is built per frame.
- Grid text is not captured in a snapshot. `VA.applyStackText` writes it from the stack at
  the frame's exact pose. A fast test renders pose A, rewrites it to pose B and compares
  every row's text with a fresh render at B.
- Two things had to be steady for the keyframes to pair. **Break marks**: in contribution
  mode every bar carries its break mark, hidden where the bar is not floored. Otherwise a
  bar crossing the floor adds a node and pairing fails; it did in the first fast test.
  **Classes** (colour bins) and `visibility` step to the nearer keyframe instead of easing
  (`ovl-c3.5` is not a class).
- The keyframes are built **in idle time after each settled kinematic paint**
  (`prebuildFilm`, one per `requestIdleCallback`). Building all 12 at the first frame of
  play cost 3.3 s on this box, measured. It is now 9 keyframes, built in idle time.
- When play stops, or a drag is released, the page renders the pose itself, so the resting
  DOM is exact. Between keyframes, frames are linear in the pose. J curves gently (see the
  hover curve), so the error is a pixel or two.

**Frame count, honest status.** Measured with a real clock in `--real-time` filmstrip runs
on this shared box with the film prebuilt: about 17 distinct poses in 5.9 s. Long animation
frames show the normal frame's script at **24–28 ms**, the same as the tween handoff's
~25 ms per frame. The frames that run long are render-bound: 450–630 ms with ~25 ms of
script, the paint-only stalls that lesson also measured. `pinTopoHead`'s
`getBoundingClientRect` forces the layout (61 ms on average, up to 331 ms). A quiet-box
frame rate is **not measured here**. The deterministic evidence is the stepped-clock
filmstrip (frames at fixed page-time steps, every number continuous) and the fast-tier
tests.

The grid's block **drifts down as the DAG grows**: in the play cycle the grid top runs from
697 px to 731 px. This is centring (`VA.centreOffsets`) following the DAG's height, it
changes gradually, and it is not a snap. I left it as is.

## Other decisions

- **One pose control**, over the chart because the results pane did not show it below the
  chart without scrolling. Play, a slider over the driver's travel (the chart's own x
  axis, run the same way), the angle field, and the stop buttons. They keep `div.kmstop` /
  `button.kmstop__button`, which the browser tier and the witnesses read.
- **Pace**: 24 points/s ping-pong, the 3D pane's own `AA.SWEEP_POINTS_PER_SECOND`. The two are
  paired by `tests/test_kinematic_pose_pace.py`.
- **The 3D pane is driven one way.** The page posts `pause` when its play starts and
  `seek <mm>` every frame. The annotator was fenced, so its own transport does not move the
  page:
  `docs/issues/ISSUE_20261106_the_3d_panes_own_play_and_scrub_do_not_move_the_pages_pose.md`.
- **The URL.** `?kinematic=<id>&pose=<angle>` is written when the pose settles. It is view
  state, like `?pane=1`, and **not** in `VA.DEEP_LINK_PARAMS`: that list is the sibling repo's
  contract, and its README table pairing reads `param=<id>`. Leaving the study drops the
  pose. `scripts/filmstrip.mjs --pose <deg>` boots at a pose, and `--scenario pose-play`
  films play.

## Sites the pose reaches, and does not

It reaches the grid (terms, sub-stack headers, foot), the DAG in contribution mode, the
contribution colouring (at rest and stepped per keyframe in play), the chart cursor, the
3D pane's scrubber and the URL. It does not reach the Preview pane's **In this study**
block, which still prints each stop's numbers. Those are per-stop facts, and I left them.
It also does not reach the sensitivity hover curve, which marks the stops and not the
pose: `docs/issues/ISSUE_20261106_the_sensitivity_curve_card_does_not_mark_the_live_pose.md`.

## Mistake to avoid

I ran `git checkout <file>` meaning to check status, and it threw away an hour of
uncommitted tests. The sources were still in scratch files, so I re-applied them. Commit
before every exploratory command; WIP commits are cheap here.

## Verification record

See the completion report. In short: the viewer fast tier and the `[real]` tier ran against
a projection built from this branch into `C:\workspace\tolstack\data\scratch\gridpose\`
(junctions to the main checkout's inbox, meshes, runs and sessions; `docs` junctioned to
this worktree). The kinematic browser suite ran against the same root, with `node_modules`
junctioned in.
