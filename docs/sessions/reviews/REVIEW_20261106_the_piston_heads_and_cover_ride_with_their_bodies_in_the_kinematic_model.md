---
type: review
handoff: docs/sessions/active/HANDOFF_20261105_the_piston_heads_and_cover_ride_with_their_bodies_in_the_kinematic_model.md
reviewer: agent
date: 2026-11-06
verdict: APPROVE (round 2)
blockers: 0
---

# Review — the piston heads and cover ride with their bodies

Not merged to `integration`. The branch was merged into the review branch only
(one conflict, below) so the checks ran on the merged tree.

## Blockers

1. **The handoff's new `[real]` annotate check is red when run, and the author never ran it.**
   `apps/annotate/run_browser_check.mjs` check "[real] both piston heads ride the pitch plate,
   and the cover with no mesh has no row" fails. Run:
   `node apps/annotate/run_browser_check.mjs --real vpa-pitch-p2-20261105-204957` against a scratch
   root built from the merged tree (`rides_with` present in its `topologies.json`). The sweep's
   body rows list the base parts, plate, piston, blade, links and the carried hardware, with **no
   row at all for either head** (`rides` or `refused`). Either the check is written against
   a run/topology it cannot apply to (P2 vs the kinematic study's run), or `anchorSweepBodies`'
   rider loop does not fire for a real run -- the lesson's own caveat says this check
   "was not run". Needs: run it, find which, fix code or check, and show the heads
   actually posed with the plate on the real run (a `rides` row with placements).
2. **Definition of done: screenshots not delivered.** Only `1_pane_at_rest.png` is committed; the
   handoff asks for the kinematic study's 3D pane at the feather stop and the low stop with the
   heads and cover. `tests/debug_piston_heads_ride.mjs` is the tool (my run of it timed out
   waiting for sweep bodies; the author's lesson says the browser slot was held, so the
   sweep half of it was apparently never captured). The lesson's "do they move" claim therefore
   rests on unit tests of `sweepRideChoice`/`sweepDrawPlan` only.

## Also unverified (not counted as blockers)

- Annotate browser tier (mock) showed 4 failures on the merged tree: "the mock's bound face moves
  its node onto the face's fitted point", "the anchors message is computed for a drawn frame",
  and two reduced-motion playback timing checks (the latter two are frame-rate/load sensitive;
  the box was contended). I did not run integration's baseline, so I cannot say the two
  anchors failures are not this diff's (it touches `modelPartInfo`/`anchorSweepBodies`). The
  author should compare against an integration baseline and say.
- The cover is not drawn at all (no installed mesh) -- honest, and filed by the author
  (`ISSUE_20261105_the_piston_cover_214958_002_has_no_installed_mesh_...`); deliverable 3 is
  therefore met for the two heads only.

## Verified

- Design: `rides_with` instead of a fold. The author measured the fold (walk 14 -> 15 columns,
  crossings 16/70/50 -> 24/84/74) and filed the cost (`ISSUE_..._widens_and_tangles_the_dag_walk`);
  the handoff allowed this. `Body.rides_with` is validated (declared, not self, host not a rider
  nor a link), projected on every body row, documented in `docs/DAG_TOPOLOGY.md`, tested
  (`test_a_body_may_ride_with_another_that_is_posed`, the topology and projection pins).
  No `fold()` involvement; nothing here touches a tolerance value.
- Four-list diff in the lesson: scope (`litPartIds`) already held all three parts; the gap was
  motion (heads) and a missing mesh (cover). Reasonable and matches what I saw (pane at rest draws
  both heads).
- New viewer `[real]` pin (every cited part is in the study's 3D set): viewer tier
  **633/633** through `--repo` against a scratch root built from the merged tree.
- Annotate node tier: **291/291**.
- Mutation witnesses: both new specs `WITNESSED`; `--changed-since integration` **5/5 witnessed**.
- Full suite in the review worktree (post-merge, 18m38s -- over the 10-minute default budget,
  the lesson recorded the same order): **1732 passed, 1 failed, 1 skipped, 2 deselected**. The one
  failure is `test_viewer_js_suite_is_green`, the documented worktree-only red; its tier is green
  through `--repo` (above). Contention header lines were not captured (output tailed).

## Merge conflict (review's own)

`scripts/guard_enumeration.mjs`, annotate row. Integration: `declared 290` (+3, the rail handoff);
handoff: `288` (+1, the rider rule). Resolved to **291** = integration's 290 + this handoff's 1, and
the names digest re-measured from the pin test (`e183a53c331f`). Both comments kept.

## For the rework

Run the [real] pass and the probe with a scratch root exactly as the overlay describes
(topology/viewer/parts projections built from the merged tree), and attach the feather- and
low-stop shots. I used `data/scratch/review_piston/` (may be reused; it needs `docs/` and the
`venv-win` junction, both present).

## Rework brief (for the tactical agent — read this, then the two blockers above)

Round 1 sent back. Your last commit (`d16222ba`) only records that the browser work did not
happen; nothing in the diff changed, so both blockers stand. Do these, in order, and stop when
each has evidence. Do not wait for the main checkout and do not rebuild its projections.

**0. Use the review's scratch root — it already exists.**
`C:\workspace\tolstack\data\scratch\review_piston\` holds `data/` (inbox, meshes copied;
`projections/` built from the merged tree with `rides_with`), `docs/` and a `venv-win` junction.
Merge `review/the_piston_heads_and_cover_ride_with_their_bodies_in_the_kinematic_model` into your
branch first (it carries the resolved `guard_enumeration.mjs` census: annotate 291, digest
`e183a53c331f`). Your worktree has no `node_modules`: junction it to the main checkout's
(`New-Item -ItemType Junction`), and — for the annotate runner, which reads `data/` from the
worktree first — junction `data/projections/{topology,viewer,parts}` to the scratch root's
(PowerShell, not `cmd mklink` with a variable). Remove the junctions before you commit.
Browser runs take the one slot and queue; run each ONCE, in the background, and read the output
file instead of re-running.

**1. Make the red `[real]` check pass (blocker 1).**
`node apps/annotate/run_browser_check.mjs --real vpa-pitch-p2-20261105-204957`
fails "[real] both piston heads ride the pitch plate…": the sweep's body rows hold the base
parts, plate, piston, blade, links and carried hardware, **no row for either head** (not even
`refused`). Find out which of these it is, and say so in the lesson:
 - `anchorSweepBodies`' rider loop never reaches the heads on a real run. Check, in order:
   `sweepTopology()` (needs `state.sweep.artifact.topologyId` to name a topology in
   `state.topologyProjection` — is it `vpa_pitch_linkage` for a P2 run?), whether `riders` is
   populated, whether `AA.resolveMeshIdentifier` finds `asm217755_214699_002`/`_214698_002`,
   whether `occurrences.byMesh` has them, and the two early `continue`s (`rows.some(…)`,
   `own.every(…occurrenceWithin…)` — the heads are recorded as siblings of the piston body under
   `P3-214700.3`, so the second may be swallowing them as "already carried");
 - or the check is written against a run it cannot apply to (P2 vs the kinematic study's run).
Fix the code or the check (and the unit test / witness spec if the rule changes), then show the
real run poses both heads with the plate: a `rides` (or documented `carried`) row with
placements, and the head's matrix moving between two sweep points. Re-run the two witness specs
(`--only <spec>` with `--repo C:/workspace/tolstack/data/scratch/review_piston`).

**2. Screenshots at the feather stop and the low stop (blocker 2).**
Take them through the annotate `[real]` pass (it drives the sweep standalone and gets to
`__sweep.bodies` in ~150–200 s); the viewer-embedded probe's `sweep` step is what stalled for you
and is not the right harness. Put them in `docs/sessions/lessons/shots/<slug>/`, name them
`2_feather_stop.png` / `3_low_stop.png`, and say in the lesson what each shows (head on the end
stop at feather; cover stays with the mount; the cover is **not** drawn — no mesh, filed). Then
do the handoff's exploratory click-around on the real projection and keep its shots too.

**3. Say whether the two mock anchors failures are yours.**
On the merged tree the mock annotate run (`node apps/annotate/run_browser_check.mjs`, no flags)
fails "the mock's bound face moves its node onto the face's fitted point" and "the anchors
message is computed for a drawn frame" (the two reduced-motion playback timing checks are
load-sensitive; ignore them unless they reproduce on a quiet box). Run the same mock pass once
on an `integration` checkout (a throwaway worktree of `integration`) and record both counts.
If integration is green on those two, they are this diff's (suspects: the `modelPartInfo`
fallback, the new `link: true` subject flag) and must be fixed.

**Definition of done for round 2:** `[real]` annotate pass green including the piston check;
two stop screenshots committed; baseline comparison recorded; viewer tier through `--repo` the
scratch root still 633/633 (plus your changes); `node apps/annotate/run_tests.cjs` green;
lesson updated (replace the "Not shown" section — it should no longer be true). Do **not** touch
linkage, opacity rules or the grid, and do not rerun the full pytest suite unless you change
Python; the review owns the post-merge run.

## Re-run 2026-11-06 (round 2) — APPROVE

Round 1 was REQUEST CHANGES, 2 blockers; both are closed.

- **Blocker 1 was the harness, not the rider code.** `realPass` replaced the mock adapter's reads but
  not `readTopologyProjection`, so the run's topology resolved against the mock's, which has no
  `rides_with`. The rework serves the real `topologies.json`; no product code changed. I re-ran
  `node apps/annotate/run_browser_check.mjs --real vpa-pitch-p2-20261105-204957` on the merged tree in
  my scratch root: both heads are `rides` rows on `pitch_plate`; "[real] both piston heads ride the
  pitch plate…" PASS; the new "[real] each piston head's drawn matrix keeps its offset to the piston
  body, and moves…" PASS (heads at the piston's own z at both stops: -23.334 feather, 41.132 low).
- **Blocker 2:** `2_feather_stop.png` and `3_low_stop.png` are committed and show the stops
  (the panel reads "19 of 19 parts placed", up from 17). The heads are not individually legible in
  a still (transparent scene); the numeric check carries that claim.
- The mock-pass failures (two anchors checks, two reduced-motion timing checks) reproduce on an
  `integration` checkout per the author's baseline, and again in my run: not this diff's. The real
  pass then stops at the `.an__sweep-bodies > summary` click on both trees (filed by the author);
  checks after it are unreachable on either, which is a pre-existing limit, not a regression.
- Subset after round 2: `tests/test_mutation_witnesses.py test_tolerance_stack.py test_provenance.py
  test_claims_registry.py test_topology.py test_topology_projection.py` — 472 passed. Round 2 changed
  only `run_browser_check.mjs` and docs, so the round-1 full-suite run (1732 passed + the worktree
  `test_viewer_js_suite` red, viewer tier 633/633 via `--repo`, witnesses 5/5) stands.

**Filed, not blocking:** `ISSUE_20261106_piston_heads_ride_has_no_exploratory_click_around_and_no_still_that_shows_the_heads`
(the click-around the handoff owes was not done). Already filed by the author: the cover's missing
mesh, the DAG-walk cost of folding (revisit `rides_with` if the walk improves), and the bodies
summary click. The slot-queue over-budget measurement is appended to
`ISSUE_20261105_the_default_test_tier_ran_18_minutes_on_a_worktree.md`.
