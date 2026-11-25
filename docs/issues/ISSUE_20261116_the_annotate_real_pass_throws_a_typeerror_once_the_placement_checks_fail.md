---
type: bug
priority: low
status: triaged
class: stale_check_expectation
resolution: triage 2026-11-16 (2nd sweep) -- low, deferred onto the same wake date as its likely root, ISSUE_20261108_the_annotate_real_browser_check_still_expects_v1_as_the_default_model | woke 2026-11-25 -- date trigger passed; re-triage
area: annotate/browser-check
reporter: agent
found_by: docs/sessions/HANDOFF_20261116_the_annotate_check_runs_every_pass.md
handoff: docs/sessions/HANDOFF_20261125_the_real_browser_checks_hold_their_premise_by_construction.md
---

# The annotate check's `--real` pass throws after its two known placement reds

With every pass now running (`runPass`), `node apps/annotate/run_browser_check.mjs
--real vpa-pitch-p2-20261105-204957` prints, after the two placement FAILs already
filed in `ISSUE_20261108_the_annotate_real_browser_check_still_expects_v1_as_the_default_model.md`
("every opened part is drawn at every occurrence", "the tangential link is drawn
three times"):

    FAIL  realPass: page.evaluate: TypeError: Cannot read properties of undefined (reading '0')

Until now the throw was never reached (the run died earlier in `correctionPass`).
It is the unconditional reading of something indexed `[0]` in a `page.evaluate`
inside `realPass` that is undefined on this run -- probably the same v1-vs-v2
model mismatch as the 20261108 issue (the p2 run's topology is not the one the
pass expects), but unconfirmed: `runPass` keeps only the first message line, so
the stack is not printed. Start by logging `err.stack` for `realPass`.
