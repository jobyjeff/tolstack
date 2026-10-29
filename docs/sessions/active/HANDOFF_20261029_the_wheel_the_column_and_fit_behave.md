---
priority: high
depends_on: [the_grid_header_rides_its_rows_on_merged_trunk]
model: sonnet
hitl: false
---

# HANDOFF 2026-10-29 — the_wheel_the_column_and_fit_behave: the wheel never scrolls the page, the COMPONENT column is never under the DAG, and Fit fits both axes — with the grid still scaling alongside the DAG for now

Source: the 2026-10-29 strategy session (`dispatch/docs/strategy/HANDOFF_20261029_strategy.md`),
re-cutting `the_dag_zoom_leaves_the_grid_and_the_page_alone` after its agent
stopped without code: zooming the DAG alone cannot be done without the leader
code that handoff fenced off (one `.tv__zoom` transform covers the column
header, the DAG's SVG and the grid rows — `apps/viewer/views/topology.js`
~418–480 — and the in-SVG leaders end at y positions the DAG and the grid
share). Its issue, `docs/issues/ISSUE_20261029_dag_only_zoom_needs_leaders_that_bridge_two_scales.md`
(on that handoff's branch until it is completed), names three fixes that do
not depend on that decision; **this handoff is those three.** The DAG-only
zoom itself moved into `a_leader_starts_at_the_mark_it_names_on_every_tier`,
which owns the leader code. Baseline: `master` with the grid-header fix
landed. Scope: `apps/viewer/views/topology.js` (wheel handler, Fit, the
column layout), `apps/viewer/topology_app.js`, `apps/viewer/topology.css`,
`apps/viewer/tests.js`, `scripts/run_viewer_browser_tests.mjs` (the zoom/Fit
suite). Do NOT touch leader drawing or `__lastAnchors`, `#detail`,
`kinematic.js`, or the shared `.tv__zoom` root (the grid keeps scaling with
the DAG until the leader handoff splits them).

## Deliverables

1. **The wheel never scrolls the page.** A wheel over the DAG box zooms (as
   today) and `preventDefault`s; `scrollY` is unchanged across any zoom.
   Over the grid, the wheel scrolls the grid's rows only.
2. **The COMPONENT column is never under the DAG.** At every zoom the DAG's
   box ends where the grid begins; on Jeff's first screenshot
   (`C:\workspace\forge\data\inbox\atomic-notes\attachments\20261029T120929_5ysvll\paste-20261029T120915.png`)
   the DAG's right rail covers the column at default zoom. The grid's
   columns (COMPONENT · # · ELEMENT · NOMINAL · MIN · MAX · CONTRIBUTION ·
   SOURCING) fit the frame at 1600×1000 on the product model; COMPONENT
   truncates with a tooltip when the pane is narrow.
3. **Fit fits both axes.** The toolbar Fit (`views/topology.js` ~line 94)
   fits the lit layout (the active band, or the whole walk) into the DAG's
   box in both axes without moving the page; if the page jumped because the
   box height changed, pin the box height first. The lesson says why it
   jumped.

## Definition of done

- `scripts/rebuild_projections.ps1`; the zoom/Fit browser suite gains:
  `scrollY` unchanged across a zoom; COMPONENT's left edge ≥ the DAG box's
  right edge at zoom 1 and at the Fit zoom; Fit's bbox inside the box in
  both axes. `node scripts/run_viewer_browser_tests.mjs`,
  `node apps/viewer/run_tests.cjs`, `PYTHONIOENCODING=utf-8
  venv-win/Scripts/python.exe -m pytest -q` green; witnesses `--changed-since
  integration` clean.
- Before/after screenshots at 1600×1000 on
  `vpa_pitch_linkage_blade_pitch_at_the_stops`.
- Lesson: the cause of the page jump and of the column overlap.
