---
priority: med
depends_on: []
model: sonnet
hitl: false
---

# HANDOFF 2026-11-15 — the_rebuild_rail_runs_the_fit: rebuild_projections.ps1 refreshes fits.json, so linkage never reads a hand-run leftover

Source: the 2026-11-15 triage sweep, from
`docs/issues/ISSUE_20261113_no_rail_rebuilds_fits_json_so_linkage_reads_whatever_was_last_run_by_hand.md`.
Baseline: tolstack `master` at `f43d02ae`. Scope: `scripts/rebuild_projections.ps1`,
`scripts/fit_bound_features.py` (only for gating or provenance), `ops.toml`
(only if you add a verb), `CLAUDE.md`'s rebuild notes, and `tests/`. Do NOT
touch `apps/`. Do NOT touch the linkage repo: `linkage/vpa.py::CAD_FITS_PATH`
reads the file, and the file's path and shape stay as they are.

## The gap

`scripts/rebuild_projections.ps1` runs eight steps:
1. vocabulary
2. topology
3. viewer
4. part names
5. crops
6. feature identity
7. contact suggestions
8. kinematic

None of them is `scripts/fit_bound_features.py`, and no `ops.toml` verb names
it. linkage reads `data/projections/feature-geometry/fits.json` directly.

On 2026-11-13 the main checkout's `fits.json` was an empty build (0 bindings)
while the log held 11 standing bindings. Today's batch merge ran the actuator
in the main checkout. It still did not touch `fits.json`, so linkage reads
whatever was last run by hand.

## Deliverables

1. **The fit is a rebuild step.**
   - Add `fit_bound_features.py` to `rebuild_projections.ps1`, after feature
     identity, since it reads the bindings.
   - Gate it like the other writers, and stamp provenance the same way, so the
     batch merge's step-7 report shows a `fits.json` stamp beside the other
     five.
   - If a full fit is too slow for every rebuild, say so with the measured time
     and make it a named verb that the batch-merge checklist runs instead.
     Record the choice and the rejected alternative in the lesson.
2. **The step runs in a candidate worktree too.** The batch merge runs this
   actuator in a throwaway worktree with only declared inputs bridged. Check
   that the fit step reads only what is already declared under
   `[tests] candidate_inputs` (`data/inbox/feature-identity` is). If it needs
   more, declare it. Only read-only inputs may be declared.
3. **An empty build over a non-empty log is not silent.** When the binding log
   has standing bindings and the fit writes zero rows, the step prints a
   warning line naming both counts. It is a warning, not a failure: the payer
   of a misfire would be the operator.

## Definition of done

- Run `powershell -NoProfile -File scripts\rebuild_projections.ps1` (no
  `-ExecutionPolicy Bypass`) from the worktree against its own `data/`, and
  quote the new provenance-stamp line in the lesson. Do not run it in the main
  checkout from this session; the next batch merge does that.
- A test that the actuator's step list includes the fit, using whatever pattern
  the existing step-list tests follow.
- Default tier green: `PYTHONIOENCODING=utf-8 C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q`.
- The issue set to `status: resolved` with a one-line `resolution:`.
- Lesson (`docs/sessions/lessons/LESSONS_20261115_the_rebuild_rail_runs_the_fit.md`):
  the fit's wall time inside the rebuild, and any other projection linkage or
  forge reads that no rail rebuilds.
