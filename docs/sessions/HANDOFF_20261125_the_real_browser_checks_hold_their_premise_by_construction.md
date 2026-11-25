---
priority: med
depends_on: [the_pane_opening_browser_suites_are_green_every_run]   # both edit scripts/run_viewer_browser_tests.mjs and the same scene suite
model: sonnet
hitl: false
---

# HANDOFF 2026-11-25 — the_real_browser_checks_hold_their_premise_by_construction: a `[real]` check's premise is set up by the check, not won from a race or from the state of Jeff's log

Source: triage sweep 2026-11-25. Four open issues, one shape: a `[real]` check
whose premise ("no binding in the inbox", "the step face is unbound", "the page
opens v1") holds only if a race goes its way or Jeff has not yet done the thing
the feature invites:

- `docs/issues/ISSUE_20261124_the_right_click_menus_browser_suite_skips_once_jeff_binds_the_step_face_the_menu_offers.md` (med)
- `docs/issues/ISSUE_20261109_the_annotate_model_suites_fake_bindings_reader_loses_a_race_to_the_real_bindings_projection.md` (med)
- `docs/issues/ISSUE_20261108_the_annotate_real_browser_check_still_expects_v1_as_the_default_model.md` (med)
- `docs/issues/ISSUE_20261116_the_annotate_real_pass_throws_a_typeerror_once_the_placement_checks_fail.md` (low)

Baseline: trunk plus `the_pane_opening_browser_suites_are_green_every_run`.
Scope: `scripts/run_viewer_browser_tests.mjs` (`testContextMenus`,
`installRealAnnotatorReads` and its callers), `apps/annotate/run_browser_check.mjs`,
their witness specs under `scripts/mutation_witnesses/`. Do NOT touch app code
under `apps/` except to expose a read hook a test needs; do NOT touch the
feature form or menu write paths (handoff
`a_write_from_the_form_or_the_menu_never_vanishes_without_a_word`).

## Deliverables

1. **The right-click menus suite never skips on Jeff's log.**
   `testContextMenus` runs only while the served `feature-identity/log.json`
   shows the tan link mount's pilot bore bound and
   `piston_head_upper_214698_002@piston_head_upper_step_face` with no `bound`
   event (`stepBound = events.some(verdict === "bound" …)`, around line 11115).
   Otherwise it pushes one literal-true `(skipped: …)` check and its ten witness
   specs go vacuous. Jeff's first use of the menu's "Bind the suggested faces"
   on that row flips it; a retracted bind keeps it skipped forever (the
   condition reads raw history, not the fold); a retracted pilot binding turns
   it red. Fix: serve the suite a filtered copy of the log (step face unbound,
   pilot bound) through the read override `installRealAnnotatorReads` already
   provides — or read the folded state and pick its subject from whatever is
   currently unbound with one proposal set (`VA.featureAcceptable`). Either
   way the suite always has a subject and never skips. This is the third
   sighting of the review overlay's "A `[real]` suite gated on live log state
   that the feature itself invites Jeff to change" (`docs/prompts/REVIEW_AGENT.md`);
   grep the runner for any other suite gated on live log state the same way and
   fix it in the same change, naming each in the lesson.
2. **The fake bindings reader cannot lose its race.**
   `installRealAnnotatorReads(page, { …, binding: "window" })` swaps the pane's
   `readFeatureIdentityProjection` from a 1 ms `setInterval`; if the pane reads
   first it gets the real `data/projections/feature-identity/bindings.json`,
   which since 2026-11-08 carries Jeff's accepted bindings (a 17/22 run logged
   `anchors by source: bound 4`, then 22/22 alone). Install the stub before any
   pane code runs: `addInitScript`, or a route that serves the stubbed
   projection. The premise "no binding in the inbox" then holds by
   construction.
3. **`node apps/annotate/run_browser_check.mjs --real vpa-pitch-p2-20261105-204957`
   is green.** Its `[real]` pass assumes v1 opens by default (since 2026-11-08
   the default model is v2, `vpa_end_stop_v2`): "opening P2 selects the
   topology the run names", "the rail lists every edge" (expects
   `{"studied":false,"rows":99}`), "every opened part is drawn at every
   occurrence … `placement_world`", "the tangential link is drawn three times".
   Open v1 explicitly in that pass, or re-target each expectation at v2 —
   choose and say why. The rider assertion ("both piston heads ride the pitch
   plate…") follows v2, which declares no riders. Then `realPass` throws
   `TypeError: Cannot read properties of undefined (reading '0')` in a
   `page.evaluate`: `runPass` keeps only the message's first line — log
   `err.stack`, find the unconditional `[0]`, and make it fail by name. No gate
   runs this check today (`scripts/run_viewer_browser_tests.mjs` says so);
   leave that as it is, but say in the lesson whether it should join a tier.

## Definition of done

- `testContextMenus` runs all its checks against a log in which the step face
  IS bound (copy Jeff's log, add a bound event, serve it) — no skip line.
- The annotate-model-in-the-scene suite passes five consecutive `--only` runs
  while a pytest subset runs alongside it.
- `run_browser_check.mjs --real vpa-pitch-p2-20261105-204957` passes every pass
  on the main checkout's projections.
- Witness specs for the menus suite redden their checks again (run `scripts/run_mutation_witness_tests.mjs`
  runner `--changed-since master`).
- Covered issues set `status: resolved` with the fixing commit.
- Lesson (`docs/sessions/lessons/LESSONS_20261125_the_real_browser_checks_hold_their_premise_by_construction.md`):
  every suite found gated on live log state, and the v1-or-v2 choice for the
  annotate `--real` pass with its reason.
