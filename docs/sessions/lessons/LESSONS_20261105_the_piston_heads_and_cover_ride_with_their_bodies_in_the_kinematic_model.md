# LESSONS 2026-11-05 — the piston heads and cover ride with their bodies in the kinematic model

## The four-list diff (deliverable 1)

Measured on the live kinematic study (`tests/debug_piston_heads_ride.mjs`, real projection, the
BEFORE read on the main checkout's apps):

| list | contents |
| --- | --- |
| parts the study's edges cite | both piston heads, the piston cover, the piston body, both mounts, … (every lit contributor's part) |
| `VA.litPartIds` | **includes all three** — they are cited by `piston_head_*_thickness`, `piston_head_lower_face_flatness`, `piston_cover_flange_to_end_stop`, so the scope was never the gap |
| drawn at rest | both heads yes (installed meshes `asm217755_214699_002`, `_214698_002`); **the cover no — no mesh exists** (`mesh.installed = false`; nothing in `data/meshes/` names 214958) |
| posed by the sweep artifact | `base` (hub, two mounts), `pitch_plate` (plate + `gas_spring_piston_214700_002`), `blade`, links — **neither head nor the cover** |

So the finding is two different gaps, not one: the heads were drawn but **did not move** (the
annotator's anchoring walks linkage's body lists only, and the heads are recorded as *siblings* of
the piston body under `P3-214700.3`, so "carried inside a matched occurrence" misses them), and the
cover was **not drawn at all** because its mesh was never extracted. The handoff's "three mesh
manifests" is two. Filed: `ISSUE_20261105_the_piston_cover_214958_002_has_no_installed_mesh_...`.

## Fold or `rides_with` — `rides_with` (the handoff's fallback)

I folded first (heads → `pitch_plate`, cover → `base`) and measured: the product model's walk went
14 → **15 columns** and `layout_crossings` 16/70/50 → **24/84/74**, with the plate from five blocks
to four. Both are pinned. A fold that widens and tangles the DAG Jeff reviews is a visible cost for a
motion fact only the 3D pane reads, so I reverted it and added `Body.rides_with` (optional id of
another body, validated: declared, not self, host not itself a rider and not a link; projected on
every body row; `docs/DAG_TOPOLOGY.md`, "Bodies"). The three bodies keep their containers; the
annotator reads `rides_with` in `anchorSweepBodies`. The layout cost is filed for strategy
(`ISSUE_20261105_folding_the_piston_heads_and_cover_..._dag_walk`): if the walk improves, drop
`rides_with` and fold.

**Body-count pins:** unchanged (no body added or removed, so `test_every_body_of_the_product_model_…`
and the crossing pins stand as they were). The census pins moved +1 fast, +1 annotate — one guard each,
with specs.

## How a rider is placed

`AA.sweepRideChoice` (`sweep.js`): one recorded occurrence → that one; several → the ones sharing the
deepest path (≥3 segments) with a placed part of the host, a tie or nothing shared is a refusal in
words. Row state `rides` (drawn like a matched row, claims the plate's pose); a ground host gives a
`ground` row. A part already carried inside a placed occurrence is left to the existing carry rule.
`modelPartInfo` also falls back to the host as a part's subject.

Physical mapping, **partly confirmed**: the lower head seats on the piston body
(`piston_body_head_seat`), the cover on the mount flange (`piston_cover_mount_flange_seat`) — both
read off topology nodes and pinned by a test. The upper head has **no node to the piston body**: it
stacks on the lower head (`piston_heads_seat`). The assembly evidence is the mesh provenance: both
heads and the piston body are recorded under `217755-001 / … / P3-214700.3`, i.e. one sub-assembly.
I did not open the 2 GB STEP; "recess holds the body's top face" from the handoff is not something
the topology states.

## Linkage

Nothing needed. Linkage's sweep need not pose the heads or cover; the tolstack side poses them
through their hosts.

## Verification caveats

- Full `pytest -q` in this worktree: 1729 passed, 4 failed, 1 skipped, 2 deselected, **1617 s** (over
  the 10-minute default budget; serial, no xdist in this venv). The four: `test_viewer_js_suite` (the
  known worktree red — the `[real]` viewer tier needs the main checkout's projection), the two
  `test_mutation_witness_shadow_concurrency` tests (EPERM reaping another run's shadow dir under
  `tmp/` while the box was loaded), and the enrollment census, fixed afterwards by the two specs and
  pins (re-run green apart from this lesson's file, which the specs cite).
- The viewer `[real]` tier and the annotate/viewer browser tiers could not be run against trunk's
  projection: my topology change (`rides_with`) is not in the main checkout, and I did not overwrite
  the shared projections. I built this branch's projections into a scratch root
  (`data/scratch/dr`, junctions to the main data) for the probe only. The browser slot was held by
  other agents' runs for most of the session.
- The `[real]` check added to `apps/annotate/run_browser_check.mjs` was **not run**.

## Found on arrival

Nothing (worktree clean).

## Not shown (superseded -- see "Re-run 2026-11-06" below; this was true of round 1)

The feather/low-stop screenshots, the `[real]` check and the exploratory click-around had not been
run in round 1. Round 2 ran the first two; the click-around is still open (below).

## Re-run 2026-11-06 (round 2, after REQUEST CHANGES)

Merged `review/...` first (resolved census: annotate 291). Worked in the review's scratch root
(`data/scratch/review_piston`, projections built from the merged tree, junctioned into the worktree
and removed before commit); main checkout's projections untouched.

**Blocker 1 -- it was the harness, not the rider code.** `realPass` boots `?mock=1` and replaces the
adapter's read methods, but not `readTopologyProjection`, so `sweepTopology()` resolved the run's
`vpa_pitch_linkage` against the *mock's* topology, which has no `rides_with` -> `riders` empty -> no
head row. Fix: `P.readTopologyProjection` now serves the real `topologies.json`
(`apps/annotate/run_browser_check.mjs`). With it, the real P2 run poses both heads as `rides` rows
on `pitch_plate` (`214699-002.1`, `214698-002.1`) and the cover has no row (no mesh); the existing
check "[real] both piston heads ride the pitch plate..." is green, no product code changed.
New check "[real] each piston head's drawn matrix keeps its offset to the piston body, and moves,
between the low and the feather stop": green. Drawn translation z (mm): piston and both heads
-23.334 at the last point, 41.132 at the first -- identical to the piston's, so the heads move with
the plate. Witness spec for the rider rule re-run: 2/2 witnessed; `tests/test_mutation_witnesses.py`
44 passed.

**Blocker 2 -- shots** (`shots/<slug>/`, taken by the `[real]` pass, run vpa-pitch-p2-20261105-204957):
`2_feather_stop.png` is the last sweep point (blade pitch 72.0 deg, actuator travel 0.0 mm) and
`3_low_stop.png` the first (-6.99 deg, 64.47 mm). Honest limits: the scene is transparent, so the
heads are not individually legible in a still -- the piston column visibly translates between the
two, and the numeric check above is what pins the heads to it; I did not verify "lower head
touching the end stop" by eye, and the **cover is not drawn** (no mesh; issue filed in round 1).
Also: the earlier `1_pane_at_rest.png` named in round 1 is not tracked on this branch.

**Item 3 -- the two mock anchors failures are not this diff's.** An `integration` checkout
(throwaway worktree, removed) fails the same two ("the mock's bound face moves its node onto the
face's fitted point", "the anchors message is computed for a drawn frame") and the reduced-motion
playback timing checks (2 there; 1-2 here, load-sensitive). Counts: integration 105 PASS / 4 FAIL,
this branch 104-105 PASS / 3-4 FAIL before the shared stop. Both also stop at the same place:
`.an__sweep-bodies > summary` click times out on integration too (filed:
`ISSUE_20261106_the_annotate_real_pass_cannot_click_the_bodies_disclosure_summary`), so later
`[real]` checks (disclosure, fps) are unreachable on either tree; that is why "the `[real]` pass
green" is **not** fully met: everything up to that click is green, including the piston checks.

`node apps/annotate/run_tests.cjs`: 291/291. Viewer tier through `--repo` (633/633) and full pytest
not re-run (no Python or viewer change in round 2). **Exploratory click-around not done** (the one
browser slot was queued behind other agents for most of the session); the shots above are the only
real-projection looks at the change.
