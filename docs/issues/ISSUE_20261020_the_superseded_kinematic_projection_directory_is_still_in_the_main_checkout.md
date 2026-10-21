---
type: chore
priority: low
status: open
area: data/projections
reporter: agent
found_by: docs/sessions/HANDOFF_20261020_the_viewer_shows_a_kinematic_study.md
---

# The superseded kinematic projection directory is still in the main checkout

`scripts/build_kinematic_projection.py` wrote to
`data/projections/topology/kinematic/` until 2026-10-20 and now writes to
`data/projections/viewer/kinematic/` (the directory the viewer is served
from). The old directory -- `kinematic_studies.json` built 2026-10-17 from
`a_kinematic_study_folds_the_sweeps_jacobian`'s worktree, plus its evidence
SVG -- is still on disk in the main checkout, read by nothing, and will go
stale against every later rebuild of the new location.

It is derived and regenerable, but a worktree session must not reach into the
main checkout's `data/` to tidy it, so it is left for whoever next runs
`scripts/rebuild_projections.ps1` there: once that has written the new
location, delete `data/projections/topology/kinematic/` (and
`data/projections/topology/` if it is then empty).
