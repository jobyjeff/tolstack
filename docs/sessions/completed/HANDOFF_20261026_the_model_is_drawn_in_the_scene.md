---
priority: high
depends_on: [the_shell_seats_the_scene_beside_the_model]
model: opus
hitl: false
---

# HANDOFF 2026-10-26 — the_model_is_drawn_in_the_scene: every node has a 3D anchor, every edge a line, bodies' internals ride the sweep, and a ring anchors on its +X side

Source: `dispatch/docs/strategy/HANDOFF_20261026_one_graph_drawn_twice_strategy.md`
(locked brief), from Jeff's walkthrough of 2026-10-26: "Create a 3d
representation of the DAG in the 3d viewer, with lines connecting the
surfaces together. This is already partially implemented for the kinematic
links (pitch link and tangential link), let's add it for all components of
that model. Since some of the bodies are big hollow rings (such as the tan
link mount), simply centering the lines with the center of mass of the
footprints probably won't be intuitive, so we may need to bias them all in
a consistent direction, such as +X. For example for the tan link mount you
could take a cross section of the body with the X, Z direction, since X is
the bias direction and Z is the linear stack direction, and then align the
DAG line with center of the +X most intersection (there's one at +x and -x
because it's an intersection with a ring)." Baseline: `master` with
`the_shell_seats_the_scene_beside_the_model` merged (and, through it, the
merged topology with `bodies[]`, the rail coupling and the kinematic page).
Scope: `apps/annotate/` (a new scene-graph module for the 3D DAG, `scene.js`
layers, `sweep.js` body frames), `tolerance_stack/feature_geometry.py` /
`scripts/fit_bound_features.py` only if an anchor needs a fitted value the
projection does not already carry, `docs/ANNOTATION_SURFACE.md`, `tests/`,
mutation specs. Do NOT touch `apps/viewer/` (the leaders handoff draws in
the shell) or the topology documents.

## What is true today (measured 2026-10-26)

- Sweep mode draws a **stick figure** of the mechanism: joint beads and the
  two-force links (`pitch_link`, `tan_link`) as lines between their sphere
  centres, with the STEP bodies anchored to the solver's rigid bodies and
  posed per frame (`LESSONS_20261001_kinematic_sweep_animation.md`;
  `AA.sweepBodyJoints`; layers stick / bodies / trail / ghost). Nothing is
  drawn for a within-body edge (the hub's spindle axis to its blade-1 root
  bore, the plate's spindle bore to its link-attach bore, the mount's base
  face to its bore).
- Where a feature is: a committed binding becomes a **fitted nominal** — a
  sphere centre, a bore axis (a point on the axis at mid-length) — in the
  part's frame and per occurrence (`scripts/fit_bound_features.py`,
  `tolerance_stack/feature_geometry.py`, `data/projections/feature-geometry/fits.json`;
  `built_from_events: 0` today, since no binding exists; Jeff's binding
  sitting follows the superseded-binding handoff). The annotator applies
  the same placements to draw (`docs/ANNOTATION_SURFACE.md`, "Where a part
  is drawn").
- Mesh manifests carry per-face `solid_id` and face geometry classes
  (`manifest.json` per mesh under `C:\workspace\tolstack\data\meshes\<sha>\`);
  the suggestion colouring already classifies faces as round / flat /
  ball-shaped.

## Deliverables

1. **One anchor per node.** A node's 3D anchor is, in order: (a) its bound
   face's fitted feature point when a binding exists (sphere centre; a
   bore's axis midpoint; a plane's face centroid — add the plane case to
   `feature_geometry` if it is not there); (b) otherwise the **+X-bias
   section centre of the node's part**: intersect the part's mesh (at the
   occurrence the body anchors) with the plane through the body's frame
   origin spanned by X and Z, take the +X-most connected intersection
   region, and anchor at its centroid, lifted to the node's Z where the
   node's edge is a Z-dimension (so a linear stack reads as a vertical
   ladder on the +X side); (c) otherwise the body's own frame origin, and
   the surface says "no anchor geometry" for that node. The bias direction
   and stack direction are **per topology, authored** (`anchor_bias: {bias:
   "+x", stack: "z"}` on the topology document, defaulting to Jeff's
   values), not hard-coded, and the chosen plane and intersection are
   drawn faintly when a node is selected so a reader can see why a line
   lands where it does.
2. **One line per edge, in the right frame.** A structural (within-body)
   edge is a line between its two anchors **in the body's frame**, so it
   rides the sweep with the body; a gap (joint) edge is a line between the
   two bodies' anchors in world, recomputed per frame (the pitch link and
   tan link already are; they become ordinary edges of this layer rather
   than a special case — keep their exact current geometry as the
   regression check). The 3D DAG is a layer (`model`) beside stick / bodies
   / trail / ghost, on by default in sweep mode, available in bind mode at
   the as-modelled pose.
3. **The lit set rules the layer.** Edges in the active study's lit set are
   drawn at full strength; the rest follow the shell's dim-or-hide choice
   (the shell posts it as a command; default dim). Glyphs are not drawn in
   3D (the 2D DAG has them); a node dot at each anchor, a body's name at its
   +X-bias anchor when the body is selected.
4. **Anchors are exported.** Every frame in which the camera or the sweep
   pose changed, the embedded scene posts `{type: "annotate:anchors",
   nodes: {<node id>: [x, y] | null}, edges: {<edge id>: [[x,y],[x,y]]}}`
   in CSS pixels of the iframe's viewport, debounced to the frame rate — the
   leaders handoff draws from it in the shell. Document the message in
   `docs/ANNOTATION_SURFACE.md`'s message table.

## Definition of done

- On run P2 in the shell, every node of the merged model has an anchor and
  every edge a line; the hub's internals sit on the hub's +X side as a
  ladder, the tan-link mount's bore anchors on its +X intersection (not at
  the ring's centre), the pitch link and tan link lines are byte-identical
  to today's stick figure geometry (pinned), and the lines ride the sweep.
  With zero bindings the layer is built entirely from (b); with the TRUTH
  suite's synthetic binding one node moves to (a) and the test asserts it.
  Screenshots at two sweep frames and one bind-mode frame in
  `docs/sessions/shots_20261026_model_in_the_scene/`.
- `node apps/annotate/run_tests.cjs` and `run_browser_check.mjs` green;
  the anchors message observed in a browser check; frame rate measured
  before and after on the placed linkage (the 4 fps headless floor noted
  in `ISSUE_20261014_sweep_modes_frame_rate_figure…`); mutation spec per
  guard; `pytest -q` green if `feature_geometry` changed.
- Lesson (`docs/sessions/lessons/LESSONS_20261026_the_model_is_drawn_in_the_scene.md`):
  which nodes fell to (b) and (c) and why, the section-plane choice per
  body, the per-frame cost, and the exact anchors message shape the
  leaders handoff reads.
