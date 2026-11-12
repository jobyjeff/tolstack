---
priority: high
depends_on: []
model: sonnet
hitl: false
---

# HANDOFF 2026-11-10 — the_browser_tier_says_where_its_half_hour_goes: per-suite timing in the browser runner, the waste it shows taken out, and the repo's wording about who runs which tier made to agree with dispatch's

Source: Jeff's forge note `20261110T113000_ftbibd` (2026-11-10): "tolstack
test suites: These are taking over an hour (maybe two) per tactical session.
We've capped the witness mutation tier at 30min, but there's still the full
suite and the browser suite (the latter is probably the culprit). Worth
checking whether this can be pared back." Measured the same day by the
strategy session (below). Baseline: `master`. Scope:
`scripts/run_viewer_browser_tests.mjs`, `scripts/browser_runner.mjs`,
`CLAUDE.md` (the test section only), `docs/prompts/` (a new
`TACTICAL_AGENT.md` addition), `docs/prompts/REVIEW_AGENT.md` where it names
tiers. Do NOT touch `apps/` (a chain of viewer handoffs owns it), the witness
runner's selection logic or its 30-minute cap, any suite's assertions, or
dispatch's files.

## What was measured (`C:\workspace\dispatch\data\suite_times.jsonl`, tolstack rows since 2026-10-27, n = 242; and the 11-09/11-10 lessons)

| Tier | Command | n | median | p90 | max |
|---|---|---:|---:|---:|---:|
| default pytest (1,929 tests) | `venv-win/Scripts/python.exe -m pytest -q` | 144 | 416 s | 968 s | 4,210 s |
| browser (44 suites, 865 guards) | `node scripts/run_viewer_browser_tests.mjs` | 50 | 1,360 s | 1,896 s | 3,054 s |
| witness `--changed-since` (30-min cap) | `node scripts/run_mutation_witness_tests.mjs --changed-since <ref>` | 43 | 1,790 s | 2,187 s | 2,934 s |

- **The browser tier grew sixfold in a week and nobody knows why**: 245–453 s
  on 10-27 to 10-29, 1,262 s on 10-31, 1,822–1,985 s on 11-09 and 11-10. The
  runner prints no per-suite time
  (`docs/issues/ISSUE_20261106_the_viewer_browser_tier_ran_51_minutes…`).
- One landing pays the two half-hour tiers three times: the tactical session
  (F1a: 431 s pytest + 1,944 s browser + 1,722 s witness, 69 minutes, plus
  re-runs), the review (about 82 minutes), the batch merge (74 minutes) —
  about 3.8 hours of suite time per landing, serialised on one machine-wide
  browser slot. The three pytest runs over an hour are slot waits
  (`tests/test_browser_runner.py` takes the browser slot; one run spent 774 s
  of 1,212 s queued).
- **The instructions disagree.** `dispatch/dispatch/prompts/_SUITE_BUDGET.md:12-16`
  says a merge-only tier is for the review merge and the batch merge, and "a
  tactical branch runs a merge-only tier only for the specs it added or
  changed, never the whole tier". This repo's `CLAUDE.md:156-160` says
  "before trusting any green … run in the main checkout" all four node
  commands, and handoffs' definitions of done repeat it. Tactical sessions
  follow the stricter reading.
- The browser runner selects with `--only <substring>` only
  (`run_viewer_browser_tests.mjs:73-81`).

## Deliverables

1. **Per-suite timing.** The browser runner prints, at the end, one line per
   suite (name, checks, seconds, and seconds spent waiting for the browser
   slot apart from seconds running), slowest first, and a total; and writes
   the same rows where `dispatch`'s `suite-time report` reads suite times
   (find its record shape in `C:\workspace\dispatch\data\suite_times.jsonl`
   and the writer the runners already call; do not invent a second file).
2. **Say where the half hour goes, then take back what is waste.** Run the
   tier once in the main checkout on a quiet box and put the table in the
   lesson. Then act on what it shows, in this order, stopping when the tier
   is under 15 minutes or nothing unambiguous is left: a suite that boots the
   page more often than it needs to (one boot per check where one per suite
   would do); a fixed sleep where a selector wait would do; the five suite
   pairs that run the same checks over both `file://` and `http://` (keep
   both origins for the checks that are about the origin, one origin for the
   rest). **No assertion is deleted or weakened** and no suite is dropped;
   anything that would need that is listed in the lesson for Jeff, not done.
3. **One wording about who runs what.** `CLAUDE.md`'s test section and a new
   `docs/prompts/TACTICAL_AGENT.md` addition (dispatch composes it onto the
   canonical prompt) say, in one short table: a tactical session runs the
   default pytest tier once, the two fast node tiers, the browser runner with
   `--only` for each suite it added or changed, and the witness runner with
   `--only` for each spec it added or changed; the whole browser tier and the
   witness `--changed-since` gate run once, at the review, after the merge;
   the batch merge re-runs them only when it merged more than one handoff.
   `docs/prompts/REVIEW_AGENT.md` already asks for the review's runs
   (`:327-330`, `:460-463`, `:484-488`); make its wording agree, change
   nothing else in it.

## Definition of done

- The per-suite table from a real run in the lesson, and the tier's total
  before and after on the same quiet box (run
  `tests/debug_cpu_sustained_clock.py`-style caution applies: say what else
  was running).
- Every one of the 865 guards still runs and passes; the count is printed
  before and after.
- Default tier and both fast node tiers green. The witness gate is not
  needed for this diff unless you changed a spec.
- Lesson
  (`docs/sessions/lessons/LESSONS_20261110_the_browser_tier_says_where_its_half_hour_goes.md`):
  the table, what was taken out and the seconds each bought, what is left
  that only a judgement call could remove, and the cause of the 10-29 →
  10-31 jump if the table shows it.
