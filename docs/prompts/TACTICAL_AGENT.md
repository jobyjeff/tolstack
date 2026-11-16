## tolstack — who runs which test tier

Dispatch's rule applies here unchanged: a tactical branch runs a merge-only tier
only for what it added or changed, never the whole tier. For this repo that is:

| Who | Runs |
|---|---|
| **you (tactical)** | the default pytest tier once, at the end; `node apps/viewer/run_tests.cjs` and `node apps/annotate/run_tests.cjs`; `node scripts/run_viewer_browser_tests.mjs --only "<suite>"` for each browser suite you added or changed; `node scripts/run_mutation_witness_tests.mjs` **once**, with a repeated `--only "<guard>"` for every spec you added or changed |
| review, after the merge | the whole browser tier once, unless a whole-tier green for the same `tree` is already on the ledger (cite it); the witness gate `--changed-since <ref> --budget-min 10`; a diff that touches nothing outside `docs/` runs the two fast tiers only |
| batch merge | the default tier, the two fast tiers and the witness gate at the 30-minute cap over the whole batch's diff; the whole browser tier only when `git diff --quiet <tree the last review tested> <merged tree> -- . ":(exclude)docs/sessions" ":(exclude)docs/issues"` says the trees differ, otherwise it cites the review's ledger row (timestamp and seconds) |

- Do not run the whole browser tier or the witness `--changed-since` gate
  yourself; the review owns them, and a handoff's definition of done that
  names the whole tier means the review's run.
- Both runners write their own suite-time ledger row, each carrying the `sha`
  and `tree` it ran on, and print a timing table; do not also `suite-time record`
  that command. An `--only` run's row is tier `partial`, which dispatch's report
  does not count as a whole run.
- Pass **every** guard you changed to one witness invocation (`--only a --only b
  ...`): one shadow copy and one clean run per suite, then one mutated run per
  spec, instead of both again for each spec. A name that matches nothing stops the
  run before it starts.
- From a worktree the browser runner needs `--repo C:/workspace/tolstack` for the
  projections, and `node_modules` (a junction to the main checkout's).
