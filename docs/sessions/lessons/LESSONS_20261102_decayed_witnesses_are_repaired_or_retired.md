# Lessons — decayed_witnesses_are_repaired_or_retired (2026-11-02)

Every entry of `ISSUE_20261028_witness_sweep_34_entries_decayed.md` and
`ISSUE_20261030_two_viewer_browser_witnesses_not_witnessed_on_integration.md` was re-run with
`node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack --only <id>`.

**How many of the 34 were only the red tier: 29 of the 34 sweep lines** said "tier red before the
mutation" (the issue's prose says 30 and 3 "cannot see"; the verdict lines list 4 "cannot see",
24d58bf9 ×3 and d25818b3, which is why it is 29). **26 re-witnessed with no change; 3 were already
retired before this handoff** (their specs were deleted when their guards were, so the sweep list
was stale). The other 5 lines, plus the 2 from the second issue, were real decays or
unresolved.

## Per-entry verdicts

| Entry (suffix) | Verdict | Reason |
| --- | --- | --- |
| 237dba65, c85739df, 44d881ae, b4c1a2ea, 8ce9bd17, fbf9b5b0, 95f00675, d0fe9cf2, 85040aa4, 389dc6f7, 5df95a14, 6f8fd0fb, 92c8b346, 1dcf8600, e501a078, cb2c5ac1, 242d7e68, 2bb20a42, 85be7f34, 418aaf46, 9f6ba52e, 2014a8df | **witnessed** | Miss was the red tier; green clean run, mutation reddens the declared check. |
| 0545b398, 5d72e1d7, 251f823a | **witnessed** | Same, but the first re-run's clean tier was red from a load flake (see below); a second run was green and witnessed. |
| python 5afb2dce | **witnessed** | Red tier only (1 s). |
| 208d84ab | **retired earlier** | Spec deleted in `ee2a0e77` (2026-10-30, annotator has no front door); its guard and the `flyoutFullpage` code are gone. |
| 73fc7a11 | **retired earlier** | Spec deleted in `07140d33` (2026-10-28); the guard text is gone from `run_viewer_browser_tests.mjs`. |
| 8467e314 | **retired earlier** | Spec deleted in `d3b314a7` (2026-10-28); the guard text is gone. |
| d42adbc7 | **repaired (moved)** | Clean tier green, mutation reddens two *other* checks, never the declared one: the kinematic-table row click does not reach `annotateParamsFor`'s selection branch, the nav's scene-tree row clicks do. The mutation now lives as a second mutation of the spec for the check that sees it (`..._2a27c165.json`, "clicking a contributor row in the nav selects it in the scene"); the standalone spec is removed. This is the second fix shape of `ISSUE_20261028_the_contributor_row_highlight_witness_aborts_before_its_check.md`, now resolved. The guard was right. |
| 05996459 (issue 2) | **repaired** | The old mutation deleted the contributor table, which reddened the layout check and left the declared one green. Now Unused's handler also empties `#detail`, which only the declared check reads. A `render()` mutation does not work: it rebuilds identical HTML, and the guard compares `innerHTML`. |
| 5c29720f (issue 2) | **repaired** | The mutation dropped the `.topbar` half of a CSS rule, but the guard reads only `#banner` and `#connect-btn`, and `app.js` hides the Connect button itself when served. It now drops the `#banner` half. The top-bar half of that rule is read by no check (see below). |
| 24d58bf9 #1–#3, d25818b3 | **not repaired, kept** | The guards push a named SKIPPED row, because the live projection has had one topology since 2026-10-27, so no mutation can redden them. The behaviour (`selectTopology()` keeps display preferences) still exists, so retiring would drop a real contract. Owned by `ISSUE_20261027_no_real_topology_switch_since_the_fold.md` (deferred to 2026-11-26), which I appended with the four ids. |

## Things the next agent would not derive

- **A worktree can run the browser tier** by junctioning `node_modules` from the main checkout
  (`New-Item -ItemType Junction`). It is gitignored. `--repo C:/workspace/tolstack` supplies the projection.
- **The "3D pane follows the selection" suite is red on a clean tree about four runs in five here,
  with a different set of nav-gesture sub-checks each time.** Four earlier issues already describe
  that class (`..._four_3d_pane_nav_gesture_checks_fail_together_when_the_bodies_resolve_late.md`
  and its siblings), so I filed nothing. A witness for that suite needs several attempts; the
  witnessed verdict above is from a green clean run, each time.
- **A spec's filename is derived from `expect_red`**, so re-pointing it means renaming it, and the
  target name may already be a spec — then add a mutation to that spec instead.
- No check reads the `body.an--embedded.an--served .topbar { display: none; }` half of the annotate
  style rule, so removing it would ship green. Left alone: its contract is cosmetic and the
  Connect button is hidden by script anyway.

## Verification record

- `venv-win/Scripts/python.exe -m pytest -q` (the main checkout's interpreter), in the worktree:
  1687 passed, 1 skipped, 2 deselected, **1 failed**: `tests/test_viewer_js_suite.py`, the documented
  worktree-only red (no projection under `data/`). The other failure of the first run
  (`test_every_spec_is_named_for_the_guard_it_witnesses`, from my repoint) was fixed by the move
  above and `tests/test_mutation_witnesses.py` is green. 6m42s (final run, after the move).
- Not run: the viewer/annotate node tiers and the whole browser tier in the main checkout, which
  belong to the review merge. Mutation witnesses: each changed entry witnessed in a green-clean run
  (`--only`): 5c29720f, 05996459, 2a27c165 (both mutations).
