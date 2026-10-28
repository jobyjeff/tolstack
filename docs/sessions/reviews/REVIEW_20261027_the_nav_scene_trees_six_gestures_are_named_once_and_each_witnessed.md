---
verdict: APPROVE
---

# Review — the_nav_scene_trees_six_gestures_are_named_once_and_each_witnessed

**APPROVE.** Merged with no conflict; no inline fixes.

- Vocabulary: `VA.SCENE_ACTS` (nav.js) and `AA.RAIL_ACTS` (commands.js), paired by
  `tests/test_rail_act_vocabulary_is_paired.py` (set equality, key==word, no inline
  literals left in the senders or in `railGesture`).
- Unknown `act` warns by name; unknown `key` stays quiet (a browser check pins both).
- Four new `[real]` checks (disclosure toggle read in nav and annotator, checkbox
  hides/shows in `__scene`, row button index 1, unknown-word warning), each with a spec.
- Issue resolved; lesson present.

## Verified here
- `pytest -q` minus the viewer-js-suite tier a worktree cannot run: 1588 passed, 1 skipped.
- `apps/annotate/run_tests.cjs`: 235/235. Viewer node tier: 483/483 (its `[real]` tier skipped: no projection in a worktree).
- Browser suite `--only "3D pane follows"` with `--repo C:/workspace/tolstack`: 32/32 (was 27).
- `--changed-since integration`: 13/13 witnessed, including all 5 new specs.

## Notes
- The worktree has no `node_modules`; I linked the main checkout's temporarily (junction, removed
  afterwards) and passed `--repo` for projections. The main-checkout node tiers against a projection
  rebuilt from this tree remain the batch merge's.
- Process slip: integration was fast-forwarded to the handoff tip first; this report landed in a
  second fast-forward right after.
