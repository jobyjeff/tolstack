---
priority: high
depends_on: [the_kinematic_page_keeps_the_dag_and_says_each_contributor_once, the_rail_and_the_scene_point_at_each_other]
model: opus
hitl: false
---

# HANDOFF 2026-10-26 — the_shell_seats_the_scene_beside_the_model: nav on the far left, the 3D scene beside it, the DAG and grid on the right, one background and no seam; the mechanism tree nests under the study row

Source: `dispatch/docs/strategy/HANDOFF_20261026_one_graph_drawn_twice_strategy.md`
(locked brief), from Jeff's walkthrough of 2026-10-26: "Consolidate into a
single canvas that contains the 3d viewer and the DAG view, with the dag on
the right side of the canvas. This could potentially be faked by using two
separate canvases with the same background color and no border between
them … The study select (the left side menu in the 2d tolstack viewer) then
moves all the way to the left side, even when the 3d view is active … All
the elements of the 3d structure view could actually just be nested inside
of the 'blade pitch at end stops' node of the original tolstack menu."
Baseline: `master` with the kinematic-page handoff (DAG on kinematic pages,
dim/hide) and the rail handoff (hover/pick coupling, per-body hide, type
chips) merged. Scope: `apps/viewer/` (`topology.html`, `topology.css`,
`topology_app.js`, `viewer.js`, nav rendering) and `apps/annotate/`
**embedded-mode behaviour only** (hide its rail, honour an `embedded` launch
param, answer the shell's tree queries), `docs/`, `tests/`, mutation specs.
Do NOT touch the DAG renderer's layout (`the_dag_draws_bodies_as_containers…`)
or scene geometry (`the_model_is_drawn_in_the_scene`).

## What is true today (measured 2026-10-26)

- `apps/viewer/topology.html` lays out, left to right: the 3D pane, a
  non-modal `<dialog id="annotate-flyout">` docked at the left edge
  (`topology.css:978–986`, `position: fixed; inset: 0 auto 0 0`; the page
  shifts right by `margin-left: var(--flyout-width)`, 1060–1062); the nav
  `<nav id="navtree">` (visible beside the pane since 2026-10-20,
  1051–1054); `.tv__main` (toolbar, joint block, `#topopane`, `#stackview`,
  `#kinematicview`, `#totals`); the divider and the right-hand
  `<aside id="detail">` preview pane. So the order is **pane | nav | DAG |
  preview**, and on a chain-study page at 1600 wide with the pane at its
  560 px floor the DAG + grid get about 170 px
  (`docs/issues/ISSUE_20261020_with_the_3d_pane_open_a_chain_study_page_leaves_the_dag_a_narrow_strip.md`).
- The pane is an `<iframe class="flyout__frame">` created lazily by
  `drivePane` (`topology_app.js:1230–1257`), driven by
  `postMessage({type: "annotate:exec", command})` (1261–1266); the annotator
  posts `annotate:state` back (1297–1306) and hover crosses as `highlight`
  (1308–1359). Same-origin only. Its remembered width is `flyoutWanted`,
  clamped per page by `refitPane`.
- The annotator's own rail (bodies → joints → parts in sweep mode, the bind
  rail otherwise) renders inside the iframe, so with the pane open the page
  has **two left-hand menus**.

## Decisions (locked in the brief)

- Order becomes **nav | scene | DAG + grid**. The preview pane **stands
  down while the scene is open on a topology page** (the issue's option 1:
  the scene's own detail and the hover card answer for the edge); it
  returns when the scene is closed. The scene is a page column, not a
  dialog: same background token as the page, no border at either seam, the
  divider between scene and DAG draggable as today.
- **The mechanism tree nests under the study row in the shell's nav.** In
  embedded mode the annotator hides its rail and command box (the scene,
  its sweep bar and its tooltips stay), and the shell renders, under the
  active study's nav row, the same tree the rail shows — bodies → joints →
  features/parts, plus the study's contributors — from the topology
  projection's `bodies[]`, the kinematic projection, and the sweep run's
  joints (fetched by the shell from `../data/` the way the annotator reads
  them, or asked of the pane by one query message, your call — one source
  of the tree, not two renderings of two reads). Hover and pick coupling
  work exactly as the rail handoff built them, through the existing
  message channel (`highlight`, `inspect`, `select`); the type-filter chips
  move with the tree. The standalone annotator page keeps its rail
  unchanged (the TRUTH suites and the bind-rail snapshot depend on it).

## Deliverables

1. **The layout**: the three columns, the preview-pane rule, the shared
   background, remembered widths that each page fits (the pane lesson's
   `flyoutWanted` rule). The DAG's right-rail alignment is unaffected; at
   1600 wide with the scene at its floor the DAG + grid get **at least as
   much room as today's chain page without the pane**, measured and pinned.
2. **Embedded mode in the annotator**: an `embedded=1` launch param (set by
   the shell only) hides the rail and command box and answers a
   `annotate:tree` query with the mechanism tree data if you take that
   route; nothing else in the annotator changes.
3. **The nested tree in the nav**: under the active study row (kinematic or
   chain — a chain study's tree is its body's parts and elements, the LOD
   expansion of one body), collapsible, with the type chips; keyboard
   reachable (the sweep rail's keyboard issue
   `ISSUE_20261021_design_the_sweep_rails_repick_and_contributor_rows_cannot_be_reached_by_keyboard.md`
   is closed here for the shell's copy).
4. **Head line and state**: the pane's head line ("Sweep — …", "Bind — …")
   becomes the scene column's header; opening a study drives the scene as
   today.

## Definition of done

- At 1600×1000 on real data, `topology.html?kinematic=vpa_pitch_linkage_blade_pitch_at_the_stops`
  with the scene open shows nav | scene | DAG + table, no visible seam, no
  preview pane, the mechanism tree expanded under the study row with
  hover/pick coupling into the scene working from the nav; a chain study
  page shows the same order with the DAG + grid at or above today's
  no-pane width. Screenshots at 1600 and 1920 in
  `docs/sessions/shots_20261026_shell_seats_the_scene/`.
- Browser suites green (`3D pane follows the selection …` updated to the
  new order; `annotate sweep rail …` unchanged on the standalone page);
  `node apps/annotate/run_tests.cjs` green with the bind-rail snapshot
  unchanged; mutation spec per guard; `pytest -q` green.
- Lesson (`docs/sessions/lessons/LESSONS_20261026_the_shell_seats_the_scene_beside_the_model.md`):
  which route the tree data took (shell reads vs pane query) and why, the
  widths measured, and the message vocabulary after this change (the pane
  lesson's table, extended) — the leaders handoff adds one more message
  type to it.
