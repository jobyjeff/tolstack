---
type: bug
priority: low
status: deferred
defer_until: 2026-12-16
resolution: deferred 2026-11-16 triage -- low defers by default; 30-day date
area: scripts/fit_bound_features
reporter: agent
class: data_root_not_threaded
found_by: docs/sessions/reviews/REVIEW_20261116_the_map_draws_the_end_stop_model.md
---

# `fit_bound_features.py --data-root` stamps `inputs_absent` off the repo root, not the data root

Every other projection builder passes its data root into the provenance stamp
(`projection_provenance.stamp(..., data_root=...)`), so `inputs_absent` says
which gitignored inputs were missing **where the builder read them**.
`scripts/fit_bound_features.py` is the one that does not (`prov.stamp(REPO_ROOT,
Path(events_dir), BUILT_BY, source_key="events_dir")`, about line 466), so
under `--data-root <scratch>/data` from a worktree it reads the meshes and
the identity log from the scratch root and then stamps

```
WARNING: inputs absent (4): data/inbox/specs, data/inbox/feature-identity, data/inbox/linkage-sweeps, data/meshes
```

because it looked for them under the worktree's own empty `data/`. The fits
it wrote are right; the stamp says they were built from nothing. Seen on the
review of `the_map_draws_the_end_stop_model` (2026-11-16), building a scratch
root from a review worktree. From the main checkout the two roots coincide
and nothing shows, which is why the rail (`scripts/rebuild_projections.ps1`,
step "feature fits") never saw it.

**Fix:** thread `data_root=Path(args.data_root)` into that one `prov.stamp`
call, like the other seven builders; `tests/test_projection_provenance.py`
gets a case that builds with a data root elsewhere and asserts
`inputs_absent == []`.
