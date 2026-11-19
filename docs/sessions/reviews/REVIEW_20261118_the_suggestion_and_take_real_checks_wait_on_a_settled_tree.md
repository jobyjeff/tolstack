---
type: review
handoff: docs/sessions/active/HANDOFF_20261117_the_suggestion_and_take_real_checks_wait_on_a_settled_tree.md
reviewer: agent
date: 2026-11-18
verdict: APPROVE
blockers: 0
---

# Review — the_suggestion_and_take_real_checks_wait_on_a_settled_tree

**Verdict: APPROVE.** Not previously merged (containment check negative); merged into `review/<slug>` cleanly.

## What I checked
- The diff is the browser runner only (plus issues/lesson). `testSuggestionNamesItsFace`: `openPage(query, settled)` waits out the sweep; `expand()` re-reads `aria-expanded` and never swallows a failed click; the hover retries until the pane washes; waits are 30/60 s, not 180. `testAnnotateRailHoldsStill`: the fixed 300 ms/1000 ms reads became waits on the Take button, the written event, partner row selected with layer drawn and on screen, partner end selected in the pane, and the body reading bound.
- `need()` prints `MISSING: <what>` and returns false (checks go red) instead of throwing. The lesson records why: a throw aborted the suite before checks were pushed and the witness runner reported a guard "never reached". Both suites now return `reportAbortedSuite` on a thrown error rather than falling through.
- Deliverable 1 is half met: the suggestion suite's red orders were reproduced (4 of 5 baseline runs, attributed from a pane dump, partly inferred). The Take-check red order was NOT reproduced (17/17 at baseline, also under 4x/8x CPU throttle), so that cause is inferred. The lesson and the issue `resolution:` say so plainly. Accepted: the new waits fail fast and name the step if it recurs.
- Both source issues are `resolved` with a `resolution:`. No page race claimed.

## Verification (review worktree, merged, `--repo C:/workspace/tolstack`)
- `--only "a suggestion names its face"`: green, 96.5 s, 0 MISSING.
- `--only "annotate rail holds still"`: green 17/17, 105 s, 0 MISSING.
- `node apps/viewer/run_tests.cjs`: 502/502 (node-fs tier skipped, no worktree projection). `node apps/annotate/run_tests.cjs`: 324/324.
- Witness `--changed-since integration --budget-min 10`: 3/3 reached witnessed; 3 left to the sweep (budget), all in "annotate rail holds still". The tactical lesson reports witness 6/6 including the one that exposed the throw defect; cited, not re-run.
- Whole browser tier: 43/45, 1617 s (budget 1800), self-recorded on the ledger. Both reds are the pre-existing data reds the tactical found identically on the unmodified baseline script: `annotate rail suggestion` and the map suite's pin-hover check. Neither is in the suites this handoff changed; both suites it changed passed in the tier.

## Not run here
- `pytest -q`: the diff touches no Python or doc-scanned file beyond issues/lessons; the tactical records the default tier (448 s).

## Findings
None blocking. One inline fix: `ISSUE_20261108_the_rail_suggestion_real_check_finds_15_...` was `status: resolved` while its own addendum says it is red again on trunk, deterministically; reopened (`status: open`). The map pin-hover red is already filed (`ISSUE_20261118_the_map_pin_hover_real_check_is_red_on_integration.md`). Note for the batch merge: it cannot land a 45/45 whole tier until those two are fixed.
