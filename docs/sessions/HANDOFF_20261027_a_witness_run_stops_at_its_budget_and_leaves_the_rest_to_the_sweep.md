---
priority: high
depends_on: []
model: sonnet
hitl: false
---

# HANDOFF 2026-10-27 — a_witness_run_stops_at_its_budget_and_leaves_the_rest_to_the_sweep: the merge-gate witness run has a 30-minute wall-clock cap, prints per-entry times, and hands what it did not reach to the nightly sweep

Source: Jeff, 2026-10-27 strategy session
(`dispatch/docs/strategy/HANDOFF_20261027_strategy.md`): "put a hard cap at
30 min and have the reviewer make a judgement — when multiple handoffs are
chained, a single run with an excessively long test holds up the entire
train." Trigger:
`docs/issues/ISSUE_20261027_a_changed_since_witness_gate_on_a_viewer_handoff_runs_35_minutes.md`
— the first review to run the hunk-level `--changed-since integration`
selection (`leaders_follow_the_active_study_across_the_seam`, 2026-10-27)
selected **43 entries (29 browser, 14 fast)** and took **35m03s**
(15:01:53–15:36:56), 43/43 witnessed, `OVER BUDGET by 5m03s` against the
30-minute merge tier (`dispatch/dispatch/config.py:640`,
`DEFAULT_MERGE_TIER_BUDGET_MIN`). Browser entries cost ~70 s each on average
— every one re-runs a whole browser suite under the one machine slot — and
the runner prints no per-entry wall time, so nobody can say which ones.
Baseline: `integration` at `e668b666` (the merge-gate handoff
`the_full_registry_leaves_the_merge_gate` and the 10-26 hunk-level selection
fix `0f411c11` are in). Scope: `scripts/run_mutation_witness_tests.mjs`,
its tests (`tests/test_mutation_witnesses.py` and whatever pins the runner's
output grammar), `docs/prompts/REVIEW_AGENT.md` (the witness bullet only),
`CLAUDE.md` and `apps/viewer/README.md` ("The mutation-witness tier"
section), the issue above. Do NOT touch `scripts/mutation_witnesses/*.json`,
`scripts/guard_enumeration.mjs`, `docs/prompts/WITNESS_SWEEP.md`'s contract
(the sweep stays `--full`, 180 min, and is where unreached entries go), or
dispatch files (the sweep job `tolstack-witness-sweep` is registered in the
central registry already; the 02:00 task is Jeff's to schedule).

## The decision

The gate's job is to catch a witness **this merge** decayed; a decayed
witness is a test-quality defect with no product exposure (2026-10-26
decision), so one that the gate did not reach is the sweep's on a day's
latency — not a reason to hold the train. A capped run is therefore a
**complete** run of what it reached, never a failure.

## Deliverables

1. **A wall-clock budget.** `--budget-min <n>`, default **30** for any
   selection mode except `--full` (the sweep, which keeps running to the
   end — its budget is dispatch's `sweep` tier). The runner stops
   *launching* entries once the elapsed time plus that tier's running mean
   per-entry time would cross the budget; the entry in flight finishes. Fast
   and python entries (seconds each) run **first**, browser entries after,
   grouped by suite, so what is left unreached is always the expensive
   tail. Every unreached entry prints one line
   `left to the sweep (budget): <id> [<tier>, <suite>]` — the same `note:`
   register the hunk-level selection already uses for what it leaves out.
2. **The summary says all four numbers.** The final line becomes
   `<witnessed>/<reached> witnessed, <reached>/<selected> reached in
   <wall>; <left> left to the sweep`. Exit **0** when every reached entry is
   witnessed, whatever was left; exit 1 only on a real miss among the
   reached. `--full` keeps today's grammar (`N/M declared mutations
   witnessed`), because `WITNESS_SWEEP.md` and the JSONL row parse it.
3. **Per-entry wall time.** Each entry prints its seconds on its own result
   line, and the run ends with a top-15 by time (the issue's first lever).
   The running mean in (1) is computed from these.
4. **The reviewer records it.** `REVIEW_AGENT.md`'s witness bullet: the
   review table's witness row carries `reached/selected`, `witnessed/reached`,
   the wall time and the left-to-sweep count; a capped run with every
   reached entry witnessed is a pass; the reviewer never re-runs to reach
   the remainder and never waits for the sweep. `CLAUDE.md` and the README
   section say the same in one sentence each, next to the 2026-10-26
   "a review never runs `--full`" rule.
5. **The issue is resolved** by this handoff (`status: resolved`, pointing
   here), and its two other levers are recorded as follow-ups in the
   lesson, not built: sharing one browser-suite run across same-suite
   entries whose mutations touch disjoint lines (report feasibility — how
   many of the 29 browser entries on the 10-27 review would have shared a
   run), and a cap on specs per suite per handoff.

## Definition of done

- Replay the 10-27 selection: from a worktree of `integration` at
  `e668b666` (or `git archive` of it under `data/scratch/`), run
  `node scripts/run_mutation_witness_tests.mjs --repo <that root> --changed-since <the handoff's base> --budget-min 30`
  — it stops inside 30 min, prints the per-entry times, lists the unreached
  browser entries as `left to the sweep (budget)`, and exits 0. Record the
  four numbers and the top-15 in the lesson. `--budget-min 0` must behave as
  "no cap" (the sweep's shape) and is what `--full` implies.
- Runner tests pin the ordering (fast → python → browser-by-suite), the
  cap decision (a fake entry clock), both exit codes, and the two summary
  grammars; `pytest -q tests/test_mutation_witnesses.py` green; default
  tier green.
- Lesson (`docs/sessions/lessons/LESSONS_20261027_a_witness_run_stops_at_its_budget_and_leaves_the_rest_to_the_sweep.md`):
  the replay's numbers, how many entries the cap left on that selection,
  the feasibility note for lever two, and the first `--full` sweep row's
  wall time if `C:\workspace\tolstack\data\witness_sweeps.jsonl` has one by
  then.
