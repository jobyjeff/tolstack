# Lessons — the all-topology leader test counts its views by kind (2026-11-02)

## What changed

`apps/viewer/tests.js`, the `[real] no two leaders cross ...` test only:

- Views are counted by kind (whole / chain / kinematic) as they are pushed; each kind must be non-zero. `kinematicViews > 0` replaces `kinStudies.length > 0`.
- `expected` is derived from the projections' own study lists (`1 + 2 × (chain studies + kinematic studies on the topology)` per topology, × density × mode × style), not from the loop that fills `configurations`. A null lit set or a drifted topology id now drops a view and breaks the equality.
- The test prints its by-kind counts.

## Measured

`node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` (from the worktree): 629/629 passed. Reported line:

    leader coverage: 1 topologies, 1 whole + 44 chain + 2 kinematic views, 12 combinations = 564 configurations

(44 chain = 22 lit studies × dimmed/hidden; 2 kinematic = one study × 2. The handoff's "(1 + lit chain + kin) × 2" overcounts: the whole walk is drawn once, not twice.)

## Mutation proof

`VA.kinematicLitSet` made to `return null` (views/kinematic.js:469), then reverted (`git checkout`): 620/629 passed, 9 FAIL, including
`FAIL  [real] no two leaders cross on any committed topology, at every density, length mode and leader style, and the bands still tile the pane`.
The other eight are tests of kinematic lit sets itself. Before this change that test would have passed with the kinematic page silently gone from its coverage (the old `kinStudies.length > 0` is true regardless).

## Notes

- `-n 16 --dist loadfile` is unrecognised by this venv's pytest (no xdist); the default tier was run plain.
- Default tier, worktree, plain `pytest -q`: 1 failed, 1687 passed, 1 skipped, 2 deselected in 600.8s. The one failure is `test_viewer_js_suite_is_green`, the documented worktree-only red (no `data/projections/` here); the same JS suite passed 629/629 against the main checkout's projections via `--repo`. Browser TRUTH and mutation-witness tiers not run (touched file has no witness anchors in my diff beyond tests.js; not armed in a worktree).
