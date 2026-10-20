---
verdict: APPROVE
handoff: HANDOFF_20261020_the_annotator_rail_resizes_and_names_what_it_lists
---

# Review — the annotator rail resizes and names what it lists

**Verdict: APPROVE.** All five deliverables are present and tested; no blockers.

## What was checked
- Diff read in full for `apps/annotate/` (app.js, sweep.js, commands.js, style.css, index.html). The gate sentence now lives in one place (`AA.sweepGateWords`); the canvas-click path only pulses the gate. The `setBanner` branch is gone. A sweep arrival selects the topology through `selectTopology`. A studyless topology lists every edge under a head line. Rail width is clamped, kept in `localStorage` inside try/catch, and exposed as `--rail-w`.
- Tactical report records a full-suite run, and its caveats (worktree-only red, viewer tier not runnable there) are consistent with the diff, so the benefit of the doubt stands.

## Pre-merge risky subset (diff: apps/annotate, a projection builder, rebuild script, ARCHITECTURE, ops/docs)
- pytest: vocabulary x2, feature_identity, part_mesh_aliases, architecture_inventory, ops_toml_serve_verb, provenance, app_type_scale, mutation_witnesses, projection_provenance, rebuild_projections_script, rebuild_terminal_state_pairing, claims_registry — 208 passed.
- `node apps/annotate/run_tests.cjs` — 195/195, `[real]` checks ran (no SKIP).
- `node apps/annotate/run_browser_check.mjs` — 67/67, including the drag/clamp/min-width-hover checks and the real P2 cold-load checks (frame 80 of 80, go-there lands on index 79, 29 edges listed, topology select on `vpa_pitch_linkage`).

## Post-merge (merged tree in the review worktree, `node_modules` junctioned from main)
- Full `pytest -q`, `test_viewer_js_suite.py` deselected (it needs the main checkout): **1494 passed, 1 skipped** (285s).
- Viewer fast tier through `--repo`: 428/429; the one skip is the node-fs tier, a seam the viewer-untouched diff does not reach.
- `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` — 25/25.
- Mutation witnesses: the six new annotate specs are each WITNESSED; the repointed `783e318d` (`var(--rail-w, 260px)` anchor) is WITNESSED once the browser tier is armed. A first attempt reported NOT WITNESSED only because the worktree had no `playwright-core`, so the tier was red before the mutation. That was a disarmed tier, not a decayed guard.

## Not exercised
- `tests/test_viewer_js_suite.py` in the worktree (documented worktree-only red; its tiers were run by hand above).
- The annotate `--real` browser pass: it times out at the bodies wait on the starting HEAD too, filed by the author as an issue.

## Notes (non-blocking)
- Native `title` was chosen over `#alert-pop`; if the hover delay proves too slow for scanning, `showAlertPop` is the ready seam (author's lesson).
