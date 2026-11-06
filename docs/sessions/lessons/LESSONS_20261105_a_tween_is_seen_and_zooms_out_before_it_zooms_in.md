# Lessons — a tween is seen, and zooms out before it zooms in (2026-11-05)

## Root cause of "three frames"

Measured on the real kinematic study → chain study switch (`pitch_link_cotter_hole_clearance`),
Chrome headless, 1600x1000, real clock, 260 ms tween:

- **3 renders per tween** (setup render 368 ms, one mid frame 82 ms, settle 426–1076 ms),
  gaps between them 170–480 ms. Each frame was `VA.renderTopoPane` end to end: ~1130 nodes
  built (888 of them in the rails SVG, ~210 grid, 28 header), then laid out and painted.
- Cost split of a rebuilt frame: JS geometry (bandLayout/gridPlan/rowPositions/railGeometry/
  leaders) ≈ 5–10 ms; **DOM construction + re-layout of the new tree ≈ 60–100 ms and up**;
  the rest is the browser's paint. The geometry was never the cost — the rebuild was.
  A 260 ms tween cannot hold a 100+ ms frame, so it was three jumps; a longer duration with the
  same frames would have been three jumps over longer.

## What changed

`VA.animateTopoPane` no longer renders per frame. It renders the pane **once per keyframe**
(outgoing picture at e=0; the pulled-back frame if any; the target), keeps each render's
numbers (every attribute plus the style properties that move), and tweens the **live nodes'
own attributes** between them (`takeSnapshot` / `pairSnapshots` / `applySnapshotPlan`,
`views/topology.js`). Only the final frame rebuilds, as a plain `renderTopoPane` — so the
settled DOM is still a fresh render of the same selection (the existing pin). Per frame:
attribute apply ≈ 5–7 ms, pad+scroll ≈ 10 ms, pin ≈ 0–1 ms (829 moving properties on the
study switch). If the keyframes' trees cannot be paired (different node counts/tags) the
old per-frame render runs instead — not seen on the real study switches filmed here.
`VA.lastTopoRender` is re-derived each frame (blended scalars, `tweenPositions` at the
frame's progress), so an interrupting transition still continues from the picture on screen.
Wheel and Fit now land a transition in flight first (`handle.finish()`, `settleTween`).

## Fit, then focus

`landing.waypoint` (topology_app.js `landingHooks`) names the scale at which the union of the
outgoing lit span and the target's fits the window (height and DAG width). Two legs
(start → pulled-back → arrival, keyframe at respine progress `VA.RESPINE.fitAt` = 0.5) run
**when that scale is smaller than the lower of the start/target zooms by more than
`VA.RESPINE.fitSlack` = 0.02** — i.e. when going straight would take either lit set out of the
window part-way; otherwise one leg. No tuned threshold beyond that slack: the rule is "does
the union fit at the zoom we'd have anyway". Pad and scroll follow the same two legs; the
pulled-back scroll centres the union (`midRendered`). Reduced motion still jumps.

Durations, by eye on the filmstrips (constants next to `VA.RESPINE`, topology.js):
`duration` 700 ms (one leg), `fitDuration` 1100 ms (two legs, 45 % pulling back, each leg
ease-in-out so the camera rests at the fit). Was 260.

## Landing sites

| site | path now |
| --- | --- |
| study / kinematic switch (nav) | `animateTopoPane`, ghost + fit-then-focus. `shots/…/study_switch.png`, `respine-back.png` |
| 3D pane opening (`launchAnnotate`) | `beginGlide`/`endGlide`: same engine, no ghost. `pane-open.png` |
| 3D pane closing (flyout `close`) | same glide around `dropBandPad(); fitDagTo(true,true)` |
| landing after a non-tween paint (`landingPending`) | unchanged — one step, no outgoing picture (boot / first open) |
| grid-row click / tag filter | repaint, drawing holds still: `row-click.png`, 0 px delta over 12 frames |

`pane-open`: the band still moves ~410 px in the first filmed frame — that is the page layout
(nav column grows, scene column appears), not the drawing; the glide then carries the pad/scroll
residue (181 → 0 px) over the tween. Filed as an issue.

## Frame count — honest status

Before: 3 rendered frames per tween (above). After: the engine's own work is ~25 ms/frame, but
**I could not demonstrate ≥ 30 rendered frames on this box**: it was shared with other
agents' browsers, and long-animation-frame entries show 500+ ms paint-only frames (no script)
even on the *untouched* page, so wall-clock frame pacing here is raster/contention-bound
(real-clock runs saw 2–3 engine frames per tween, each stalled by ~550 ms of non-script
rendering). The deterministic evidence is the stepped-clock filmstrips (frames at fixed
page-time steps, content continuous) and the fast-tier tests (frames between keyframes build
no nodes: `the frames between keyframes move the live nodes and build none`). **The 30-frame
target is unproven; re-measure on a quiet box** (`scripts/filmstrip.mjs --real-time` with a
scenario counting `VA.pinTopoHead` calls). Jumps: the 100 ms-step strips are not a per-frame
proof; rerun with `--interval 30`.

## Not run / for the merge

- `node apps/viewer/run_tests.cjs`: 519/519 here; **the [real] node-fs tier SKIPPED** (the main
  checkout's projection was built from an older tree: stale, rebuild is the merge's job).
- Browser TRUTH tier and `run_mutation_witness_tests.mjs --changed-since` were **not run**
  (need the main checkout and a fresh projection). Tests that pin the removed per-frame
  mechanism were rewritten (the throwing-frame test now throws from `onPainted`).
