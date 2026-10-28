---
type: review
handoff: docs/sessions/active/HANDOFF_20261027_a_witness_run_stops_at_its_budget_and_leaves_the_rest_to_the_sweep.md
reviewer: agent
date: 2026-10-27
verdict: APPROVE
blockers: 0
---

# Review — a_witness_run_stops_at_its_budget_and_leaves_the_rest_to_the_sweep

Two commits on `handoff/...`, merged clean into the review branch (no conflicts, no markers).

| Check | Result |
|---|---|
| Budget (`--budget-min`, default 30; `--full` / 0 = no cap) | Present; invalid value refused (exit 2). Pure logic in `scripts/witness_budget.mjs`, row added to ARCHITECTURE inventory. |
| Order fast -> python -> browser-by-suite; cap = elapsed + tier running mean | Matches handoff; pinned by fake-clock tests. |
| Summary grammar / exit codes | Capped: four numbers; `--full` keeps `N/M declared mutations witnessed`. Exit 1 only on a miss among reached. Both pinned. |
| Per-entry times + top-15 | Present. |
| Docs (REVIEW_AGENT witness bullet, CLAUDE.md, viewer README) | Present, one sentence each; issue set `resolved`. |
| Lesson (replay numbers, lever-two feasibility, sweep row) | Replay: 37/37 witnessed, 37/43 reached in 28m51s, 6 left; feasibility 29 browser entries -> 7 suites; no sweep row yet (stated). |
| Tests | `tests/test_mutation_witnesses.py` + `test_mutation_witness_shadow_concurrency.py`: 48 passed post-merge. |
| Witness row (this review) | 0/0 reached/selected (0 of 438 entries reachable by the diff; no guard touched), 0/0 witnessed, 0 left to the sweep. |

No guard added or changed, no `scripts/mutation_witnesses/*` or dispatch files touched. Scope respected.

Not run here: full `pytest -q` and the main-checkout browser tiers; the author's lesson records the worktree's known red set (viewer JS suite, projection-dependent tests), none caused by this change, and the diff touches no viewer code.

Nothing fixed inline. Observation (not a blocker): the replay ran against an integration tip of `449d8609` instead of the handoff's `e668b666` base; it reproduced the 43 (29 browser, 14 fast) selection exactly, so the replay stands.
