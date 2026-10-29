---
verdict: APPROVE
---

# Review — a_guard_whose_name_depends_on_live_data_pairs_with_the_scan

**APPROVE.** One-commit change (`46cb29f5`): the `[real]` per-document-qualifier
guard in `apps/viewer/tests.js` now has one fixed name for both live states
(vacuous while no live part is mixed; re-arms with no edit). `pairExecuted` and
the SKIP-reddens-the-default-tier check are untouched. `fast` pin 622 -> 621.

Verified (review worktree, merged with the handoff branch):
- `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`: 621/621, the
  vacuous guard PASSes by name, no SKIP.
- `test_the_scan_and_the_run_agree_on_which_guards_exist`: passes.
- `test_viewer_js_suite_is_green` in a projection-less worktree: still red (SKIP) — as intended.
- `run_mutation_witness_tests.mjs --repo C:/workspace/tolstack --changed-since integration`: 1/1 witnessed.
- Fixture guard's `expect_red` name still exists at tests.js:16907; no new spec needed (new guard is vacuous today).

Not done: a literal `rebuild_projections.ps1` + full `pytest -q` in the main
checkout (it sits on master; moving it is not a reviewer's call). The targeted
checks above ran against the main checkout's projection with no staleness refusal.
Operator's batch merge should run the full tier there.
