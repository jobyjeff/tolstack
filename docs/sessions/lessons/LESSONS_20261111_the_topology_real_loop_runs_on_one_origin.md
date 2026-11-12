# Lessons -- the_topology_real_loop_runs_on_one_origin (2026-11-11)

## What changed
`scripts/run_viewer_browser_tests.mjs` only. In `testTheTopologyPage` the `[real]` per-study loop
now runs when the origin is not `file:` (http only). The kinematic page's `div.kmverdict, .banner__notice`
wait is now `div.kmverdict:visible, .banner__notice:visible`.

## Checks that moved from "both origins" to "http only" (printed names, per study id)
- `[real] <study id> shows its refusal` (refusing studies)
- `[real] <study id>'s totals are the projection's numbers`
- `[real] <study id> numbers every contribution`
Nothing deleted. The per-topology checks before the loop (row counts, plan, correspondence, joint, worksheet) still run on both.

## Seconds (runner's timing table, `--only`)
- topology file://: 394 s -> 159 s (212 -> 168 checks; target was <150 s, missed by 9 s -- the rest is the per-topology checks, not the loop)
- topology http: 378 s (214 checks, unchanged)
Saves ~235 s of the tier.

## Witness specs
Six specs name `topology http`; their anchors are nav width / nav divider / preview pane CSS and JS, none in the loop. No re-aim, none re-run.

## Why plus72's verdict is hidden -- NOT established
Not reproduced: the suite passed 2 of 3 runs unchanged-wait-then-fixed. `.kmverdict` is `display: contents`
(Playwright calls it visible only if a child is), and it is the DOM-first match that the alternation waits on.
The fix is justified by that mechanism (wait on a visible match) but I could not observe which state hid the
`plus72` verdict. Treat the root cause as open.

## Kinematic x3
Runs: PASS, FAIL, PASS (after the fix). The one failure was two other checks, not the verdict wait:
`[real] picking a graph width in View ... survives a reload` and `[real] colouring by body ... survives a reload`.
That is the family of the deferred `ISSUE_20261109_the_kinematic_page_view_settings_survive_a_reload_check_is_intermittent.md`
(addendum appended). So "green three times in a row" was NOT met.

## Full-suite record
Worktree, `venv-win` of the main checkout: `python.exe -m pytest -q` = 1 failed, 1927 passed, 1 skipped,
2 deselected, 452 s. The one failure is `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`
(worktree has no projections -- the documented deliberate red). `node apps/viewer/run_tests.cjs` 559/559 with
1 tier skipped (same reason); `node apps/annotate/run_tests.cjs` 307/307. Not run: whole browser tier and witness gate (review's).
