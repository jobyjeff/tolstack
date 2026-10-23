# Review — the annotate scene renders only when something changed (2026-10-22)

**Verdict: APPROVE.** No inline fixes; no merge conflict (clean merge into `integration`-based review branch).

## Checked
- Every scene-mutating method in `scene.js` calls `requestRender()` (camera `change` listener, resize, load/unload, visibility, ghost, `_drawAt`, tints, marks, bind leader, all sweep setters, both framing methods). `pick`/`sweepHover` are read-only; `autotestPick` restores the camera before any frame. `app.js` mutates no scene objects directly, and the sweep clock reaches the scene only through `setSweepFrame`/`setPartMatrix`/`setSweepGhost`, so no edit there is correct.
- Browser-check frame waits moved to `renderCount`; the reduced-motion pass still measures the sweep clock (64.6 vs 15.0 fps → index 69 vs 71).
- Two new guards in `testAnnotateRenderOnDemand`; both mutation specs `WITNESSED` (`--only 599ea9d4`, `--only ebe2b329`); enumeration pin moved 581/548 → 583/550.

## Results (review worktree, main-checkout node_modules junctioned then removed)
- `node apps/annotate/run_tests.cjs`: 213/213.
- `node apps/annotate/run_browser_check.mjs`: 67/67.
- `run_viewer_browser_tests.mjs --only "renders on demand"`: 3/3.
- `pytest -q` (deselecting `tests/test_viewer_js_suite.py`, red in a worktree by design): 1561 passed, 1 skipped.

## Notes
- The lesson's CPU numbers are whole-check and honestly caveated (3.64 → 2.61 mean cores); accepted.
- Not run here (batch merge owns them): `--full` witness registry, viewer `[real]` tier.
