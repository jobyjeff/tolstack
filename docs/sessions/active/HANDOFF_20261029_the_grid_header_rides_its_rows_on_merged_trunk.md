---
priority: med
depends_on: []
model: sonnet
hitl: false
---

# HANDOFF 2026-10-29 — the_grid_header_rides_its_rows_on_merged_trunk: the DAG grid's header is held under the page bar again on trunk

Source: triage sweep 2026-10-29 batch merge, from
`docs/issues/ISSUE_20261029_the_grid_header_is_not_held_under_the_page_bar_on_merged_trunk.md`.
Baseline: `master` at `8a2ae880` or later. Scope: `apps/viewer/topology.css`,
`apps/viewer/views/topology.js`, `apps/viewer/topology_app.js`, and the
"the DAG zoom, Fit and the grid header" suite in
`scripts/run_viewer_browser_tests.mjs` only if the guard itself is wrong.

## The gap

`node scripts/run_viewer_browser_tests.mjs --only "the DAG zoom, Fit and the grid header"`
fails two `[real]` sub-checks on trunk, alone and in the full run:
"scrolled down the grid, the header is on screen whenever a grid row is" and
"...and past the grid's first screen it is held under the page bar". The guard
(`8f0e52de`) was green on its own branch and in a later review; something that
landed after it (compact band, right-hand pane, study groups — or the fresh
projection's data) broke the sticky header.

## Deliverables

1. Find the cause (bisect the integration range `8f0e52de..8a2ae880` with the
   suite above after `scripts/rebuild_projections.ps1`, or reason from the
   layout) and name the commit in the lesson.
2. Fix the product so the header is held under the page bar whenever grid rows
   are on screen. **Do not loosen the guard**; if the guard's geometry is
   genuinely wrong for the new layout, say why in the lesson and keep the
   claim it makes.
3. Ask the class question in the lesson: the guard was green on its branch and
   went red after unrelated layout landings with no merge gate catching it.
   Say whether `--changed-since` / the review post-merge browser run should
   have selected it, and route that if so.
4. Resolve the issue (`status: resolved`, pointing here).

## Definition of done

- In the main checkout, after `scripts/rebuild_projections.ps1`:
  `node scripts/run_viewer_browser_tests.mjs` 35/35 (or the known load flakes
  only, each passing alone), and the suite above green alone.
- `PYTHONIOENCODING=utf-8 venv-win/Scripts/python.exe -m pytest -q` no worse
  than baseline.
- `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack --changed-since integration`
  clean for the entries the change reaches.
