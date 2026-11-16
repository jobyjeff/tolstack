---
priority: med
depends_on: []
model: sonnet
hitl: false
---

# HANDOFF 2026-11-16 — the_annotate_check_runs_every_pass: one pass's throw is a FAIL line, not the end of the run

Source: `docs/issues/ISSUE_20261115_the_annotate_browser_checks_correction_pass_throws_and_the_passes_after_it_never_run.md`
(med), staged by the 2026-11-16 triage sweep. Baseline: tolstack master
`d8085ece`. Scope: `apps/annotate/run_browser_check.mjs` and its mock; do NOT
touch the five known annotate reds' own fixes (their issues are named below and
stay theirs) or any other browser suite.

## Deliverables

1. **No pass aborts the rest.** `node apps/annotate/run_browser_check.mjs`
   (mock, no flags) stops in `correctionPass` (`run_browser_check.mjs:949`):
   it clicks `.an__bound-flip`, waits 5 s for `.an__bound-history`, and the
   wait throws. The throw ends `checkEverything`, so `proposalPass` (accept),
   `proposalPass` (reject), `reducedMotionTimingPass` and, with `--real`,
   `realPass` **never run** — and the exit 1 looks the same as the five known
   reds, so a reader sees "the known five" and misses that half the tier did
   not execute. Wrap each pass so a throw becomes one `FAIL <pass name>: <message>`
   line and the run continues; the summary counts it as a failure.
2. **Bring `correctionPass` up to what Flip does now.** Likely cause (the
   issue's, unverified): since `a_feature_is_bound_once_to_a_set_of_faces`,
   "Flip acts only on a standing binding" and every bind-mode write is
   feature-keyed, so the mock's Flip either no longer writes a superseding
   event or no longer shows it as history. Find which, and fix the **check**
   (or the mock fixture) to assert the current behaviour. If it is the page that
   is wrong, not the check, stop and file an issue instead of changing app code.
3. Once every pass runs, report the full PASS/FAIL list. Reds that are the
   known five (`ISSUE_20261113_the_annotate_browser_checks_display_panel_list_predates_the_bound_faces_setting`,
   `ISSUE_20261028_annotate_browser_check_mock_anchor_checks_are_red_on_integration`,
   `ISSUE_20261108_the_annotate_real_browser_check_still_expects_v1_as_the_default_model`)
   stay theirs; any **new** red that the previously-unrun passes reveal is
   filed as its own issue.

## Definition of done

- Mock run output quoted: every pass named in the output, `correctionPass`
  green, no uncaught throw; `--real` run likewise (or why it could not run).
- tolstack default tier green (`venv-win/Scripts/python.exe -m pytest -q`).
- Lesson (`docs/sessions/lessons/LESSONS_20261116_the_annotate_check_runs_every_pass.md`):
  what Flip does now, and the new reds (if any) the unrun passes were hiding.
