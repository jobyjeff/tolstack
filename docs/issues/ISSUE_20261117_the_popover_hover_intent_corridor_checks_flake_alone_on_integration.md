---
type: bug
priority: med
status: deferred
area: viewer/browser-tier
reporter: agent
class: wall_clock_dependence
found_by: docs/sessions/active/HANDOFF_20261116_the_window_resize_reclamp_holds_on_a_cold_run.md
defer_until: 2026-12-01
resolution: triage 2026-11-17 -- med beyond budget (3/3 staged), deferred 14 days; class wall_clock_dependence
---

# The popover suite's hover-intent corridor checks flake even when the suite runs alone, on integration as well

Found in the 2026-11-17 review of `the_window_resize_reclamp_holds_on_a_cold_run`.
`popover mechanics (the stack page's citation card)` failed one sub-check out of
22 in several runs. It flaked on the merged tree and on a `git archive
integration` export (`5c79aba0`) alike, with the box quiet (no other run of mine
beside it):

| Tree | Run | Result | Failing sub-check |
| --- | --- | --- | --- |
| merge | whole tier | 21/22 | `...and it does NOT open when the pointer arrives at the card instead` |
| merge | `--only "popover mechanics"` | 21/22 | `a trigger crossed while the pointer is heading for the open card does not steal it` |
| integration | `--only` | 22/22 | -- |
| merge | `--only` | 22/22 | -- |
| integration | `--only` | 21/22 | `...and it does NOT open when the pointer arrives at the card instead` |
| merge | `--only` | 21/22 | `...and it does NOT open when the pointer arrives at the card instead` |
| integration | `--only` | 22/22 | -- |

So it is not the handoff under review, and not load from a whole tier. Both of
those sub-checks read the page's hover-intent window (`HOVER_INTENT_MS`) against
Playwright mouse moves, and the moves are paced with `waitForTimeout`
(`approachFrom` in `testPopoverMechanics`, `scripts/run_viewer_browser_tests.mjs`).
That is the same wall-clock exposure as
`ISSUE_20260918_three_browser_tier_resizes_measure_through_the_apps_own_debounce.md`.
The two earlier issues on this suite
(`ISSUE_20261021_the_hover_intent_corridor_check_is_red_in_the_main_checkout_and_green_in_a_worktree_at_the_same_sha.md`,
`ISSUE_20261028_two_browser_suites_fail_in_the_full_run_under_load_and_pass_alone.md`)
are both `resolved`, and this is red **alone**, which the second one ruled out.

Not established: whether a product race (the corridor's timer) or only the
check's pacing is behind it. A run with the page's clock stepped would settle it.

## 2026-11-17 triage sweep

Deferred: tolstack's 3 slots went to the filmstrip (it blocks every viewer handoff), the two tree-settling flakes, and the Preview prose. This flake needs a stepped page clock, which is a different fix from the settled-tree waits. Source: dispatch/docs/sessions/lessons/LESSONS_20261117_triage_sweep.md.
