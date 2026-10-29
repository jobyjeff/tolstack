# Lessons 2026-10-29 — the_dag_zoom_leaves_the_grid_and_the_page_alone

Stopped before writing code. No product change on this branch.

- The grid zooms because `renderTopoPane` (views/topology.js ~418-480) puts head,
  rails SVG and grid rows under one `.tv__zoom` transform.
- Splitting them breaks the in-SVG leaders, which end at seam y values shared
  with the grid rows. The handoff fences the leader code off.
- Filed `docs/issues/ISSUE_20261029_dag_only_zoom_needs_leaders_that_bridge_two_scales.md`
  with three options and a recommendation (`audience: strategy`).
- Not run: the full test suite, rebuilt projections and screenshots, since
  nothing changed.
