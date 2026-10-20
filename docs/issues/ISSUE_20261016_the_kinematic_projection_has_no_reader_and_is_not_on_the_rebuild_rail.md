---
type: feature
priority: med
status: resolved
area: viewer/kinematic
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261016_a_kinematic_study_folds_the_sweeps_jacobian.md
---

# The kinematic projection has no reader, and the rebuild rail does not build it

`scripts/build_kinematic_projection.py` (2026-10-16) writes
`data/projections/topology/kinematic/kinematic_studies.json` plus one evidence
SVG per study. Nothing renders either, by that handoff's scope (no `apps/`
change). Two pieces of work are left:

1. **A viewer surface.** What it needs is listed in
   `docs/sessions/lessons/LESSONS_20261016_a_kinematic_study_folds_the_sweeps_jacobian.md`,
   "What the viewer will need": the envelope (per point `driver_value`,
   `nominal_measure`, `worst_case_*`, `rss_*`), per stop the ranked `rows` with
   `kind` (`term`/`gap`/`zero_sensitivity`, Python's `ROW_KINDS` -- a generated
   vocabulary row in `scripts/js_vocabulary.py`, not a hand copy), the checks
   (already `rounded_check`'s shape, plus `stop`, `limit`, `context_ref`), and
   the sweep provenance. The plot is a static SVG; a frontend may prefer to
   draw it live from the envelope.
2. **`scripts/rebuild_projections.ps1`** runs the topology, results and crops
   builders only. Add the kinematic builder when (1) lands, and the
   `[real]`/freshness machinery (`scripts/projection_freshness.cjs`) along with
   it -- not before, since no tier reads this projection today.

## Resolved 2026-10-20 (handoff `the_viewer_shows_a_kinematic_study`)

Both halves. The reader is `apps/viewer/views/kinematic.js` -- a kinematic
study is a page of the viewer (`topology.html?kinematic=<id>`, and a
**Kinematic studies** section of the nav) -- and the builder now writes to
`data/projections/viewer/kinematic/`, the directory drawing-checker serves as
`/tolstack/data/`. `scripts/rebuild_projections.ps1` builds it, last;
`scripts/projection_freshness.cjs` lists it, so the viewer's `[real]` tier
refuses a kinematic projection whose tracked inputs moved (its gitignored sweep
stays outside that check, as the datasheet pile does for `crops.json`).

