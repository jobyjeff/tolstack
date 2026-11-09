# Lessons — the pane-seek witness points at the comparison the page now makes

- **Re-point:** `browser__real-and-a-seek-in-the-pane-lands-the-page-s-angle-on-th__f697d046`
  now anchors `Math.abs(held - index) <= 1e-6` in `heldPoseIs`
  (`apps/viewer/topology_app.js`), mutated to `<= 1e9`: the page then "holds" every
  pose and ignores a paused pane's seek. `syncPanePose`'s comparison is the other
  direction (page -> pane) and would not redden a pane -> page check. `--only`:
  **WITNESSED** in 2m26s, reddening `[real] and a seek in the pane lands the page's angle on that frame`.
- **Why it landed red.** Round 1 of the linkage-play review ran the post-merge
  `pytest -q` (1744 passed) and asked for a rework. The rework (`665e4d34`)
  rewrote the anchored code. Round 2 ran fast tiers, the browser tier and
  `--changed-since integration` witnesses (21/22, **2 left to the sweep by
  budget**) and no `pytest`, the only tier that checks anchors resolve. The rotted
  entry was most likely one of the two budget-capped (browser entries go last);
  the review does not say which, so that part is inference. Gap: nothing owed a
  `pytest` after a rework round.
- **Fixes.** tolstack: `docs/prompts/REVIEW_AGENT.md` gains a checklist item (round 2
  re-runs `tests/test_mutation_witnesses.py`). dispatch's "Test cadence" wording is
  not edited here; filed `dispatch/docs/issues/ISSUE_20261108_a_review_round_2_after_a_rework_owes_no_full_suite_so_a_pytest_only_red_lands.md`.
- **Gotcha:** the witness runner in a worktree fails `ERR_MODULE_NOT_FOUND` for
  `playwright-core` (reads as "tier red before the mutation"). A `node_modules`
  junction to the main checkout fixes it; I removed the junction afterwards.
  `--only` was run from the worktree with `--repo C:/workspace/tolstack`, since
  the main checkout is on master and lacks the re-pointed spec.
- **Verification:** worktree `pytest -q`: 1 failed, 1867 passed, 1 skipped, 2 deselected, 400 s;
  the one failure is `test_viewer_js_suite_is_green` (no projection in a worktree, by design).
  Not run in the main checkout (it sits on master, without this branch).
