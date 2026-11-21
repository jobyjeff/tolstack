---
type: review
handoff: docs/sessions/active/HANDOFF_20261119_the_map_pin_hover_lights_its_bound_face_in_the_scene.md
reviewer: agent
date: 2026-11-19
verdict: APPROVE
blockers: 0
---

# Review 2026-11-19 — the_map_pin_hover_lights_its_bound_face_in_the_scene

Branch `handoff/the_map_pin_hover_lights_its_bound_face_in_the_scene` (`16ee8f52`,
`c43c42a3`), fast-forwarded onto `review/…` from `integration` `0adbc4f7`.
Containment checked first: the branch was not already merged. No prior attempt on
this review branch (only the board commit).

The diff touches one code file (`scripts/run_viewer_browser_tests.mjs`, +25 lines in
`testTheMap` step 5), two issues, one new issue and the lesson. No stack, topology,
projection input, `apps/` code or guard changed. So the seven stack checks do not
apply: there are no element values, signs, LMC/MMC, RSS, nominals, cotter hardware
or ratio in this diff, and `fold()` is untouched.

## What I verified

- **The cause, independently.** `git log 1f8c6381..69c6f779 -- apps/ scripts/run_viewer_browser_tests.mjs`
  is empty (9 commits in the range, none in code), as the lesson says. The binding
  stands: `0077_hub_boss_in_tan_link_mount_pilot.json` (face 144, sha `e28285d1…`)
  and `0079_hub_spindle_bore_axis_kept.json` repeating it. Events 0080–0083 touch
  the hub but not this feature; 0084–0100 do not touch the hub. `scopeToParts`
  (`apps/annotate/app.js` ~365–395) does load the rest of the store as context
  inside the one `isolate` entry, and the `annotate:exec` listener (~7630) runs
  everything through one `AA.ExecQueue`. The lesson's timeline arithmetic re-derives
  (20945 − 15434 = 5.5 s; 109.9 − 76.0 = 33.9 s).
- **The fix is a precondition, not a weakened observation.** The sentinel is
  `scene-view`, which is read-only (`cmdSceneView`). Its `annotate:result` goes back
  to the posting window, and nothing in `apps/viewer/` handles `annotate:result`
  (grep), so it has no side effect. The clause is byte-unchanged, and it still
  requires a `hover`/`own` layer with `faces > 0` within 5 s. A page that stops
  posting the light still turns it red. It was observed red in exactly that
  sub-clause before the fix (`pane null`, 28/30 in the tactical's run). If the
  sentinel times out, `paneSettled` is printed in the diagnostic line and the
  clause still fails by name. Nothing is thrown, so the swallow-and-report
  overlay entry is satisfied.
- **Jeff's log:** 101 files before my runs, 101 after. The main checkout's
  `git status` was clean after the runs.
- **Issues.** The 11-18 issue moved to `status: resolved` with a one-line
  `resolution:`, as deliverable 4 asks. The new product-side issue has full
  frontmatter, `audience: strategy`, options and a recommendation (correctly not
  `needs: jeff`). I found no duplicate on integration.
- **Lesson audit.** I re-checked its counts and causal claims against the tree,
  the log and my own runs. The fast-tier counts 605/605 and 331/331 match mine.
  The tactical deferred the whole browser tier to the review. That matches
  `CLAUDE.md`'s test table, even though the handoff text asked the tactical to
  run it.

## Tests

Tactical record: default tier in the worktree, `1 failed, 2372 passed, 1 skipped,
4 deselected` in 653.7 s (the one failure is the deliberate worktree
`test_viewer_js_suite`). There is a `--only "the map (the counts"` 30/30 ledger row
and a witness `--only` row for this guard (`2026-11-19T21:23:44Z`, 224 s,
WITNESSED). This record is consistent with the diff, so I gave it the benefit of
the doubt.

The merge was a fast-forward, so the pre-merge and merged trees are identical
(`e85d36c8`). I ran everything once, on the merged tree, in the review worktree
with a `node_modules` junction, against the main checkout's projections:

- `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`: **605/605**.
- `node apps/annotate/run_tests.cjs`: **331/331**.
- `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -p no:cacheprovider`:
  **1 failed, 2372 passed, 1 skipped, 4 deselected in 387 s**. The one failure is
  `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`, the worktree-only
  red, whose content is covered by the `--repo` run above. It ran single-process.
  This repo's conftest prints no `concurrent pytest processes` / `full-suite lock`
  header lines. Recorded as default tier 389 s, inside budget.
- **Whole browser tier**, `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`:
  **46/46**, 964 checks, 1850 s (the runner's own ledger row, `2026-11-19T22:19:34Z`,
  sha `c43c42a3`, tree `e85d36c8`). The map suite was 30/30. Its diagnostic line:
  `pane settled true after 6516ms; … pane [{"role":"hover","tier":"own","faces":1,"parts":0}]`.
  This is over the 30-min budget by 50 s. I appended the measurement to the open
  `ISSUE_20261106_the_viewer_browser_tier_ran_51_minutes_against_the_merge_budget.md`.
  One SKIP is pre-existing (`annotate rail and scene`: the live kinematic study has
  no gap row).
- **Witness gate** `--changed-since 0adbc4f7 --budget-min 10`: exit 0, **0 of 921
  entries reached**. Both entries in the file anchor more than 30 lines from the
  hunk. The guard this diff stabilises was witnessed by the tactical's `--only` run
  (row cited above).

## Findings

No blockers, no should-fix.

Nits (no issue needed):

1. **The witness for this guard reddens a different sub-clause.**
   `scripts/mutation_witnesses/browser__real-a-pin-hovered-on-the-map-lights-its-feature-s-row-i__4de7be84.json`
   mutates the map lighting (`VA.lightMap` in `applyFocus`), not the scene
   sub-clause this handoff is about. So "witnessed" here proves the check can fail
   on the map clause. It does not prove it on "its bound face in the scene". The
   scene clause's only observed failure is the pre-fix red. This predates the diff.
   A second mutation, one that stops the page posting the hover light to the pane,
   would close it.
2. **Sibling site.** The `3D pane follows the selection` bind-mode hover (~line
   14335) waits after `sweep off` for "a part open", plus a 1.5 s sleep, then
   allows 10 s for a light. It is the same shape. It is green today and sits late
   in a long-open pane, so the risk is low. I added an overlay entry so a new
   instance of this shape gets asked about.

## Overlay

I added a Recurring-bugs entry: "A part is open" is not "the pane is settled". The
sentinel-through-the-queue pattern is the fix.

## Found on arrival

Nothing (main checkout clean).
