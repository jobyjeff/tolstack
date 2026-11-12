---
type: review
handoff: docs/sessions/active/HANDOFF_20261111_the_topology_real_loop_runs_on_one_origin.md
reviewer: agent
date: 2026-11-11
verdict: APPROVE
blockers: 0
---

# Review -- the_topology_real_loop_runs_on_one_origin

Diff: one runner file (`scripts/run_viewer_browser_tests.mjs`, +11/-2), a lesson, an addendum to a deferred issue. No `apps/`, no projection input, as scoped.

## Findings
- **Deliverable 1 -- correct.** The per-study loop is skipped when `url.startsWith("file:")`; `topology http` keeps it. No assertion deleted: the three per-study checks moved to http only and are listed by name in the lesson. Pre-loop checks still run on both origins. The six `topology http` witness specs anchor on nav/preview CSS and JS, not the loop, so no re-aim; accepted.
- **Measured at review (merged tree, `--only`):** `topology file://` 168 checks / 168.4 s (was 394 s; 212 -> 168 checks); `topology http` 214/214 PASS, 216.9 s. The `file://` suite is ~18 s over the handoff's <150 s target (the lesson reports 159 s; the remainder is the per-topology checks, not the loop). Accepted as a miss of an estimate, not a defect; the tier saving is ~225 s.
- **Deliverable 2 -- fix is sound, root cause open.** `.kmverdict` is `display: contents`, and a bare `A, B` alternation waits on the DOM-first match. `:visible` on both arms is the right wait. The lesson honestly says it could not establish why `plus72` was hidden; that is filed as `ISSUE_20261111_why_the_plus72_kmverdict_was_hidden_at_baseline_is_unestablished.md`. Kinematic suite 27/27 PASS at review.
- **"Green three times" not met by the author** (PASS/FAIL/PASS): the one failure was the already-deferred reload-survival flake, addendum appended to its issue. Not caused by this change (unchanged code). Accepted.
- Not run by me: whole browser tier / witness gate (post-merge, once, per CLAUDE.md); default pytest was run by the author (only the documented worktree red).

## Verdict
APPROVE. Merged `handoff/the_topology_real_loop_runs_on_one_origin` into `review/the_topology_real_loop_runs_on_one_origin`, landing on `integration` by fast-forward.
