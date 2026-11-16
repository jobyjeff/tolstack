---
priority: high
depends_on: [a_suggestion_names_its_face_and_the_mating_side_ranks_the_candidates, the_rebuild_rail_runs_the_fit]
model: opus
hitl: false
---

# HANDOFF 2026-11-15 — a_pattern_is_bound_as_its_like_faces_and_a_face_can_be_added: a hole pattern is offered and bound as all of its holes, a face can be added to a binding, and the tree can show only what is still unbound

Source: Jeff's note `20261115T202853_xrm64b` and a read-only trace the same
evening (`dispatch/docs/strategy/HANDOFF_20261115_strategy.md`); the open
issue `docs/issues/ISSUE_20261113_a_hole_pattern_is_a_feature_of_n_like_faces_and_has_no_fit.md`
(find it by slug if the date differs). Baseline: `master` with the two
handoffs above merged. This is the viewer chain's one slot. Scope:
`apps/annotate/` (`face_geometry.js`, `app.js`), `apps/viewer/views/nav.js`
(the feature body and the tree's filter), `tolerance_stack/feature_geometry.py`
and its JavaScript pair, `scripts/fit_bound_features.py` only as far as the
pattern fit needs, tests, browser suites, `docs/ANNOTATION_SURFACE.md`. Do NOT
touch the DAG's layout or render, the grid, or the model files under
`docs/topologies/`.

**Jeff's real bindings are in `C:\workspace\tolstack\data\inbox\feature-identity\`.
Never write an event there.** Work against a scratch data root holding a copy
of the log; record the real log's event count before and after.

## What Jeff said, and what the code does (lines as of `86576d72`; search by name)

> "noticed the hole pattern only allowed one surface selection (technically
> half of a cylinder). I don't think we've built that (multi-surface select)
> but it is on the todo list. For suggested surfaces, could pre-select/select
> all cylindrical features that are equal in size, and located axially on the
> same plane (or nearly the same plane)."

- One armed click binds and disarms (`armedClick`, `apps/annotate/app.js:3355`;
  `bindArmedFaces`, `:3400`; the disarm at `:3423`). No modifier key is read
  anywhere in `apps/annotate`.
- A set of faces comes only from `AA.surfaceSiblings`
  (`apps/annotate/face_geometry.js:993`): faces of the same surface that touch
  are swept in silently; same surface but not touching are offered as a group
  ("Take all N / Just this one").
- "Same surface" (`AA.sameSurface`, `face_geometry.js:927`; Python
  `feature_geometry.same_surface`, `:1397`) requires coaxial at equal radius,
  so the holes of a pattern are refused by design (comment at
  `feature_geometry.py:1354`).
- A CAD cylinder is two half-faces in the face table. Jeff's 11-15 event for
  the fastener pattern took faces 744 + 743: one whole Ø5.5 hole (r 2.75,
  axis Z), both halves — the sweep worked; what is missing is the other holes.
- The event schema already carries N faces of one mesh
  (`tolerance_stack/feature_identity.py:461-473`). `fit_face_set`
  (`feature_geometry.py:1432`) would fit a pattern as one bad cylinder.
- The tree's feature body has Remove per face (`drop-face`, `app.js:3167`) and
  no add; Correct replaces the whole set.

## Deliverables

1. **A pattern is a third kind of sibling, offered pre-selected.** Add a tier
   to `AA.surfaceSiblings` and its Python pair: faces of the same class and
   radius, axes parallel, not coaxial, whose axis points lie on one plane
   normal to the axis (Jeff: "nearly the same plane"). When a picked face has
   pattern siblings the existing group bar offers them with all holes lit and
   selected: "Take all N holes / Just this one". Each hole in the offer is a
   whole hole (both halves, by the existing sweep). The radius, parallelism
   and coplanarity tolerances are measured on the real meshes — for the 744 /
   743 pattern and at least two other patterns in v2's parts, tabulate the
   true members and the nearest non-member — and the table goes in the
   lesson. A pattern suggestion from item 2 of the previous handoff (the mate
   of a bound pattern) offers the whole pattern too.

2. **A face can be added to a binding.** With a bound feature selected, an
   **Add a face** action in its body arms a pick that adds to the set rather
   than replacing it, and while any pick is armed a Shift-click adds the
   clicked face (with its same-surface siblings) and keeps the pick armed;
   a plain click binds and disarms as now. The gesture goes in the one
   gesture table (`docs/ANNOTATION_SURFACE.md`, "Picking a face — the
   gestures"). Adding writes one event carrying the whole new set, the same
   way Remove does; do not invent a second event shape.

3. **A pattern has a fit that says what it is.** `fit_face_set` recognises a
   pattern set and returns, instead of one cylinder: the hole count, the hole
   radius, the common axis direction, and — when the hole centres lie on a
   circle — the circle's centre and radius; when they do not, the centres and
   the words "not on a circle". The feature's body in the tree and the
   Preview print it in one line ("6 holes Ø5.5 on a Ø96 circle", numbers from
   the fit). `scripts/fit_bound_features.py` writes it through the rail that
   `the_rebuild_rail_runs_the_fit` put in place. A fitted nominal is a
   measurement of a mesh, never a tolerance (`CLAUDE.md`). The issue named in
   Source is resolved by this item; say so in its frontmatter.

4. **The tree can show only what is unbound.** One control on the left
   column's Parts section, "All · Unbound", hides features that are bound and
   parts whose features are all bound; the count beside it is the number of
   unbound features in the model (v2 had 53 proposals open on 11-12). It is
   the walk's row 34 ("bound/unbound filter — none"). The control's state is
   the page's, not the model's: it filters the tree only and changes no
   selection, no light and no other surface.

Sites: the pane's group bar (1), the tree's feature body (2, 3), the Preview
(3), the gesture table (2). Left alone, in writing: the grid and the DAG show
nothing about a pattern's fit; the offline proposal script does not propose
patterns.

## Definition of done

- Scratch root, real log copied: clicking face 744 offers the whole pattern;
  the lesson states N as counted from the mesh and shows the lit offer; Take
  all binds N × 2 half-faces in one event; the fit line reads back N, Ø5.5
  and the circle (or "not on a circle").
- A two-face feature built with Add a face and with Shift-click, each shown
  bound; Remove still works on either face.
- "Unbound" on the real projection: the count equals the fold's count of
  unbound features, and binding one on the scratch root drops it by one.
- Browser suites for the pattern offer, Add a face, Shift-click and the
  filter; fast-tier and pytest value tests for the sibling tier and the
  pattern fit, the JavaScript and Python halves paired on the same faces.
  Each new guard carries its mutation spec.
- Exploratory click-around on the real projection, read with vision, at
  3840×2160 and 5120×2160, before the checks.
- Lesson (`docs/sessions/lessons/LESSONS_20261115_a_pattern_is_bound_as_its_like_faces_and_a_face_can_be_added.md`):
  the tolerance table; every pattern the tier finds in v2's parts, by part
  and count, and any it wrongly joins or splits; the real log's event count
  before and after.
