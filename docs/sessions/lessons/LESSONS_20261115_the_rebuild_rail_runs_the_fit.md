# Lessons — the_rebuild_rail_runs_the_fit (2026-11-15)

## What changed

`scripts/rebuild_projections.ps1` has a ninth invocation, **"feature fits"**
(`fit_bound_features.py --data-root <RepoRoot>\data`), after feature identity and
before contact suggestions; `..\feature-geometry\fits.json` is among the printed
provenance stamps. `fit_bound_features.py` gains `empty_build_warning` and a
`summary.log_bindings` count. Tests: a step-order/stamp test in
`test_rebuild_projections_script.py`, a warning test in `test_fit_bound_features.py`.

## Decisions

- **On the rail, not a separate verb.** Measured wall time of the fit: **0.85 s**
  for 12 features (main-checkout inputs, scratch output). Rejected: an `ops.toml`
  verb the batch-merge checklist runs — it would be a second rail for a
  sub-second step, the exact "two rails disagree about which tree" shape the
  script's own header warns about, and the checklist is the thing that forgot it
  in the first place.
- **Candidate worktree:** the step reads `data/inbox/feature-identity` and
  `data/meshes` (both already under `[tests] candidate_inputs`) and the tracked
  topologies. Optional extra read: rotorkit's `placements.json`, outside the
  workspace repo, tolerated absent. Nothing new to declare.
- **The warning's count is independent of the fit's own fold.** `log_bindings`
  sums the per-key records (`by_stack_key` + `by_feature_subject`), not
  `by_feature`; a fold that came up empty over a non-empty log would otherwise
  report "0 of 0". It fires on `fitted == 0 and log_bindings > 0`. It cannot see
  the 2026-11-13 case where the *events dir itself* was empty (the log counts 0):
  nothing in the build knows what the log "should" hold. `log_bindings` (14) also
  exceeds `bindings` (12) on the live log — old-shape events read through to a
  feature already standing — so the two are not comparable as "lost" rows.

## Definition-of-done deviation — read this

The DoD asks for `powershell -NoProfile -File scripts\rebuild_projections.ps1`
from the worktree against its own `data/`. **That cannot run**: the worktree has
no `venv-win` (preflight refuses, correctly, "Nothing has been built"), and its
`data/` has no meshes or sweeps. I did not pass `-RepoRoot` at the main checkout
(that rebuilds the main checkout's projections; the handoff forbids it). So the
rail's printed stamp line is **not quoted from a run** — the next batch merge
produces it. What I ran instead: the fit step alone, inputs read from the main
checkout, output to a scratch root:

    branch=handoff/the_rebuild_rail_runs_the_fit sha12=063e69cbf8c6 dirty=True behind_trunk=4
    12 fitted, 0 unresolved, from 12 bound feature(s) (12 binding(s))

(`inputs absent` there reflects the scratch data root, not the main checkout.)

## Other projections nobody rebuilds

Not exhaustively audited — only compared the rail's writers against
`projection_provenance.py`'s consumers I know of. Worth a sweep: anything
linkage/forge read under `data/projections/` other than `viewer/`,
`feature-identity/` and now `feature-geometry/`. `projections/README.md` is the
only other thing in the worktree's projections dir.

## Test record

- `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q`, in this
  worktree: **1988 passed, 1 failed, 1 skipped, 2 deselected, 9m50s**. The one
  failure is `test_viewer_js_suite_is_green`, the documented worktree-only red
  (no `data/projections/viewer/results.json`).
- `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`: 699/699.
  `node apps/annotate/run_tests.cjs --repo C:/workspace/tolstack`: 316/316.
- Not run: browser tier and witness gate (no browser suite or guard added or
  changed; review's). No guard added, so no mutation spec.
