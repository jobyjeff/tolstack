# Lessons — the sweep rail's part rows carry their kind, and the Bodies call is pinned (2026-11-10)

## Why "annotate rail holds still" was green on trunk
Commit `a14bc991` (the nav's model picker) rewrote the check the issue measured.
`[real] the scene tree's rows say what they are: body, part, joint, end and candidate rows ...`
became `[real] the faces layer's rows say what they are: end and candidate rows ...`, and it now
reads only `.navtree__scene` rows (the faces layer under a selected feature). The pane's own
`#sweep-tree` Bodies rows are no longer mirrored into the nav, so no check reached
`missingPartRow`'s rows. The issue's measurement was of the old wording on `36c0cda3`; trunk's
check was narrowed, not skipped and not reading a different body set. Same class as the other
hole: a refactor moved what a guard reads and nothing noticed.

**Fix:** a new check in the same suite reads the pane's `#sweep-tree [data-group="bodies"] .part-row`
rows. Every one must carry `rail-kind--part`, and at least one must be `part-row--missing`
(so the check cannot go vacuous). In the pane the kind is a class, not `data-kind`
(`data-kind` is the nav mirror's attribute). Measured: the four rows
(`base/fastener family`, `pitch_plate/flanged bushing nas77a3 015a`, `.../tan link`,
`.../unidentified`) are 4 `part-row--missing` rows, all `rail-kind--part` now.

## The Bodies call
Three guards in "the model drawn alone and led" / the same suite family: the Bodies list's order
and part counts equal the projection topology's `bodies[]` (derived), and `pitch_plate` lists both
piston heads. Specs delete `cmdSweep`'s `AA.sweepModelTree` line; both WITNESSED. The kind check's
spec removes `railLook` from `missingPartRow`; WITNESSED. Pins in `guard_enumeration.mjs`
raised 865/832 -> 868/835 with the new name digest.

## Verified
- `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack --only "rail holds still"`: 17/17;
  `--only "the model drawn alone and led"`: 6/6. Run from this worktree with a `node_modules`
  junction to the main checkout (removed after); data read from the main checkout via `--repo`.
- `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack --changed-since master`: 5/5 witnessed (13m28s).
- `node apps/annotate/run_tests.cjs`: 307/307. `node apps/viewer/run_tests.cjs`: 554/554 with the
  node-fs `[real]` tier SKIPPED (no projection in a worktree; viewer files untouched).
- `venv-win/Scripts/python.exe -m pytest -q` in the worktree: 1927 passed, 1 skipped, 1 failed
  (`tests/test_viewer_js_suite.py`, the documented worktree-only red from the viewer's skipped
  tier), 450s, inside the 10 min budget. Not run: the whole browser TRUTH tier (merge-only).

## Sites
Reaches the missing-part row everywhere `treePartRows` is used (bodies and links). Not reached:
no joint lists parts, so none there. Nothing else renders `part-row--missing`.
