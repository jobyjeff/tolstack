## tolstack — who runs which test tier

Dispatch's rule applies here unchanged: a tactical branch runs a merge-only tier
only for what it added or changed, never the whole tier. For this repo that is:

| Who | Runs |
|---|---|
| **you (tactical)** | the default pytest tier once, at the end; `node apps/viewer/run_tests.cjs` and `node apps/annotate/run_tests.cjs`; `node scripts/run_viewer_browser_tests.mjs --only "<suite>"` for each browser suite you added or changed; `node scripts/run_mutation_witness_tests.mjs --only "<guard>"` for each spec you added or changed |
| review, after the merge | the whole browser tier and the witness `--changed-since` gate, once |
| batch merge | the same two again, only when it merged more than one handoff |

- Do not run the whole browser tier or the witness `--changed-since` gate
  yourself; the review owns them, and a handoff's definition of done that
  names the whole tier means the review's run.
- A full browser run records itself in dispatch's suite-time ledger and prints a
  per-suite timing table; do not also `suite-time record` that command.
  `--only` runs write nothing.
- From a worktree the browser runner needs `--repo C:/workspace/tolstack` for the
  projections, and `node_modules` (a junction to the main checkout's).
