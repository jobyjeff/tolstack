---
priority: med
depends_on: [the_model_is_drawn_in_the_scene, the_dag_draws_bodies_as_containers_and_joints_as_symbols]
model: opus
hitl: false
---

# HANDOFF 2026-10-26 — leaders_follow_the_active_study_across_the_seam: the shell draws leaders from the 2D DAG to the 3D anchors for the lit set only, and a selected element lights its 2D, 3D and grid leaders together

Source: `dispatch/docs/strategy/HANDOFF_20261026_one_graph_drawn_twice_strategy.md`
(locked brief; Jeff's answer 2 and his mid-session rule): "If every single
element in the model were connected it would probably be way too busy to
interpret, however it would be much more manageable/useful if just the
active study had the leader lines, and if you selected a single element, if
the leaders for that element were somehow highlighted. That way if you
selected a single element in 2d or 3d, you could quickly trace its 2d and
3d representation, as well as the line of the tolerance rollup (grid view)
associated with it." Decision taken: the DAG and the grid stay in the shell;
the scene exports anchors; **the shell draws every leader.** Baseline:
`master` with `the_model_is_drawn_in_the_scene` (the `annotate:anchors`
message) and `the_dag_draws_bodies_as_containers_and_joints_as_symbols`
(container geometry, collapsed anchors) merged. Scope: `apps/viewer/`
(`topology_app.js`, `topology.js`'s leader geometry, `views/topology.js`,
`topology.css`), `docs/`, `tests/`, mutation specs. Do NOT touch
`apps/annotate/` beyond consuming its message, or the DAG layout.

## What is true today

- The DAG↔grid leaders exist: `VA.leaderGeometry` (`topology.js:2368`) and
  `VA.gridPlan` (2271) draw a leader from a DAG node to its grid row at part
  boundaries, with the angled-leader default and the shared DAG↔grid hover
  (2026-09-30). Leaders cross each other on some layouts
  (`BRIEF_20260914_dag_layout_geometry_tradeoffs.md`, item 1, still open).
- After the scene handoff the embedded iframe posts `annotate:anchors` with
  each node's and edge's screen position in the iframe's own CSS pixels;
  the shell knows the iframe's bounding rect.
- The kinematic page's dim-or-hide toggle exists; the inactive part of the
  model, respined to the left, is what 3D leaders would otherwise cross.

## Deliverables

1. **One overlay, every leader.** A single page-level SVG overlay in the
   shell draws the DAG↔grid leaders (moved from their current home, same
   geometry, pinned) **and** the DAG↔3D leaders: from a DAG node (or a
   collapsed body's anchor) to the scene's reported anchor, offset by the
   iframe's measured rect, re-drawn on every `annotate:anchors` message and
   on resize/scroll (one `ResizeObserver`, one measurement). A node whose
   anchor is `null` (off-screen or no geometry) gets no leader and no
   stub.
2. **Scoped to the lit set.** 3D leaders are drawn only for nodes of the
   active study's lit set (chain or kinematic). With the toggle at *dim*
   the inactive DAG is crossed by them at reduced opacity and the leaders
   are drawn above it; with *hide* nothing is crossed. No leader for an
   inactive node, ever.
3. **Selection lights a triple.** Selecting an element anywhere — a DAG
   node or edge, a grid row, or a pick in the scene (the rail handoff's
   `select` coupling) — highlights that element's leaders in the accent
   (2D↔grid and 2D↔3D) and dims the others, and scrolls the grid row into
   view; hover does the lighter emphasis. The scene highlights its anchor
   and line through the existing `highlight` command. One selection, three
   representations, all from `state.selection`.
4. **Leaders don't tangle with the seam.** A leader leaving the DAG toward
   the scene exits the DAG's left rail region and runs to the seam with at
   most one bend (the angled-leader rule), never through a lit edge bar;
   where the lit set's anchors cluster, leaders fan from a shared ordinate.
   Measure crossings among 3D leaders on the merged model's kinematic study
   and record them.

## Definition of done

- At 1600×1000 in the shell on run P2 with the kinematic study open and
  the scene posting anchors: six to ten 3D leaders (the lit set), none for
  the dimmed model; clicking a contributor row lights its 2D↔grid and
  2D↔3D leaders and the scene's line; picking that part's face in the
  scene produces the same state; switching the toggle to hide removes the
  crossed region. Screenshots in `docs/sessions/shots_20261026_leaders_across_the_seam/`,
  including one with a selection.
- The existing DAG↔grid leader geometry is pinned before the move and
  equal after; browser suites green; a TRUTH check feeds a synthetic
  `annotate:anchors` message and asserts leader endpoints; mutation spec
  per guard.
- Lesson (`docs/sessions/lessons/LESSONS_20261026_leaders_follow_the_active_study_across_the_seam.md`):
  the crossing counts, the re-draw cost per anchors message, and whether
  the open leader-crossing item of the 09-14 layout brief is now worth a
  handoff of its own.
