---
type: review
handoff: docs/sessions/active/HANDOFF_20261105_the_piston_heads_and_cover_ride_with_their_bodies_in_the_kinematic_model.md
reviewer: agent
date: 2026-11-06
verdict: REQUEST CHANGES
blockers: 2
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
