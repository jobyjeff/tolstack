# Lessons — the_suite_stops_paying_for_the_same_tree_twice (tactical, 2026-11-15)

## What changed, per item

| # | Change | Where |
|---|---|---|
| 1 | The two remaining lock tests carry `@pytest.mark.sweep` | `tests/test_mutation_witness_shadow_concurrency.py`; the review prompt's subset mapping now names the file for a change to `run_mutation_witness_tests.mjs` / `witness_budget.mjs`, since naming the file is what runs sweep-marked tests |
| 2 | Review's witness gate is `--changed-since <ref> --budget-min 10`; batch merge keeps 30 | `--budget-min` was already a command-line flag (`witness_budget.mjs` `DEFAULT_BUDGET_MIN` is only the default), so the change is `resolveBudgetMin` (pure, tested) plus the prompts and `CLAUDE.md` |
| 3 | Batch merge runs the browser tier only when the trees differ | `CLAUDE.md` table, `TACTICAL_AGENT.md` table, `REVIEW_AGENT.md`; there is no triage overlay in `docs/prompts/` |
| 4 | `--only` repeats (comma list as a fallback); `--only` runs write a `partial` ledger row | `witness_budget.mjs` (`onlyValues`, `resolveOnly`, `selectOnly`, `unmatchedOnly`), `run_mutation_witness_tests.mjs`, `run_viewer_browser_tests.mjs` |
| 5 | Every row carries `sha`, `tree`, `handoff`, `role`; the review cites a same-tree green and skips the browser tier for a docs-only diff | `browser_runner.mjs` (`appendLedgerRow`, `treeIdentity`), `REVIEW_AGENT.md` |
| 6 | Not built; filed | `docs/issues/ISSUE_20261115_a_scratch_data_root_could_be_keyed_by_its_inputs_and_reused_across_sessions.md` |

## The four governing sentences, read side by side

All three places (`CLAUDE.md`'s table, `docs/prompts/TACTICAL_AGENT.md`'s table,
`docs/prompts/REVIEW_AGENT.md`'s Tests bullet) now say the same four things:

1. **Tactical:** "the witness runner **once**, with a repeated `--only "<guard>"` for every spec it added or changed."
2. **Review:** "the whole browser tier once, unless a whole-tier green for the same `tree` is already on the ledger (cite it); the witness gate `--changed-since <ref> --budget-min 10`; a diff that touches nothing outside `docs/` runs the two fast tiers only."
3. **Batch merge:** "the default tier, the two fast tiers and the witness gate at the 30-minute cap over the whole batch's diff; the whole browser tier only when `git diff --quiet <tree the last review tested> <merged tree> -- . ":(exclude)docs/sessions" ":(exclude)docs/issues"` says the trees differ, otherwise it cites the review's ledger row (timestamp and seconds)."
4. **Ledger:** "both runners write their own suite-time ledger row, each carrying the `sha` and `tree` it ran on, and an `--only` run's row is tier `partial`."

`REVIEW_AGENT.md`'s second place for the cap (the post-merge witness entry) now
says "10 minutes at a review ... and 30 at the batch merge".

## Measured

**Item 1.** Default tier in this worktree, plain `pytest -q` (the repo has no
xdist; the handoff's `-n 16` spelling is dispatch's template, not this repo's):
**494 s, 1988 passed, 1 skipped, 4 deselected, 2 failed**, recorded as
`inside budget`. The two failures are not the change: `test_viewer_js_suite_is_green`
is red by design in a worktree (no projection), and
`test_full_keeps_the_sweeps_summary_grammar_and_no_cap` pinned the old
`const BUDGET_MIN = FULL ? 0 :` spelling, which I re-pinned to the resolver call and
re-ran green. "Before" is not a second 8-minute run: the two moved tests take
**21.5 s and 23.6 s in isolation (45 s together)**, so before ≈ 539 s. The handoff's
75 s each is what they cost under box load; the saving is 45 s on a quiet box, up to
about 150 s on a loaded one.

**Item 4, the same five specs** (nine mutations, all fast tier, `--repo C:/workspace/tolstack`):
five invocations **549 s**; one invocation with five `--only` **265 s** (−52%), 9/9
witnessed both ways. The saving per spec is the shadow copy and the process start;
the clean run was already shared within one suite, so the gain grows with how many
suites a session's specs spread over, and it is largest for fast-tier specs.
Ledger rows from `suite_times.jsonl`:

- witness: `{"tier":"partial","seconds":263,"command":"node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack --only <5 ids>","sha":"d1dadebe...","tree":"106fe707...","handoff":"the_suite_stops_paying_for_the_same_tree_twice","role":"tactical","scope":"witness","specs":9,"suite_count":1}`
- browser: `{"tier":"partial","seconds":15,"command":"node scripts/run_viewer_browser_tests.mjs --only \"topology height budget\"","sha":"d1dadebe...","tree":"106fe707...","role":"tactical","scope":"browser","only":"topology height budget","suite_count":1,"checks":16}`

A browser-tier witness entry adds exactly one row (the runner sets
`TOLSTACK_NO_LEDGER` for the browser runner it spawns per mutation); checked by
counting the ledger before and after one real entry.

## Arithmetic: minutes saved

Chain: seven handoffs, 20 default runs, 10 whole-browser runs, 7 witness gates, one
batch merge.

- **Item 1:** ~2.9 default runs per landing × 45 s (quiet) to 150 s (loaded) = **2–7 min per landing**.
- **Item 2:** the 7 gates averaged 2.75 h / 7 = 23.6 min; capped at 10 each, the
  review's share drops to at most 10 → **up to ~14 min per review** (less where the
  gate was already short). What it gives up, in one sentence: a review used to reach
  about 45 of 420 selected entries in 30 minutes, cheapest first, and now reaches
  fewer; the batch gate and the sweep see the rest.
- **Item 3:** the 11-15 batch merge ran the browser tier once for **1,604 s ≈ 27 min** on a
  tree that differed by one file and zero lines of code → **27 min per batch merge** when the trees match.
- **Item 5:** one review of seven repeated a whole-tier green (28 min) and one
  docs-only review spent 2,926 s (49 min): (28 + 49) / 7 ≈ **11 min per landing** on average, 28–49 where it applies.
- **Item 4:** measured 549 → 265 s for five specs. The 33-spec handoff
  estimated 3.7 h of `--only` loops; at the measured ratio that is roughly halved,
  an extrapolation and not a measurement.

Per landing: about 2–7 + 14 + 11 ≈ **27–32 min** (items 1, 2, 5); per batch merge:
**~27 min** (item 3), plus item 4 on tactical sessions with many specs.

## What item 6 found

Not built. The projection stamp and gate are ancestry-based and say nothing of
content; a tree-hash key would almost never hit (a review merges `integration` into its
branch first, so its tree differs from the tactical branch's), and an honest per-input
key has to cover the gitignored inputs (`data/inbox/specs/`, `data/meshes/`,
`data/inbox/feature-identity/`) with a stat manifest and a refusal arm. A stale root
that reads green is the 2026-09-24 incident again, so it is filed for strategy
(`type: feature`, `audience: strategy`) with three options rather than built.

## Surprises and decisions not in the handoff

- **`--budget-min` already existed** on the command line, so item 2 needed no runner flag.
- **Guard names contain commas** (many specs), so a comma list cannot be split blindly:
  `resolveOnly` tries each value whole first and splits on commas only when it
  matches nothing. Repeating the flag is the primary form.
- **An unmatched name in a several-guard run stops it before it starts** (`--only [...] matches no entry; nothing was run.`). Without it, one typo among five names
  would go green on the other four and never say one guard was not witnessed. Single-name behaviour (message, exit 1) is unchanged. This is a refusal, but it is the existing refusal extended to the list form, not a new gate.
- **dispatch gives a session only `DISPATCH_SESSION_LABEL`**, in a format I did not
  chase. `handoff` and `role` therefore come from the branch: `handoff/<slug>` is
  `tactical`, `review/<slug>` is `review`, anything else is null. A triage or batch
  merge run is on neither branch and carries `sha` and `tree` only.
- **A `partial` tier is invisible to dispatch's report** (it loops `default|merge|sweep`
  and `board_lines` reads only `default`), which is what keeps a tactical loop from
  reading as a whole run. Its `budget_s` is 0 and `over` false.
- **The ledger helper lives in `browser_runner.mjs`**, not a new module, so
  `ARCHITECTURE.md`'s inventory needed no row (the handoff's scope lists this file
  "for the ledger row only").
- A scratch `node_modules` junction was needed for the one browser `--only`; removed
  from PowerShell afterwards (`(Get-Item node_modules).Delete()`), target untouched.

## Sites (the enumeration)

Reached: the browser runner's whole and `--only` arms; the witness runner's `--only`
arm and its `--changed-since` selection (`ONLY` narrows it, now with a list); the
witness runner's refusal message (now one combined command); the three prose
statements of the table. **Not reached, deliberately:** a whole witness run
(`--changed-since`, `--full`) still writes no ledger row, so the gate's time is
recorded by hand (`suite-time record`) as before and the sweep's by its job; the
whole-browser row's `sha`/`tree` is produced by the same helper and is covered by a
unit test, but **I did not run the whole browser tier** (the review's run, per this
repo's table), so no whole-tier row carrying `sha` and `tree` exists yet: the review's
mandatory run writes the first. No page the user can reach changed.

## Left undone / follow-ups

- A whole-tier ledger row with `sha`/`tree` is the review's to show (above).
- Item 6: filed as above.
- `tests/test_mutation_witness_shadow_concurrency.py::test_two_different_repo_roots_both_still_succeed`
  fails in this worktree on MAX_PATH while copying `docs/sessions/lessons` long
  names; already filed as
  `ISSUE_20261104_a_lesson_screenshot_name_overflows_max_path_in_the_shadow_concurrency_test.md`
  (on integration). It is a sweep-tier test and not in the default run.
