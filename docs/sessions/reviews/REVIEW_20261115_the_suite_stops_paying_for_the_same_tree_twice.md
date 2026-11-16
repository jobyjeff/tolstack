---
type: review
handoff: docs/sessions/active/HANDOFF_20261115_the_suite_stops_paying_for_the_same_tree_twice.md
reviewer: agent
date: 2026-11-15
verdict: APPROVE
blockers: 0
---

# Review: the_suite_stops_paying_for_the_same_tree_twice

Branch `handoff/the_suite_stops_paying_for_the_same_tree_twice` (one commit, `9d9bb23f`) merged into `review/…` (`3d18efdc`); `integration` had not moved.

## What I verified

- **Scope.** Diff touches only scripts (runners, `witness_budget.mjs`), the shadow-concurrency test, `tests/test_mutation_witnesses.py`, prompts, `CLAUDE.md`, a lesson and one issue. No `apps/`, `tolerance_stack/`, suite checks or witness registry entries.
- **Pre-merge subset / fast tiers:** `tests/test_mutation_witnesses.py` 49 passed (95 s); `apps/viewer/run_tests.cjs` 578/578 (the one tier skip is the by-design no-projection worktree skip); `apps/annotate/run_tests.cjs` 316/316.
- **Default tier, merged tree, worktree:** 503 s (under the 600 s budget), 1991 passed, 1 skipped, 4 deselected, 1 failed — `test_viewer_js_suite_is_green`, red by design in a worktree. Recorded in the ledger by hand.
- **Witness gate, `--changed-since integration --budget-min 10`:** 1 of 968 entries reached, 1/1 witnessed in 1m30s, 0 left to the sweep. This also exercises the 10-minute flag.
- **Whole browser tier:** 1581 s, 43/44 suites; ledger row `ts 2026-11-16T06:39:40Z`, tier `merge`, **carries `sha 3d18efdc…` and `tree 8b2419e7…`, handoff and role `review`** (the first whole-tier row with them, as the lesson predicted). The single red, `the model drawn alone and led`, 21/23 with two `[real]` hover checks, is **pre-existing**: the previous handoff's lesson records the same 21/23 on unchanged HEAD, and `ISSUE_20261109_…` and `ISSUE_20261115_the_model_drawn_alone_and_led_two_hover_lighting_checks_red_on_integration.md` are filed. This handoff changes no app code and does not touch that suite.
- **Item 4 logic:** repeated `--only`, comma fallback only when the whole value matches nothing (guard names contain commas), single-substring form unchanged, an unmatched name stops the run before it starts, and `TOLSTACK_NO_LEDGER` keeps per-mutation browser runs from writing rows. Unit tests cover grouping, the single form and the budget resolver.
- **Item 6** not built and filed with options, which is what the handoff allowed. The three prose sites (`CLAUDE.md`, `TACTICAL_AGENT.md`, `REVIEW_AGENT.md`) say the same thing; no new tier, gate or refusal beyond extending the existing no-match refusal to the list form.

## Notes (non-blocking)

- The default-tier "before" number is derived (539 s from isolated timings), not a second run; it is stated as such in the lesson.
- Whole witness runs still write no ledger row (the lesson says so); the gate's time is recorded by hand as before.
- Not exercised here: the `[real]` viewer JS tier, which needs a projection a worktree lacks (the browser tier ran against the main checkout's projections via `--repo`).
