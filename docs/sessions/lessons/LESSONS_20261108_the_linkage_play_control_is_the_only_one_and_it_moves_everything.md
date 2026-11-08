# LESSONS 2026-11-08 — the linkage play control is the only one, and it moves everything

Jeff's note: the page's Play moved the page *and* the 3D linkage; the pane's own
◀ ▶ ▶| moved only the 3D linkage. Consolidate into the original controls.

## Pose ownership, in five lines

1. **Owner:** the pane's sweep (`state.sweep.index`, its one `tickSweep` rAF loop). The page owns no clock.
2. **Emits:** the pane, `{type: "annotate:pose", run, index, driver, playing}` (`AA.embedPose`) from `applySweepFrame`, `cmdPlay`, `cmdPause` and `postEmbedState` — every frame, seek, step and play/pause, de-duplicated.
3. **Listens:** the page (`onPanePose`): keeps the *latest* message and applies it once per display frame (`livePose(index, true)` while playing; `setPose` + `render()` when the pane pauses; live-then-settle-after-160 ms for a scrub or step).
4. **Writes back:** only the page's typed angle and its stop buttons — they pause the pane and `seek` it (`syncPanePose`), which is a second way to set the *same* state, never a second state. `syncPanePose` never seeks a pane that is playing or already holds that driver.
5. **Fence:** the page refuses a pane whose `run` is not the study's `sweep.run_id` (console warning + one muted line on the page) and never seeks such a pane.

## What was kept on the page, and why

Removed: `.kmpose__play`, `.kmpose__slider`, `startPlay`/`posePlay`, the page's rAF loop,
`VA.KINEMATIC_POSE.pointsPerSecond` and its pairing test `tests/test_kinematic_pose_pace.py`
(the pace is the pane's alone now; nothing is left to pair).
Kept: the **typed blade-angle field** (it calls the same `seek` the scrub does — Jeff's own
rule for what may stay) and the per-stop buttons. The field doubles as the read-out of the
current angle; the chart's cursor and the grid/DAG numbers are the other read-outs.

## Surprises

- **A page that draws every pane message falls behind.** First cut applied each
  `annotate:pose` in its own task; under load (other agents' browsers) the page's draw is
  longer than the pane's frame, messages queue, and the page showed frames the pane had left
  (angle 8.2 beside pane 15.2). Fix: latest-wins, one apply per display frame
  (`panePoseLatest` / `poseFrame`). The page can still trail by one display frame — the pane
  and the page draw on their own rAFs.
- **The echo.** The page's own `livePose` used to `seek` the pane after every frame; with the
  pane as clock that seek fights it. `livePose(index, true)` skips the seek, and
  `syncPanePose` skips a playing pane and a driver within 1e-6 of the pane's.
- **The page lags the pane by its own draw time, and the first frame can stall.** At the
  pane's full pace on a loaded box (the browser tier's, other agents running) the page was
  0.1–0.5 s behind (pane 21.2 beside the angle of frame ~9) and caught up on pause — it never
  accumulates (latest wins) but it is not "frame for frame" at full speed there. At a slow pace
  (the filmstrip) it was on the pane's frame in 27 of 28 readings. Building the DAG's keyframes
  all at once on the first frame of play stalled the pane for seconds, so `filmFor` now steps
  one keyframe per frame and the DAG joins in when the film is ready (the grid, the chart and
  the pane move from the first frame). I did not profile the per-frame cost further; it is
  filed below.
- `speed` has a floor of 0.25× (`AA.parseSweepSpeed`); the filmstrip sets `__sweep.speed`
  in the frame to go slower than a screenshot.
- Reduced motion rounds the pane's *displayed* index only; the continuous `playbackPosition`
  keeps the pace — the filmstrip emulates it so a frame is a whole point.

## Evidence (main checkout's data, this tree's apps; `tests/debug_pane_play_filmstrip.mjs`)

Pane's play pressed, 28 readings, one synchronous read of every surface each. Excerpt
(full table printed by the script; pane frame → what the page read at that instant):

| pane frame | angle | cursor x | grid (first numbers) | DAG bar ends (sum) |
|--:|--:|--:|--|--:|
| 0 | -7.0 | 508 | ±0.290 1.574 ±0.024 deg | 14934.4 |
| 1 | -6.0 | 503.86 | ±0.285 1.545 ±0.023 deg | 14901.7 |
| 2 | -5.0 | 499.65 | ±0.280 1.518 ±0.023 deg | 14868.0 |
| 3 | -4.0 | 495.35 | ±0.275 1.492 ±0.022 deg | 14835.3 |
| 7 | 0.0 | 477.39 | ±0.259 1.404 ±0.021 deg | 14702.6 |
| 10 | 3.0 | 463.14 | ±0.249 1.350 ±0.020 deg | 14604.6 |
| 18 | 11.0 | 422.17 | ±0.228 1.245 ±0.019 deg | 14453.6 |
| 27 | 20.0 | 371.69 | ±0.213 1.177 ±0.018 deg | 14353.6 |

Columns advance together, and the same pane frame gave the same four readings every time it
was read (rows with the same pane frame are identical on all four surfaces). In the last run
27 of 28 readings had the page exactly on the pane's frame and one (pane 12) showed the page
one frame behind (angle 4.0, frame 11's). **So "identical columns" holds as: the page's
surfaces move on one pose and agree with each other, and at a slow pace they sit on the pane's
frame; at the pane's full pace on a loaded box the page trails by its own draw time (above).**
The DAG column's sum is the one honest summary of its bar ends; the DAG is eased between
keyframes (`VA.poseFilm`), so it is a few px off a settled render mid-play by design.
Pause: the pane paused at frame 28 / angle 21.0 / cursor 365.84 and 800 ms later read the same
on all four. Seek: the browser tier's check lands the angle read-out on frame 5's angle after
`seek #5`.

Stills in `shots/the_linkage_play_control_is_the_only_one_and_it_moves_everything/`:
`pane_play_filmstrip.png` (28 frames, each stamped) and `mid_sweep_page_and_pane.png` (page
mid-sweep with the pane beside it; the pane's head says 55.3010 mm · 7.006 deg, the page's
read-out 7.0, the chart cursor at 7).

## Verified

- Worktree (`C:\workspace\tolstack-worktrees\the_linkage_play_control_is_the_only_one_and_it_moves_everything`): `node apps/viewer/run_tests.cjs` 544/544 (node-fs tier skipped: no projection in a worktree); `node apps/annotate/run_tests.cjs` 297/297.
- Browser tier from the worktree against the main checkout's data (`node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack --only ...`, a junctioned `node_modules`): "annotate rail holds still" 17/17 (carries the three pane-driven checks) and "the DAG zoom, Fit and the grid header" 44/44. The whole browser tier was **not** run here — the reviewer's post-merge run in the main checkout covers it.
- Mutation witnesses for every new guard, `--repo C:/workspace/tolstack`: read-out (fast), embedPose (annotate), no-Play-button (browser), play-moves-page, seek-lands — WITNESSED, and pause-holds — all six, after the checks were made tolerant of a loaded box (several samples, wait-until-three-agree).
- `pytest -q` in the worktree: see the end of this file.

## Left over

- Filed: `docs/issues/ISSUE_20261108_the_kinematic_page_cannot_play_or_scrub_without_the_3d_pane.md` (strategy, low) and `docs/issues/ISSUE_20261108_the_page_trails_the_3d_pane_by_its_draw_time_at_full_pace.md` (the lag above).
- The `pytest` reds that are the worktree, not the change: `tests/test_viewer_js_suite.py` (no projections here, by design) and `tests/test_mutation_witness_shadow_concurrency.py` (a Windows `rmtree` EPERM in the shadow tree — fails on its cleanup, not on a witness).
- `docs/prompts/REVIEW_AGENT.md` still cites the old Play-button sighting as history; left as is.
