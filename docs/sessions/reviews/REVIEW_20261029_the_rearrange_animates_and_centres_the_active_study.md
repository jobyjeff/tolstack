---
type: review
handoff: docs/sessions/active/HANDOFF_20261029_the_rearrange_animates_and_centres_the_active_study.md
reviewer: agent
date: 2026-10-29
verdict: REQUEST CHANGES
blockers: 3
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
