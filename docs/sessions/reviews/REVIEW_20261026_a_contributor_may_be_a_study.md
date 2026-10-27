---
verdict: APPROVE
handoff: a_contributor_may_be_a_study
---

# Review — a_contributor_may_be_a_study

**Verdict: APPROVE.**

## What was checked
- `study_ref` loads the chain study and composes coefficient = |J| x term ratio, sign = sign(J) x term sign. Every leaf goes into the one `fold()` call; nothing folds a fold, and no second combiner was added. The `topology.py` change is `Dimension.about_nominal()` only. `fold()` is untouched.
- A nested or kinematic `study_ref` is refused by name. The unit check is the existing `_require_unit_fit` wording, refactored out of the band check.
- A study_ref whose sub-study is incomplete turns the parent check's `complete` off and names the reason. Untraced stays untraced.
- Docs: the chain-rule paragraph and the no-nesting fence are in `DAG_TOPOLOGY.md`; `ARCHITECTURE.md` has the "terms, not a combiner" sentence. The stop-location `excluded_terms` rows are removed from the study.
- Lesson records the before/after numbers. The handoff's "today" figures (+/-0.244/0.242 worst) were stale; the lesson corrects them to +/-0.290/0.315 and the live projection agrees. After: worst +/-1.707/1.339, RSS +/-0.985/0.721, J = -1.728/-1.249 deg/mm. Margins go negative. Two issues filed.

## Verification
- Merged `handoff/a_contributor_may_be_a_study` into the review branch. `pytest -q`: 1592 passed, 1 skipped, with `tests/test_viewer_js_suite.py` deselected. That test is red in any worktree by design (no projection).
- `apps/viewer/run_tests.cjs`: 451/451 passed; the `[real]` node-fs tier was SKIPPED (worktree).
- Mutation witnesses, `--changed-since integration`: all 8 python-class entries WITNESSED. The 16 browser/fast `[real]` entries could not run here (no `playwright-core` and no projection in a worktree), so they are unverified.

## Not verified here (for the batch merge, per CLAUDE.md)
Rebuild projections, then run in the main checkout: `node apps/viewer/run_tests.cjs`, `node apps/annotate/run_tests.cjs`, `node scripts/run_viewer_browser_tests.mjs`, and the witness runner. The `[real]` pins and the browser group-row tests were authored against the new projection but not executed by me.

## Findings
None blocking. The scope note (`topology.py` touched) is within "do not touch fold()".
