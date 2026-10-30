# Review — the_annotator_has_no_front_door (2026-10-30)

**Verdict: APPROVE**

Handoff branch `handoff/the_annotator_has_no_front_door` (ee2a0e77, one commit on
integration 3f47878e) fast-forwarded into the review branch. Not pre-merged.

## Verified
- `grep -rn "Annotate →" apps/` empty.
- `node apps/annotate/run_tests.cjs` 265/265; `node apps/viewer/run_tests.cjs` 511/511
  (node-fs tier skipped: no projection in a worktree).
- `pytest -q` (deselecting the worktree-red `test_viewer_js_suite`): 1685 passed, 1 skipped.
- `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`: 35/37. The two
  reds (`3D pane follows the selection` on a `[real]` hover sub-check, `crop lightbox`)
  passed 32/32 and 20/20 re-run alone: load-sensitive, as the lesson reports.
- Lesson has the kept/deleted table, re-targeted checks and line counts as required.

## Notes
- Scope beyond the handoff, accepted: `?pane=1` shell param (needed for "lands with pane
  open"), removal of the pane header's "↗" link (same door).
- Three other viewer links still build the old annotator URL, and new browser guards lack
  specs: filed as issues by the author.
- Not re-run by me: witnesses `--changed-since` (author: 63/70 witnessed, the 7 are
  worktree-projection facts, one re-anchored), the node-fs/`[real]` tier. The batch merge
  owns those in the main checkout after `rebuild_projections.ps1`.
