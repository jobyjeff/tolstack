---
type: review
handoff: docs/sessions/active/HANDOFF_20261022_an_export_lists_every_run_that_consumed_it.md
reviewer: agent
date: 2026-10-23
verdict: APPROVE
blockers: 0
---

# Review — an_export_lists_every_run_that_consumed_it

## Verified
- Merged `handoff/an_export_lists_every_run_that_consumed_it` into the review branch (not previously contained in `integration`).
- The three named citations list all five 213668-002 A.1 runs; the `ts` values match each run's `run_meta.json` (the two backfilled runs' derived ts is disclosed in the notes). Notes reworded for a multi-run list.
- Diff scan of `docs/topologies` and `docs/tolerance_stacks`: no band, nominal, min/max or `kind` line changed.
- New guard `tests/test_export_runs_match_the_run_log.py` pairs every established export's `runs` with `runs.jsonl`, skips with the path named when the log is unreadable, and has a vacuity assertion plus a synthetic test of the three defect shapes. It found 30 blocks in 7 files beyond the 3 named; all were fixed and listed in the lesson.
- Mutation spec enrolled: `--only ... --repo C:/workspace/tolstack` reports 1/1 WITNESSED. The `python` tier is not censused, so no `DECLARED_GUARDS` pin moved; this is justified in the lesson.
- Risky subset (new test, test_tolerance_stack, test_end_stop_travel_study, test_provenance, test_claims_registry): 225 passed.

## Notes (non-blocking)
- The guard matches short run ids by `<id>_` prefix as well as by equality. This is weaker than id equality and the tactical agent documented it and filed an issue for it.
- The surface check was by code reading only: the card shows a run count and the ids ride on hover. No UI change, no browser run.
- Full suite was not re-run after the tactical agent's last fixes. It is covered by the post-merge full run and the operator's batch merge. The worktree-only `test_viewer_js_suite` red and the loaded-box `test_browser_runner` timeouts are pre-existing and environmental.
