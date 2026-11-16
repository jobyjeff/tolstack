---
type: chore
priority: med
status: triaged
area: projections/feature-geometry
reporter: agent
found_by: docs/sessions/HANDOFF_20261112_a_feature_is_bound_once_to_a_set_of_faces.md
class: projection_with_no_rail
handoff: docs/sessions/HANDOFF_20261115_the_rebuild_rail_runs_the_fit.md
resolution: triaged 2026-11-15 -- staged
---

# No rail rebuilds `fits.json`, so linkage reads whatever was last run by hand

`scripts/rebuild_projections.ps1` runs eight steps (vocabulary, topology,
viewer, part names, crops, feature identity, contact suggestions, kinematic)
and none of them is `scripts/fit_bound_features.py`; `ops.toml` names no verb
for it either. `C:\workspace\linkage` reads
`data/projections/feature-geometry/fits.json` directly
(`linkage/vpa.py::CAD_FITS_PATH`).

Found by the round-1 review of `a_feature_is_bound_once_to_a_set_of_faces`,
whose lesson said the post-merge fit was "the rebuild rail's job". It is
nobody's job. On 2026-11-13 the main checkout's `fits.json` was an empty build
(0 bindings) while the log held 11 standing bindings. After that handoff
merges, a fit has to be run by hand from the main checkout:

    venv-win/Scripts/python.exe scripts/fit_bound_features.py

Then the fit is one feature per row; the hub's locating boss stays
unresolved until Jeff keeps a face.

Fix: add the fit as a rebuild step (it is gated like the other writers), or
give it an `ops.toml` verb and name it in the batch-merge checklist.
