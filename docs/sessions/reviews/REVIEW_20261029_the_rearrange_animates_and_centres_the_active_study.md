---
type: review
handoff: docs/sessions/active/HANDOFF_20261029_the_rearrange_animates_and_centres_the_active_study.md
reviewer: agent
date: 2026-10-29
verdict: APPROVE (round 2)
blockers: 0
---

# Review — the_rearrange_animates_and_centres_the_active_study

Merged `handoff/...` into the review branch cleanly (no conflicts).
`node apps/viewer/run_tests.cjs`: 507/507 (node-fs tier skipped: no projections
in a worktree). Browser tier and full pytest were NOT re-run here (no
`node_modules` in this worktree); the lesson's own record is relied on for those.

The landing itself (centre on settle, `landingPending`, bandPad, reduced motion
path) reads sound and the 10-28 sideways-scroll contract is preserved.

## Blockers

1. **"No element removed and re-added" has no assertion.** Deliverable 2 asked
   for a check counting mutations. The browser test only `console.log`s the
   churn (29/29 ids churned) and asserts nothing. The agent filed an issue
   recommending the requirement be dropped; that is a strategy decision, not
   the tactical agent's. Either make the renderer patch in place, or have
   strategy amend the handoff — then the check must assert whatever the
   amended requirement is, not log it.
2. **Definition of done: no three-frame sequence / recording** for the
   kinematic -> `pitch_link_cotter_hole_clearance` -> kinematic switch. The
   lesson says so plainly. A headless session can still screenshot three frames.
3. **A declared guard was left unwitnessed.** Retiring the
   `at compact density, Fit frames the whole band` witness leaves the
   Fit-button check without a mutation spec, which `CLAUDE.md` says a guard
   must have ("enrolled in the same change"). The lesson states this as a
   consequence rather than fixing it; the census pin (735/702) was rewritten to
   match. Re-witness the Fit-button guard with a mutation that reddens it.

## Should-fix / notes

- Handoff said ease-out; the existing ease-in-out cubic was kept (pinned by
  fast-tier tests). Acknowledged in the lesson; fine if strategy agrees.
- The 4 px centring check measures against the window (topbar..innerHeight)
  and the hscroll box, not literally "the DAG box" — reasonable, but say so.

## Inline fixes

None.

## Re-run 2026-10-29 (round 2) — APPROVE

All three blockers resolved in `62bcc6d3`:
1. Requirement amended (Jeff chose option b, recorded in the issue addendum) to
   "nothing blinks"; the browser tier now asserts every animation frame has dots
   and bars on screen, with a mutation spec. Per-frame rebuild stays open in the
   issue for strategy.
2. Four screenshots (kinematic, mid-transition, landed, back) under
   `docs/sessions/lessons/shots/the_rearrange_animates_and_centres_the_active_study/`.
3. Fit-button witness re-declared against the non-centring branch.

Verified: `--changed-since integration` witnesses (junctioned `node_modules`,
`--repo` main): 18/19 witnessed, 19/19 reached, including the new blink guard,
the Fit-button guard, the landing and reduced-motion guards. The one
NOT WITNESSED, `fast__the-render-puts-the-header-above-the-first-grid-row-push`,
is "tier red before mutation" because the main checkout's projection is not
paired with this tree ("[real] tier is stale") — environmental, and the diff
does not touch the header; left to the sweep. `tests/test_mutation_witnesses.py`
+ `tests/test_claims_registry.py`: 84 passed. Fast viewer tier 507/507.
Not re-run here: full pytest and plain browser tier (author's record, round 1).
