# Lessons — the_annotate_pacing_checks_step_a_virtual_clock

## Deliverable 1: not a defect
`tickSweep` (apps/annotate/app.js) derives `dt` from the rAF timestamp and advances the
continuous `playbackPosition`; reduced motion only rounds what is displayed. Playback is
wall-time-paced, not per-frame. The reds were the check's wall-clock windows
(`waitForTimeout` + a setTimeout rAF) measuring box load. Playback code untouched.

## What changed
`playReducedMotionFor` in `apps/annotate/run_browser_check.mjs` installs `CLOCK`, freezes it
after load, waits for the app's frame loop to be queued on the stepped clock, plays, and
steps `ms / rafIntervalMs` frames inside one `page.evaluate`. No wall sleeps. Tolerances
unchanged (<= 6 points; 4x > 2.5 x 1x). `virtual_clock.mjs` gained `pending()` (queue length)
so a script does not step before the page has asked for a frame.

Result is exactly deterministic: 250 fps -> index 72, 16.7 fps -> index 71; 1x 500 ms -> 12,
4x -> 48, identical every run.

## Gotcha: deliverable 3 has nothing to witness
`run_browser_check.mjs` is not a gated file and neither check has a mutation spec
(`--changed-since master`: "0 of 825 entries can be reached"). Not enrolled here: the file's
guards are outside the registry, and enrolling is a separate decision.

## Verification record
- Annotate browser check, 5 consecutive runs, both checks PASS every time with the identical
  numbers above (run 1 alone; runs 2-3 while the full pytest suite ran concurrently).
  See the final tally in the report.
- `pytest -q` (worktree, default tier): 1 failed, 1737 passed, 1 skipped, 666 s — the one
  failure is `test_viewer_js_suite_is_green`, the documented worktree-only red (no projection).
- `node apps/annotate/run_tests.cjs --repo C:/workspace/tolstack`: 295/295.
- Not run: viewer node-fs/browser TRUTH tiers (not touched).
- Pre-existing, unrelated: two mock-anchor FAILs in the same browser check
  (`ISSUE_20261028_annotate_browser_check_mock_anchor_checks_are_red_on_integration`).
