# LESSONS 2026-10-27 — a witness run stops at its budget and leaves the rest to the sweep

## What shipped
`scripts/witness_budget.mjs` (pure: order, cap decision, summary grammar, exit code) wired into
`scripts/run_mutation_witness_tests.mjs`: `--budget-min` (default 30; `--full` and `0` = no cap),
fast -> python -> browser-by-suite order, `=> WITNESSED in <t>` per entry, a top-15 by time,
`left to the sweep (budget): <id> [<tier>, <suite>]` per unreached entry, and the capped summary
`<w>/<r> witnessed, <r>/<s> reached in <wall>; <n> left to the sweep`. `--full` keeps
`N/M declared mutations witnessed`. Exit 1 only on a miss among the reached entries.

## The replay (DoD)
Tree: `git archive e668b666` + this branch's runner, under `data/scratch/replay_20261027/`;
diff from a clean clone at `e668b666` against `449d8609` (the integration tip the review merged).
Reproduced the 10-27 selection exactly: **43 of 438** (29 browser, 14 fast).

    node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack --diff-root <clone> --changed-since 449d8609 --budget-min 30

Result: **`37/37 witnessed, 37/43 reached in 28m51s; 6 left to the sweep`, exit 0.** The 6 left were all
browser entries of the "leaders across the seam" suite. Top of the per-entry times: 4m36s, 4m25s,
4m04s, 3m07s, 3m02s, 1m54s, then 57s and everything else under a minute — **six entries cost
~21 min of the 29**; the "~70 s average" in the issue hid a long tail. Fast entries are 22 s or less.
(The run started 12 s of unmeasured lead-in before the first launch; the selection prints twice
because the runner re-runs itself under the browser slot — pre-existing, harmless.)

## Follow-ups (levers two and three, not built)
- **Shared browser-suite run.** The 29 browser entries fall in 7 suites (17 / 5 / 2 / 2 / 1 / 1 / 1) and
  every entry's anchor is a distinct (file, line) — so by disjointness all 29 could share a run per
  suite: 7 mutated runs instead of 29. Caveat: combining mutations means a page-breaking one aborts
  the suite for the rest (an abort already cannot be attributed), so sharing needs a fallback to
  per-entry on any unattributed red. Feasible, worth ~4x on this selection.
- **Cap on specs per suite per handoff** — not built.
- The six slow entries (4+ min each) are worth a look on their own: a witness taking 4 min is mostly
  suite startup or a long wait.

## First `--full` sweep row
`C:\workspace\tolstack\data\witness_sweeps.jsonl` does not exist yet; nothing to record.

## Gotchas
- The runner file is CRLF in the working tree, LF in the index; scripted edits must preserve that.

## Test record
`C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q`, this worktree, serial (no xdist here):
**6 failed, 1576 passed, 1 skipped in 442 s** (inside the 10-min budget). Two of the six were mine and
fixed afterwards (ARCHITECTURE row said "one-line"; `test_mutation_witness_shadow_concurrency.py` matched
the old summary grammar for a non-`--full` run) — re-run: 14 passed. The other four are the worktree's
known gaps, not caused by this change: `test_viewer_js_suite` (by design in a worktree),
`test_claims_registry` / `test_viewer_readme_doc_facts` (projection absent in the worktree), and — before the
grammar fix — nothing else. Not run: the browser TRUTH tier and `[real]` viewer checks in the main checkout;
the merge-tier witnesses for this diff (it touches no guard, so `--changed-since` selects none).
