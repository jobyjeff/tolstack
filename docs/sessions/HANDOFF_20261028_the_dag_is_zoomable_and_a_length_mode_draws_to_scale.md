---
priority: high
depends_on: [the_lit_set_closes_over_its_joints]
model: sonnet
hitl: false
---

# HANDOFF 2026-10-28 — the_dag_is_zoomable_and_a_length_mode_draws_to_scale: wheel zoom + "fit", the Lengths modes stop collapsing on the 169-row model, the grid header rides with its rows

Source: Jeff's 2026-10-28 review ("Lengths select appears to be broken";
"make the 2d dag zoom-able and give a 'fit' shortcut"; "column headers …
pinned to the top of the pane, so it scrolls out of view"). Traced the same
day. Baseline: `master` with `the_lit_set_closes_over_its_joints` merged.
Scope: `apps/viewer/topology.js` (`fitEdgeLength` ~:1284, `rowPositions`
~:1426 and its `collapsed` rule ~:1469, `EDGE_LENGTH_MODES` ~:1133),
`apps/viewer/views/topology.js` (`paneBudget` ~:634, `header()` ~:929–958,
`renderTopoPane` ~:367–410, the SVG sizing ~:1278–1284, the toolbar
~:77–86), `apps/viewer/topology.css`, `apps/viewer/tests.js`, the browser
specs named below. Do NOT touch the lit-set code, `apps/views/kinematic.js`'s
chart, or `apps/annotate/`. Do not re-column or re-row the walk — the
rearrange handoff (`the_active_study_is_a_compact_band…`, staged, depends on
this) owns that.

## What is actually wrong

1. **Lengths is not dead; it is floored.** `VA.fitEdgeLength` returns the
   one-row floor whenever the pane budget is no more than node rows + one
   row per edge, and `rowPositions` then sets `collapsed = maxLen <= floor`
   and floors every bar — uniform and both scaled modes draw identically
   except for break marks and the "not to scale" note. The budget
   (`paneBudget`) is the window height, or the kinematic page's bounded box
   (`topology.css:1445`, `max-height: 50vh` ≈ 462 px at 1000 px). The merged
   walk's minimum height is 169 × 26 = 4394 px (comfortable) / 2704 px
   (compact), so it collapses at every window size. Filed 2026-09-14 as
   `docs/issues/ISSUE_20260914_scaled_length_modes_collapse_on_a_tall_dag.md`
   (triaged, `audience: strategy`); the workaround then was compact density
   on the 45-row `pitch_system`, which the 2026-10-26 fold into one 169-row
   model removed. The browser check at `scripts/run_viewer_browser_tests.mjs:3230–3270`
   pins `realTol.floored === realTol.edges` — the collapse is currently the
   *expected* result.
2. **No zoom.** The SVG `viewBox` is `0 0 width height` in pixels; no
   wheel/transform code exists for the DAG. The crop lightbox already has a
   one-transform zoom/pan/fit (`apps/viewer/views/lightbox.js:172–202`,
   `VA.LIGHTBOX_ZOOM`, `VA.lightboxTransform`, `tests.js:3578`).
3. **The grid header is sticky to a box that never scrolls.** `header()`
   builds `div.tv__head` as the first child of `.tv__hscroll` (overflow-x
   only, `height: max-content`), above the whole DAG drawing; `position:
   sticky; top: 0` is inert vertically. Rows start at
   `positions.gridOffset` (~1300 px down on the 106-row model); the bounded
   kinematic pane even scrolls the header out on load (`root.scrollTop =
   gridOffset - headHeight`, ~:406–410).

## Deliverables

1. **A length mode draws to scale and the window is no longer the budget.**
   When the mode is `tolerance width` or `feature size`, bars are
   proportional (today's `edgeLengthValue`), the walk takes the height it
   needs, and the viewer *fits* it (deliverable 2) instead of flooring it.
   `uniform` keeps one row per edge. Keep the "not to scale" note only for a
   bar that had to be clamped at a minimum legible length (name the floor
   in px; it is a legibility rule, not a budget). Rewrite the ~:3230–3270
   browser check to assert `floored < edges` on the real model in a scaled
   mode, and `tests.js` ~:6952/6978/7365/8204/11135/11165 to the new rule.
   Resolve `ISSUE_20260914_scaled_length_modes_collapse_on_a_tall_dag.md`
   on merge (status + one line).
2. **Wheel zoom, drag pan, and a "Fit" button.** One CSS transform on the
   DAG's drawing container (rails SVG + rows + body fields together, so
   nothing shears), wheel zooms about the pointer, drag on empty space pans,
   bounded range (reuse the lightbox's `{min, max, step}` shape — pick the
   min so the whole 169-row walk fits a 900 px-high pane), a **Fit** control
   in the toolbar beside Rows/Lengths that fits the *lit* set when a study is
   selected and the whole walk otherwise; keyboard `0` = fit. Leaders to the
   scene and to the grid (`drawSeamLeaders`, the grid leaders) are recomputed
   from the transformed anchors — they already use ids, not cached pixels
   (`LESSONS_20260910_viewer_leader_line_grid.md`). Zoom level is per page
   state, not stored.
3. **The header rides with the grid.** Move `div.tv__head` out of
   `.tv__hscroll` into the grid's own scroll container positioned at the
   first grid row (the `gridOffset` band), sticky to *that* container's top,
   and keep its left padding equal to the rails' width (tests ~:6442,
   7912–7915, 7156–7171). The respine ghost tests (~:8051, 8092) and the
   leader clipping at `head.bottom` (~:10620–10625) must still hold.

Design rules: `docs/DESIGN_TYPE_AND_COLOUR.md`; the Fit button is a toolbar
item in the existing style, no icon font.

## Definition of done

- Real kinematic page: Lengths → tolerance width visibly changes bar lengths
  (assert ≥ 3 distinct bar heights); Fit brings the lit set into view at
  one step; wheel zoom in/out and pan work; header visible whenever any grid
  row is on screen.
- Every stack page: same three facts.
- `node apps/viewer/run_tests.cjs`, `node scripts/run_viewer_browser_tests.mjs`,
  `node scripts/run_mutation_witness_tests.mjs --changed-since master`,
  `pytest -q` — main checkout, projections rebuilt first.
- Lesson (`docs/sessions/lessons/LESSONS_20261028_the_dag_is_zoomable_and_a_length_mode_draws_to_scale.md`):
  the zoom bounds chosen and why; the minimum legible bar length; the
  walk's height per mode on the real model; what the rearrange handoff must
  know about the transform (anchor space for leaders).
