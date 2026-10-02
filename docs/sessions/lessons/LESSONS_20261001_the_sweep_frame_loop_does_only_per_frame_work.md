# LESSONS 2026-10-01 — the_sweep_frame_loop_does_only_per_frame_work

Two defects in `apps/annotate/app.js`'s sweep-mode frame loop (`tickSweep` /
`applySweepFrame`), both filed against `kinematic_sweep_animation`'s review:
reduced-motion playback was bound to the frame clock instead of the wall
clock, and unchanged ghost/transparency state was re-applied every frame.

## What reduced motion means here

The handoff asked this to be settled explicitly: "advance discretely" and
"advance slowly" are different accommodations, and the issue's own framing
didn't pick one. The decision: reduced motion means **discrete, not slow** —
the same wall-clock pace as ordinary playback (`speed` still governs it),
with the position snapped to whole points so nothing tweens between them.
That is what the pre-existing comment in `setSweepIndex` already claimed
("the same answer apps/viewer gave its own animation") and what the
`SWEEP_POINTS_PER_SECOND` constant's own comment argues for (a pace "a reader
can still see a linkage move at") — reduced motion removes the *motion*
blur, not the *speed*.

## The bug under the bug: rounding the pacing state, not just the display

The direct fix for defect 1 looks like the issue's own suggested shape:
round `AA.sweepAdvance`'s continuous answer instead of discarding it with
`AA.sweepStepIndex`. That alone is **wrong** — it stalls playback almost
entirely at a high frame rate. `tickSweep` was storing the *rounded* value
back into `sweep.index` and feeding that same value into the next tick's
`AA.sweepAdvance` as its basis. At a fast frame rate each tick's own step is
small (24 pts/s at 1x over a 4 ms frame is 0.096 of a point), and rounding
that away on every single tick means the fractional progress never gets the
chance to accumulate past 0.5 — measured directly: a synthetic ~200 fps run
advanced to index **5** over 1000 ms where the correct answer is **24**.

The fix is two numbers, not one: `sweep.playbackPosition` is the continuous
value `AA.sweepAdvance` actually integrates, and `sweep.index` — what gets
rendered, scrubbed and read — is `Math.round(playbackPosition)` only under
reduced motion, otherwise the same value. Every manual move
(`setSweepIndex`, `setSweepIndexQuietly` — seek, step, drag) resyncs
`playbackPosition = sweep.index` so a manual navigation is never undone by
the next tick continuing from a stale continuous position. `cmdPlay`'s
existing `sweep.lastTick = null` already covers the pause/resume case for
free (the first tick after it only sets the baseline and does not advance).

**Measured** (`apps/annotate/run_browser_check.mjs`'s new
`reducedMotionTimingPass`, mock scene, 1x speed, 3000 ms window): a page
whose `requestAnimationFrame` is serviced every 4 ms (~106–202 fps observed)
and one serviced every 60 ms (~11–15 fps observed) — about 15–20x apart —
land within one point of each other (72 vs. 70/71 across three runs), and
`speed` changing from 1x to 4x changes the distance covered in the same 500
ms window by roughly 4x (12 → 48–51). CPU throttling via CDP's
`Emulation.setCPUThrottlingRate` was tried first as the "throttled tab" the
issue names, and did not reliably move the measured `requestAnimationFrame`
cadence under headless Chrome's SwiftShader rasterizer here — the check
instead overrides `requestAnimationFrame` with a `setTimeout` at a chosen
interval via `page.addInitScript`, which deterministically controls the
cadence instead of hoping the environment cooperates.

## Defect 2: the witness has to live below three.js's own per-frame churn

The obvious browser-check witness for "no redundant ghost re-application" —
read `mesh.material.version` before and after a few seconds of playback and
assert it didn't move — **does not work**, and not because the fix is wrong.
`WebGLRenderer.render()` itself calls `material.needsUpdate = true`
internally on *every* render, for reasons that have nothing to do with this
app (confirmed by patching the `needsUpdate` setter and reading the stack:
the call originates inside `vendor/three.module.min.js`'s own render path).
Measured with the sweep paused and nothing touched at all: `material.version`
still climbed by 2 every single animation frame. A check built on that number
would have reported the regression as present even after it was fixed, and
would have stayed green through a reintroduction of the regression too, for
the same reason — it never measured this app's own code.

The fix: wrap `AnnotateScene.prototype.setGhost` / `setSweepGhost` (the two
functions `applySweepFrame`'s cache now guards) to **count calls**, pay the
one-time cost of turning the ghost layer on, zero the counters, then play for
500 ms and assert both counters are still zero. That is a witness of this
app's own composition rather than of three.js's internals, and it is the one
that would actually catch a reintroduction (confirmed: re-running it against
the pre-fix `app.js`, both call counts are nonzero).

## Guarding the composition — where it lives and where it can't

Both guards live in `apps/annotate/run_browser_check.mjs`, not
`run_tests.cjs`: `tickSweep` and `applySweepFrame` need the DOM and a
`THREE.Scene`/`WebGLRenderer`, which `run_tests.cjs`'s sandbox deliberately
has none of (its own header: "scene.js ... is NOT exercised here — there is
no WebGL in Node"). `run_browser_check.mjs` is the one harness that boots
`app.js` and `scene.js` together, so it is the one place a regression in
either defect can be observed rather than argued.

**This harness is not reachable by the mutation-witness tier at all**, and
that is a pre-existing, already-filed, already-deferred gap rather than
something this handoff introduces or should close:
`scripts/run_mutation_witness_tests.mjs`'s `TIER_HARNESS` registers the
annotate app's *pure* tier (`apps/annotate/run_tests.cjs`, tier name
`annotate`) and the *viewer's* browser tier (`scripts/run_viewer_browser_tests.mjs`,
tier name `browser`) — there is no tier entry for
`apps/annotate/run_browser_check.mjs` at all, so nothing in
`scripts/guard_enumeration.mjs`'s census counts its checks and no spec under
`scripts/mutation_witnesses/` can name one.
`ISSUE_20261001_four_sweep_mode_gaps_the_handoff_left_and_nobody_owns.md`
(deferred to 2026-10-15) already names this exact gap as its row 4 ("`run_browser_check.mjs`
is run by no gate"); the four new checks this handoff adds are more of the
same unenrolled surface, not a new one, so no new issue is filed for it —
closing row 4 of that issue is what would also give these four a witness.

## No other `requestAnimationFrame` path in this app has either shape

Checked, not assumed. `apps/annotate` has exactly two: `app.js`'s own
`sweepClock` (the one fixed here) and `scene.js`'s `animate` (camera
controls + render). `animate` has neither defect:

* **Not `a_rate_bound_to_the_frame_clock`**: the only thing in it that could
  be frame-rate-coupled is `OrbitControls.update()`'s damping, and this app
  never sets `enableDamping` — it defaults to `false`
  (`vendor/OrbitControls.js`), so there is no per-call decay for a frame rate
  to distort.
* **Not `per_frame_work_that_is_not_per_frame`**: the loop's only
  content-producing call is `renderer.render()` itself, which is the base
  "draw whatever is currently true" operation, not a derived side effect
  being redundantly recomputed — there is no cached/skippable state here the
  way there was in `setGhost`/`setSweepGhost`. (Continuous rendering of an
  unchanging scene is its own, separate cost — visible in this session as the
  software-rasterizer's 4 fps floor — but that is a render-on-demand
  architecture question, not an instance of either filed defect, and well
  outside this handoff's scope.)

## The frame-rate measurement the handoff asked for, and why it came back flat

`node apps/annotate/run_browser_check.mjs --real vpa-pitch-p1-20261001-203656`,
ghost layer **on**, against the real published run:

| | before (pre-fix `app.js`) | after (this change) |
|---|---|---|
| ghost off | 4.0 fps | 4.0 fps |
| ghost on | 9.1 fps | 4.0 fps |

Measured by hand: the pre-fix number was taken by writing `HEAD~1`'s
`apps/annotate/app.js` over the working tree, running the check, then
restoring the committed (fixed) file byte-for-byte (`git diff HEAD` empty
afterward) — not by asserting the improvement, per the handoff's own
instruction.

**Read this with real suspicion, not as a before/after win.** This machine
was running on the order of a dozen concurrent agent sessions throughout this
one (`ListAgents` showed 14 peers, several `busy`), and the installed mesh
set under `data/meshes/` was being actively rewritten by the parallel,
concurrently-staged handoff `mesh_store_reconciled_to_the_pure_signature`
while these numbers were taken (see "Found dirt" below) — both are enough
noise on their own to produce a *faster* reading for the supposedly more
expensive "ghost on, pre-fix" configuration than its own "ghost off"
sibling, which is exactly the physically-backwards result in the table
above. The only thing these four numbers support is "both configurations,
before and after, advance playback with the ghost layer on" (which the
`[real]` check above asserts and which is true). The dependable evidence
for this defect is the deterministic call-count guard, not the fps column:
removing a few redundant JS calls and allocations per frame is not expected
to move a number this dominated by software-rasterizing ~1.4M triangles per
frame (measured once, at 4.0 fps — about 250 ms/frame) — the benefit is
correctness (no forced GPU resource churn from `needsUpdate`) and reduced GC
pressure, which would show up on hardware where rendering is cheap and this
per-frame overhead would be the bottleneck instead, not in this floor.

## Found dirt (not mine to fix)

`venv-win/Scripts/python.exe -m pytest -q` in this worktree: **1431 passed,
3 failed, 11 skipped** (469 s). One failure is the documented,
expected-in-a-worktree `tests/test_viewer_js_suite.py` red (`data/projections/viewer/`
exists only in the main checkout; repo `CLAUDE.md` calls this out explicitly).
The other two —
`tests/test_part_mesh_aliases.py::test_every_mesh_side_value_matches_an_installed_meshes_part_id`
and `::test_every_sha256_quoted_in_an_evidence_string_names_its_own_mesh` —
are not this handoff's: every row in the failure list names a mesh directory
as "no such mesh" against `data/meshes/` in the **main checkout**, which this
handoff was explicitly told not to touch (owned by the parallel staged
handoff `mesh_store_reconciled_to_the_pure_signature`, running concurrently
in another worktree against that same shared directory). `apps/annotate/run_tests.cjs`
shows the identical symptom on its own `[real]` alias-resolution check,
re-run twice with the same result both times. Nothing in this handoff's diff
touches `data/meshes/`, `docs/topologies/part_mesh_aliases.json`, or any
Python test — this is the other handoff's in-flight state, read mid-write,
not a regression here. Filing no issue for it: it is the other handoff's own
work in progress, not an unowned defect.

## The suites

* `apps/annotate/run_tests.cjs` (pure tier, this worktree): **176/177
  passed** — the one failure is the mesh-alias symptom above.
* `node apps/annotate/run_browser_check.mjs` (mock scene): **35/35 passed**,
  including the two new guards for these defects and the new reduced-motion
  timing pass.
* `node apps/annotate/run_browser_check.mjs --real vpa-pitch-p1-20261001-203656`:
  **43/43 passed**.
* `venv-win/Scripts/python.exe -m pytest -q` (this worktree): **1431 passed,
  3 failed (all pre-existing/unrelated, see above), 11 skipped** (469 s).
* Main-checkout-only tiers (`node scripts/run_mutation_witness_tests.mjs`,
  `node scripts/run_viewer_browser_tests.mjs`, `node apps/viewer/run_tests.cjs`)
  were **not** run: this handoff's diff touches only `apps/annotate/app.js`
  and `apps/annotate/run_browser_check.mjs`, neither of which those three
  tiers read (the annotate pure tier and the annotate browser-check tier
  above already cover everything this diff can affect), and
  `run_mutation_witness_tests.mjs --unenrolled` confirms `run_browser_check.mjs`
  is not a tier it knows how to run at all (see "Guarding the composition,"
  above) — so there is nothing new for those three to enroll or witness.
