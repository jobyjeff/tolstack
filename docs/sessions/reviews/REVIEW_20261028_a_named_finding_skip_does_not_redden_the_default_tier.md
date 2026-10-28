---
type: review
handoff: docs/sessions/active/HANDOFF_20261028_a_named_finding_skip_does_not_redden_the_default_tier.md
reviewer: agent
date: 2026-10-28
verdict: APPROVE
blockers: 0
---

# Review — a_named_finding_skip_does_not_redden_the_default_tier

Diff: one `skip()` in `apps/viewer/tests.js` became a named PASS, plus the guard pin
592 -> 593, the issue resolved, and a lesson. The merge into the review branch was a fast-forward and nothing needed resolving.

## Verified
- `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` prints `592/592 passed`, no SKIP, and the
  `PASS  [real] 0 live parts cite both ...` line names the empty live set (deliverables 1, 3).
- A worktree with no projection is still red: `pytest -k viewer_js` in this worktree fails
  `test_viewer_js_suite_is_green` on the `node-fs tier` skip. That is the only failure in the guard/witness/viewer-js subset (60 passed). The skip guard is untouched (deliverable 2).
- The wrapper text still says "almost always a worktree". The only remaining SKIP path is the real worktree case, so that stays accurate (deliverable 4).
- `--changed-since integration`: 1/1 witnessed, exit 0. `--unenrolled` shows apps/viewer/tests.js at 593 enrollable/declared (the pin is raised, visibly, as CLAUDE.md allows) (deliverable 5).
- The issue is `status: resolved` (deliverable 6).

## Notes (non-blocking)
- The new test's assertion is `eq(mixedParts.length, 0)` inside the `!mixedParts.length` branch, so it is tautological. It cannot fail, which is why no mutation can witness it and the pin was raised. The PASS line itself, not the assertion, carries the value (visibility). Accepted: the else branch re-arms the real check when a live mixed part appears.
- Deliverable 1 was not run in the main checkout (`pytest -q` there cannot see this branch). The batch merge's main-checkout run covers it.
