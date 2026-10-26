---
priority: high
depends_on: [pitch_system_folds_into_the_pitch_linkage_model]
model: opus
hitl: false
---

# HANDOFF 2026-10-26 — the_kinematic_page_keeps_the_dag_and_says_each_contributor_once: a kinematic study is a lit subset of the one model, and its table names a contributor once with a column per stop

Source: strategy session 2026-10-26, Jeff walking
`topology.html?kinematic=vpa_pitch_linkage_blade_pitch_at_the_stops`:
(a) "the kinematic study doesn't show the DAG view at all, though clicking
individual elements then jumps to separate associated models"; what he wants
is "the full DAG displayed with unused portions of the model dimmed, with the
part actually being included aligned on the right side (we went through this
for the non kinematic study, it should be the same for studies that involve
kinematics)"; (b) on the section heading "contributors at 72° stop": "Why
would it be labeled this if the same features are contributors at all blade
angles?" Baseline: `master` with `pitch_system_folds_into_the_pitch_linkage_model`
merged (one topology; every band the study folds is an edge of it). Scope:
`apps/viewer/` (`views/kinematic.js`, `topology_app.js`, `viewer.js`,
`topology.css`, `README.md`), `scripts/build_kinematic_projection.py`,
`tests/`, `scripts/mutation_witnesses/`. Do NOT touch `apps/annotate/` (the
rail handoff `the_rail_and_the_scene_point_at_each_other` owns it) or
`tolerance_stack/kinematic.py` (`a_contributor_may_be_a_study`, staged, depends
on this one).

## What is true today (measured 2026-10-26, file:line on `master`)

- `apps/viewer/topology_app.js` `render()`: lines 1693–1700 set
  `showTopology = state.mode === "topology"` and hide `nodes.toolbar`,
  `nodes.topojoint`, `nodes.pane` (`#topopane`, the DAG) and `nodes.totals`
  otherwise; line 1708 hides the preview pane `#detail` in kinematic mode
  (comment 1702–1704: "nothing for the preview pane to preview"); 1824–1833
  call only `VA.renderKinematic`, never `VA.renderTopoPane`. So the kinematic
  page is a chart and tables with **no DAG**.
- A contributor row's name is `<a href=VA.viewerLink({topology, edge})>`
  (`views/kinematic.js:673`) whose click runs `onKinematicEdge`
  (`topology_app.js:669–677`) → `selectTopology()` (503–513), which sets
  `state.mode = "topology"` and clears the study. With the 3D pane open,
  `followSelection` (1165–1173) then posts a `goto` — the annotator **leaves
  sweep mode** for bind mode. That is the "jumps to a separate model".
- The page renders **one `section.kmstop` per stop** (`stopSection`,
  632–665; heading `stop.label`, 635), each with its own ranked table of the
  same six contributors. The coefficients genuinely differ per stop
  (`pitch_plate_attach_height` 1.555 deg/mm at −7°, 1.489 at +72°; the gap
  rows 0.311 → 0.487; `tan_link_mount_height` changes sign across the
  sweep), which is why the 10-20 handoff stacked two tables. The
  contributors are the same set at every point; what varies is the
  coefficient. The projection (`data/projections/viewer/kinematic/kinematic_studies.json`)
  carries per-contributor coefficients **only at the stops**
  (`stops[].rows[]`, built by `project_stop`,
  `scripts/build_kinematic_projection.py:150–159`); the per-point data is the
  total envelope (`envelope[]`, 80 points) — the per-contributor curve is in
  the sweep artifact's Jacobian but not projected.
- The chain-study page already does what Jeff asks: the walk is drawn whole,
  chain members get `rail__bar--on`, everything else `rail__bar--off` /
  `rail__dot--off` (`views/topology.js:1345, 1416`; `topology.css:496`,
  opacity .28), and `VA.spineRight` (`topology.js:1811`) mirrors columns so
  the selected chain is the rightmost rail, animated by `VA.animateTopoPane`
  (466).
- Gap rows: `VA.chip("chip--gap", "no band on file", row.bandTitle)`
  (`views/kinematic.js:693–695`); no citation card, no link to what would
  resolve it. The DAG detail pane's "annotate this" link is gated on
  `VA.needsAnnotation(edge.confidence)` (`views/topology.js:2371`) with
  `UNVERIFIED_CONFIDENCES = ("untraced", "no_source_ref")`, and a valueless
  edge has `confidence: null`, so these two edges get neither the link nor a
  gap-list row (`ISSUE_20260930_a_valueless_structural_edge_is_invisible_to_the_gap_list.md`).

## Deliverables

1. **The kinematic page draws the model.** In kinematic mode `#topopane`
   renders the study's topology walk exactly as a chain study does: the
   study's **lit set** is `rail__bar--on`, everything else off, respined so
   the lit set is the right-hand rail. The lit set = the contributor edges ∪
   every edge of a chain a contributor's `dimension_ref` names (after the
   merge, all in this topology; a `study_ref` contributor, when the sibling
   handoff adds it, lights its chain the same way — leave the hook). The
   two gap rows are lit with the gap styling the DAG already has for a
   valueless edge. Layout at 1600×1000 is a design call for you: the
   verdict strip must stay above the fold; a DAG whose walk is long may be
   given a bounded height with its own scroll rather than pushing the
   numbers down. The 3D pane's width clamp (`roomBesideFlyout`) applies as
   on a chain page.
2. **One contributor table.** Replace the per-stop sections with one table:
   a row per contributor, said once; column groups per stop (`−7° stop` /
   `+72° stop`, each with sign, coefficient deg/mm, magnitude deg), then
   band, confidence, 3D. Rows ordered by the larger magnitude across stops.
   Each stop's summary line (nominal, worst case, RSS) sits in the group
   header. The projection gains **per-point coefficients per contributor**
   (`contributors[].by_point[]`: coefficient and magnitude at each of the 80
   sweep points, from the artifact's Jacobian column the builder already
   reads), and a coefficient cell's hover shows that curve as a small inline
   chart against the driver — the sign change of `tan_link_mount_height` is
   then visible instead of being a sentence in a lesson. Three decimals stay
   decided in Python (`display_decimals`). The heading words "contributors
   at the N° stop" no longer appear on this page (the annotator's rail keeps
   its nearest-stop group; not yours).
3. **A row click selects in place.** Clicking a contributor sets
   `state.selection = {kind: "edge", id}` **without** `selectTopology` and
   without leaving kinematic mode; the DAG highlights the edge; the preview
   pane `#detail` returns in kinematic mode and shows that edge's citation
   card and crop (its hidden-in-kinematic rule at 1708 goes). The pane
   follow posts `highlight`, never `goto`: `VA.annotateParamsFor` must keep
   returning the sweep params while an edge is selected on a kinematic page.
   The row's `href` stays the `?topology=…&edge=…` deep link for a new tab.
   The deep-link contract in `apps/viewer/README.md` and its pairing test
   (which mutates a literal count word — the 10-20 lesson) follow.
4. **A gap row says what resolves it.** The `no band on file` chip's card
   names the drawing(s) to read (the edge's parts' `drawing` fields) and,
   where `build_viewer_crops` already knows a drawing-checker run exists for
   that drawing (it reads `C:\workspace\drawing-checker\data\inbox\drawings`
   for citations today), says "drawing on file, not yet read" versus "no
   drawing on file". `VA.needsAnnotation` treats a valueless edge as
   needing annotation, so the detail pane offers the annotator link for it.
   Plain words, no file names on the surface (the UI-copy rules).

5. **Dim or hide the inactive model.** Jeff, 2026-10-26: once the model is
   consolidated the DAG gets large, and the unlit part (pushed to the left by
   the respine) will be crossed by the 2D→3D leaders a later handoff adds —
   so the reader needs to choose between **dimming** and **hiding** the
   edges and nodes outside the current study's lit set. One toggle on the
   topology toolbar, two words, applying to chain and kinematic pages alike;
   hiding re-lays the visible walk (no empty columns left behind, the
   leaders of the grid still land on their rows); the choice is remembered
   like the angled-leader default. Default stays dim. A node a hidden edge
   shares with a lit one stays visible.

## Definition of done

- At 1600×1000 on real data, `topology.html?kinematic=vpa_pitch_linkage_blade_pitch_at_the_stops`
  shows the DAG with the study's lit set right-aligned and the rest dimmed,
  the verdict strip above the fold, one contributor table with two stop
  column groups, the dim/hide toggle switching the unlit walk off and back, a hover curve on a coefficient cell, and a row click that
  keeps the page in kinematic mode with the edge selected in the DAG and the
  citation in the preview pane. With the 3D pane open, that click leaves the
  annotator in sweep mode (read the pane's head line: "Sweep — …").
  Screenshots in `docs/sessions/shots_20261026_kinematic_page_dag/`.
- `node apps/viewer/run_tests.cjs` and `node scripts/run_viewer_browser_tests.mjs`
  green against a projection rebuilt from the committed tree; the TRUTH
  suite `kinematic study page …` updated for the one-table shape; every
  guard added has a mutation spec (`--only` per guard); `pytest -q` green
  (the builder's new field pinned value-level on run P2).
- Lesson (`docs/sessions/lessons/LESSONS_20261026_the_kinematic_page_keeps_the_dag_and_says_each_contributor_once.md`):
  the layout decision and what it cost at 1600 and 1920 wide, the by-point
  projection size, and anything the rail handoff needs to mirror (it shows
  the same contributors).
