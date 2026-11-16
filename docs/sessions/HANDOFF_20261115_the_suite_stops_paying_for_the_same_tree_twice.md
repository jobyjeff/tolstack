---
priority: high
depends_on: [the_scene_suite_opens_its_own_pane]
model: sonnet
hitl: false
---

# HANDOFF 2026-11-15 — the_suite_stops_paying_for_the_same_tree_twice: five cheap cuts to what a landing spends on tests, with nothing new gated

Source: the 2026-11-15 strategy session (`dispatch/docs/strategy/HANDOFF_20261115_strategy.md`).
Jeff: the suite is tolstack's bottleneck, and he wants the low-hanging fruit
only, not an optimisation project, and no corner cut that brings back the
11-05 → 11-08 thrash. Baseline: `master` at or after `86576d72`, with
`the_scene_suite_opens_its_own_pane` merged (it edits the browser runner's
suite setup; this handoff edits the same file's ledger write). Scope:
`scripts/run_mutation_witness_tests.mjs`, `scripts/witness_budget.mjs`,
`scripts/run_viewer_browser_tests.mjs` (the ledger row only),
`scripts/browser_runner.mjs` (the ledger row only),
`tests/test_mutation_witness_shadow_concurrency.py`, `docs/prompts/*.md`,
`CLAUDE.md` (the suite table and its paragraph), and tests for the runners.
Do NOT touch `apps/`, `tolerance_stack/`, any browser suite's checks, or the
witness registry's entries: a viewer chain runs beside this one and owns them.

## What was measured (the 11-12 → 11-15 chain, seven handoffs, 58 h 24 m)

Sources: `C:\workspace\dispatch\data\suite_times.jsonl`, the lessons' test
records, `git log`.

| Tier | Runs | Hours |
|---|---|---|
| default pytest (411–668 s each) | 20 | 2.6 |
| whole browser tier (1,586–1,845 s) | 10 | 4.8 |
| witness `--changed-since` gate (397–1,848 s) | 7 | 2.75 |
| **recorded full-tier total** | | **10.2 (17% of the chain)** |

Not in the ledger: tactical `--only` loops (one witness invocation per spec,
about 55 s per fast spec; estimated 2.2 h in the highlight handoff and 3.7 h
in the fixed-layout handoff, from commit gaps), and a scratch data root built
at least ten times at about 7 minutes each. The seven witness gates found one
real decayed witness. The 11-15 batch merge spent 69 minutes (635 + 24 + 34 +
1,604 + 1,848 s) on a tree that differed from the one the last review had
tested by one file and zero lines of code.

## Deliverables

1. **Two lock tests move to the sweep.**
   `tests/test_mutation_witness_shadow_concurrency.py`, the tests at about
   lines 184 and 252 (75 s and 74 s) take the `sweep` marker their siblings at
   about 141 and 208 already carry. The review prompt's subset mapping
   (`docs/prompts/REVIEW_AGENT.md`) names all four as the subset to run when a
   change touches `scripts/run_mutation_witness_tests.mjs` or
   `scripts/witness_budget.mjs`. Expected: the default tier drops by about
   150 s and is back under its 600 s budget at a batch merge; record before and
   after.

2. **The review's witness gate is ten minutes; the batch merge's stays
   thirty.** `docs/prompts/REVIEW_AGENT.md`: the review runs
   `--changed-since <ref> --budget-min 10` (add the flag to the runner if the
   launch cap is not already settable from the command line; today it is
   `scripts/witness_budget.mjs:16`). `CLAUDE.md`'s table says so. The batch
   merge keeps the 30-minute cap, over the whole batch's diff, so decay
   coverage per batch is unchanged in kind. What this gives up, in the lesson
   in one sentence: a review used to reach about 45 of 420 selected entries in
   30 minutes, cheapest first, and now reaches fewer; the batch gate and the
   sweep are what see the rest.

3. **A batch merge does not re-run the browser tier on a tree a review
   already ran it on.** Replace "the same two again, only when it merged more
   than one handoff" (`CLAUDE.md`, the suite table; say the same in
   `docs/prompts/` if a triage overlay exists here) with: the batch merge
   runs the default tier, the two fast tiers and the witness gate; it runs the
   whole browser tier only when
   `git diff --quiet <the tree the last review tested> <the merged tree> -- . ":(exclude)docs/sessions" ":(exclude)docs/issues"`
   says the trees differ. When they do not, the merge record cites the review's
   run (ledger timestamp and seconds). This needs item 5's sha on the ledger
   row to be checkable; until a row carries one, the review's APPROVE commit is
   the tested tree.

4. **The witness runner takes several guards in one `--only`, and an `--only`
   run is recorded.** Today `--only` is one substring
   (`scripts/run_mutation_witness_tests.mjs:229,251-252`) and a tactical
   session with 33 changed specs pays 33 shadow copies and 33 clean baselines.
   Accept a list (repeat the flag or separate with commas; keep the single
   substring form working), group the selected specs by suite, and pay one
   shadow copy and one clean run per suite, then one mutated run per spec.
   Both runners write a ledger row for an `--only` run, marked as partial
   (`tier` value of your choosing that the report can tell from a whole run),
   with the count of suites or specs. `docs/prompts/TACTICAL_AGENT.md` tells
   the session to pass all its changed guards in one invocation. Measure one
   real case in the lesson: the same five specs run the old way and the new
   way, in seconds.

5. **A ledger row says which tree it ran on, and a same-tree green is
   cited, not repeated.** Rows written by both runners carry the commit sha
   and the tree hash (`git rev-parse HEAD^{tree}`), the handoff slug and the
   role when the environment gives them (find how dispatch passes them; if it
   does not, say so and carry sha and tree only). `docs/prompts/REVIEW_AGENT.md`:
   before the post-merge whole browser tier, the review looks for a
   whole-tier green on the same tree hash and cites it instead of running
   again (in the chain this was one review of seven, 28 minutes). A review of
   a handoff whose diff against `integration` touches nothing outside `docs/`
   runs the two fast tiers and stops there (the 11-14 walk's review spent
   2,926 s of tests on a handoff that wrote a review page and one CSS rule; a
   CSS or JS line is not "docs", and gets the usual tiers).

6. **Suggestion, investigate and report: one scratch data root per tree, not
   per session.** Every worktree's default run is red by design until the
   session builds a scratch data root (about 7 minutes). If the root can be
   keyed by the inputs it is built from and kept under the main checkout's
   `tmp\` by absolute path, a review can reuse its tactical session's. Build
   it only if it is a small change and the key is honest (a stale root that
   reads green is worse than seven minutes); otherwise write what stands in
   the way and file it.

Nothing here adds a tier, a gate or a refusal. If any item turns out to need
one, stop and file it for strategy (Jeff is told first, 2026-10-26).

## Definition of done

- Default tier measured before and after on the same tree; under 600 s after.
- Item 4's old-way and new-way seconds for the same five specs, and one
  `--only` row of each runner shown from `suite_times.jsonl`.
- A whole-tier ledger row shown carrying sha and tree.
- The runner tests cover: several guards grouped by suite; the single
  substring form unchanged; the budget flag stops launches at ten minutes.
- `CLAUDE.md`'s suite table and the three prompts in `docs/prompts/` say the
  same thing; read them side by side once and quote the four governing
  sentences in the lesson.
- Lesson (`docs/sessions/lessons/LESSONS_20261115_the_suite_stops_paying_for_the_same_tree_twice.md`):
  the before/after numbers per item, what item 6 found, and the estimated
  minutes saved per landing and per batch merge with the arithmetic shown.
