---
verdict: APPROVE
---

# Review — viewer_browser_checks_wait_on_settled_state (2026-10-29)

**Verdict: APPROVE.** Merged into `integration`. No inline fixes made.

- Diff is confined to `scripts/run_viewer_browser_tests.mjs` (+ issues, lesson). No assertion loosened: only *when* the read happens (rect stable over two frames; `liveSettle` three equal reads; focus re-asked until held; tint poll 2 s -> 15 s). Deadlines are seconds, as asked. All four source issues marked resolved.
- Merged cleanly; `node --check` ok; node_modules junctioned from the main checkout.
- Browser tier (`--repo C:/workspace/tolstack`), 6 runs here: 35/35 x3; 34/35 x3. Failures: one in `annotate rail filter` (sub-check not captured; passed on all 5 other runs, including in the same unmodified tree state), two in `3D pane follows the selection` ("...and leaving it takes the light down") — the suite the author already filed as `ISSUE_20261029_three_d_pane_nav_body_checks_fail_in_a_loaded_full_run.md` (different sub-check; unscoped). None of the four targeted check names were observed failing in the runs where the failing sub-check was captured.
- Witnesses `--changed-since integration`: 3/3 WITNESSED (7m43s). Author's `--changed-since master`: 40/40.
- Default tier in the worktree (`pytest -q -x`, `test_viewer_js_suite.py` deselected — needs main-checkout projections): 1685 passed, 1 skipped, 900 s, contended by the concurrent witness run; over budget noted on the existing open issue, not a twin. Tactical: 472.9 s.

## Notes (not blockers)
- The author's "loaded-run counts" are honestly two loaded runs, not five; the lesson says so.
- The rail-filter failure in my run 1 was not identified to sub-check; if it recurs, check whether the tint poll's 15 s deadline is the cause or a neighbouring check.
- Left unexercised: `[real]` viewer fast-tier / annotate runner in a main checkout (docs/CSS untouched, `apps/` untouched).
