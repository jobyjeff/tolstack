---
verdict: APPROVE
---

# Review — the_rebuild_rail_runs_the_fit (2026-11-15)

**APPROVE.** Branch `handoff/the_rebuild_rail_runs_the_fit` (1 commit) merged into
`review/the_rebuild_rail_runs_the_fit`, landed on `integration` by fast-forward.

- Deliverable 1: "feature fits" step runs after feature identity; `fits.json` added to the
  stamp list. `fit_bound_features.py` already used the `projection_provenance` gate
  (refuses older tree, exit 3). Fit measured at ~0.9 s, so on the rail, no verb; rejected
  alternative recorded in the lesson.
- Deliverable 2: reads only `data/inbox/feature-identity` and `data/meshes`, both already
  declared in `candidate_inputs`; nothing new to declare.
- Deliverable 3: `empty_build_warning` prints a warning naming both counts, exit stays 0.
  Count is taken from per-key records, independent of the fold the fit reads. Limitation
  (empty events dir counts 0) is honestly documented.
- Tests: step order/exe/stamp test and warning test; both pass.
- Full default tier post-merge in this worktree: 1988 passed, 1 skipped (viewer JS suite
  deselected: the documented worktree-only red).

## Notes
- DoD deviation accepted: the rail script could not run from the worktree (no venv-win, no
  meshes/sweeps in worktree `data/`); the tactical agent declined to point it at the main
  checkout, correctly. The stamp line is therefore not quoted; the next batch merge's
  step-7 report is the first real observation of the `fits.json` stamp. Operator should
  confirm it appears there.
- No browser or witness tier needed: no guard or `apps/` change.
