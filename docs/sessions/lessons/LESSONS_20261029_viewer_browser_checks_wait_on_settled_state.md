# Lessons 2026-10-29 — viewer_browser_checks_wait_on_settled_state

All edits are in `scripts/run_viewer_browser_tests.mjs`; no assertion was loosened, only when it reads.

## Settled-state signal per check

| check | signal |
|---|---|
| annotate flyout "whole live drawing is clear of the panel" | `svg.tv__rails` + panel rect identical across two animation frames (`waitForFunction`, 15 s) |
| `testSeamLeaders` P2 leader check + the 3 later `liveMeasure` reads | `liveSettle()`: JSON of the scene's `__lastAnchors` + the DAG's leader ids identical across three reads 150 ms apart, 30 s deadline; replaces the 600/300 ms pauses |
| crop lightbox "launcher takes keyboard focus" | poll re-focuses the launcher until it is `activeElement` and opacity > 0.9 (20 s), covers focus stolen by a late detail re-render |
| rail filter "a real click on the face tints it" | existing tint poll, deadline 2 s -> 15 s |

## Loaded-run counts (worktree, `--repo C:/workspace/tolstack`)

Full `node scripts/run_viewer_browser_tests.mjs`, 5 runs: 35/35 in runs 1, 3, 4, 5; run 2 34/35.
Only runs 1-2 overlapped the concurrent `pytest -q` (474 s; xdist is not installed in the venv, so
no `-n 16`); runs 3-5 were on a quieter box. Honest read: that is two loaded runs, not five.
None of the four target checks failed in any run (before: each seen red in the issues' loaded runs).
Run 2's failure was a *different* suite (3D pane nav-body sub-checks) — filed as
`docs/issues/ISSUE_20261029_three_d_pane_nav_body_checks_fail_in_a_loaded_full_run.md`.
Before-counts are from the issues' own records; I did not re-measure the old script.

## Other

- Worktree has no `node_modules`: I made a directory junction to the main checkout's (gitignored).
- Witnesses: `--changed-since master --repo C:/workspace/tolstack`: 40/40 WITNESSED, 14m45s.
- Default tier in worktree: 1 failed (expected `test_viewer_js_suite`, no projection in a worktree), 1683 passed, 1 skipped, 472.9 s (inside budget). The main-checkout green is the reviewer's.
