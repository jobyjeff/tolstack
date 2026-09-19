---
type: bug
priority: med
status: open
area: tests/browser-tier
reporter: agent
found_by: docs/sessions/reviews/REVIEW_20260918_visual_rules_nothing_checks.md
---

# A browser suite that SKIPs returns `ok: true` and is counted in `23/23 browser checks passed` — the same shape that put two red `[real]` tests on trunk

`scripts/run_viewer_browser_tests.mjs` dispatches its suites through a `SUITES`
registry and tallies `<n>/<n> browser checks passed` over the returned
`{label, ok}` records. **Six suite bodies return `{ label, ok: true }` on a
precondition they could not meet**, printing a `SKIP:` line and nothing else:

| line | the skip |
| --- | --- |
| 3222 | `topologies.json`/`results.json` not built under the target repo |
| 3519 | same, in the neighbouring suite |
| 5020 | `topologies.json`/`crops.json` not built |
| 5045 | no live topology row reaches a declared-region crop |
| 5466 | `topologies.json` not built (typography rules) |
| 5483 | the live nav offers no `hub_bearing_thermal_fit_m1` leaf |

The last two arrived with `visual_rules_nothing_checks` (2026-09-18) and follow
the file's existing convention exactly, which is why this is filed against the
runner rather than against that handoff.

## Why it matters here specifically

This repo has already paid for this shape once, **this week**. On 2026-09-18 a
batch merge was tested in a candidate worktree with no `data/`; the viewer's JS
runner reported its `[real]` tier skipped, exited 0, and the merge went to trunk
reading `1203 passed, 1 skipped` with two `[real]` assertions red the whole time
(`ISSUE_20260918_real_tier_red_on_trunk_after_the_batch_merge_and_projection_rebuild`).
The fix — `tests/test_viewer_js_suite.py`, `real_tier_red_and_the_skipping_tier`
— turned a skipped tier into a **failure**, and its own docstring states the
principle in bold: *"A TIER THAT CANNOT RUN IS NOT A TIER THAT PASSED."*

The browser runner was not covered by that fix. Today, a run in which four of
the six skippable suites skip still prints `23/23 browser checks passed`, and
the reviewer or operator reading the last line of `| tail` sees a full green.
`data/projections/` is gitignored and main-checkout-only, so "ran without
`--repo`, or against a tree whose projections are unbuilt" is not a hypothetical
configuration — it is the default in every worktree.

The 5483 skip is the sharper one: it is not about a missing projection but about
the *live data* having moved. If `hub_bearing_thermal_fit_m1` ever stops being a
nav leaf, nine sub-checks that took real measurements stop running and nothing
anywhere goes red.

## What to do

Not "delete the skips" — the skip is correct information. Make the runner say
it in the total, e.g.:

- have skipping bodies return `{ label, skipped: <reason> }` rather than
  `ok: true`, and print `20 passed, 3 SKIPPED of 23 — NOT A FULL RUN` instead of
  `23/23`, in the shape `--only`'s own banner already uses
  (`THIS IS NOT A FULL RUN`); and
- make the process exit non-zero on a skip unless an explicit flag says a
  partial run was intended — the same call
  `tests/debug_typography_pass.mjs` now makes for its own thirteen surfaces
  (`process.exitCode = 1` when any surface is skipped), which is a worked
  precedent inside this repo.

Whatever the spelling, the invariant is that the last printed line cannot say
"passed" about a check that never ran.
