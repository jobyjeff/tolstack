---
type: review
handoff: docs/sessions/active/HANDOFF_20261115_the_scene_suite_opens_its_own_pane.md
reviewer: agent
date: 2026-11-15
verdict: APPROVE
blockers: 0
---

# Review — the_scene_suite_opens_its_own_pane

Diff: `scripts/run_viewer_browser_tests.mjs` (+20/-5: one `openPaneByHandle` helper, three call sites),
a lesson, and the issue set `resolved`. Test-tooling change only; no `apps/` file touched.

## Findings
- The helper is idempotent (clicks only while `#annotate-flyout[open]` is absent), uses `noWaitAfter`
  and then waits for the open dialog and the iframe; it throws, so a pane that never opens is one named
  failure. The three swallowed-click sites that had nothing asserting them are converted.
- Two remaining swallowed clicks (~7902, ~11797) are each followed immediately by a `push` that reads
  `flyout.open`, so a failure is named there. Acceptable, as the lesson says.
- **Honest caveat, accepted:** the original red (and the issue's storage hypothesis) did not reproduce, here
  or for the author. The fix targets a swallowed 5 s click timeout the whole tier did produce. The issue's
  `resolution:` says the cause stays unconfirmed. Not a blocker: the change makes the failure mode loud
  rather than silent, which is the handoff's stated deliverable.

## Verification (merged tree, review worktree, `--repo C:/workspace/tolstack`)
Subset (rows: test tooling `scripts/*.mjs`, guard/witness): 
- `pytest -q tests/test_projection_freshness.py tests/test_mutation_witnesses.py`: 61 passed.
- `--only "annotate model in the scene ..."`: 22/22.
- Witness `--changed-since integration`: 1 of 966 reached, WITNESSED (2 more left to the sweep as too far from hunks).
- Whole browser tier: **43/44**, 1755 s. The one failure, `the model drawn alone and led` (21/23, two hover-lighting
  checks), is **pre-existing**: same 21/23 with integration's unchanged runner. Filed as
  `ISSUE_20261115_the_model_drawn_alone_and_led_two_hover_lighting_checks_red_on_integration.md`.
- Not run: whole default pytest in the worktree (author recorded 1 failed = documented worktree-only
  `test_viewer_js_suite`, 1986 passed); `suite-time record` (the browser runner self-records).
