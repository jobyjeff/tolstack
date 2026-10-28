# Lessons 2026-10-28 — a_named_finding_skip_does_not_redden_the_default_tier

- **Shape chosen: a named PASS** (`[real] 0 live parts cite both a drawing and a workbook ...`) in place of `skip()`.
  A SKIP line means "this tier could not run"; an empty live set is a finding, not a provisioning gap, so the skip guard
  and its "almost always a worktree" text stay accurate (that path is now only the real worktree case). The `else`
  branch is unchanged, so a future live mixed part swaps the PASS for the real check automatically.
- **Both directions proven:** `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` -> `592/592 passed`, no SKIP,
  PASS line names the zero. Same runner in the worktree (no projection) -> `SKIP  node-fs tier`, `1 TIER SKIPPED`;
  `pytest` in the worktree is still red on `test_viewer_js_suite_is_green` with that skip.
- **Guard count raised, not enrolled:** the new test counts as a guard (592 -> 593, `guard_enumeration.mjs` pin). It asserts
  a count is zero and has no source mutation that reddens it, so the pin was raised (allowed; visible in the diff).
- Full worktree suite: `pytest -q -p no:xdist` 1 failed (the expected worktree skip), 1590 passed, 1 skipped, 4m54s.
  Main-checkout `pytest -q` not run: it cannot see this branch.
