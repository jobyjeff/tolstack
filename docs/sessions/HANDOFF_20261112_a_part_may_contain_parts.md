---
priority: med
depends_on: [the_page_is_a_fixed_layout_and_nothing_scrolls_the_document]
model: opus
hitl: false
---

# HANDOFF 2026-11-12 — a_part_may_contain_parts: an assembly inside a rigid body holds its parts, the tree indents them, and a collapsed assembly row in the grid shows the roll-up of its children

Source: Jeff's note `20261112T114449_f3anmp` (2026-11-12): "Need to decide on how
to handle assembly hierarchy within a rigid body. I think currently we only
allow one level of parts within a rigid body… The right thing to do is probably
to support the hierarchy, it just complicates all of the display logic… for the
grid view we can make the assemblies collapsible elements, and then indent just
the part number column. When collapsed, the remaining line shows the total/sum
for the children, so that the tolerance roll-up still works regardless of
whether the assemblies are expanded or not. The 2d dag elements should also be
expandable (+ button on the group). Maybe view shortcuts that switch between
collapsed… or expanded/flat. Currently the assemblies (215177 and 215175) are
both the assembly level with the bushings included, so we can leave them as
placeholders for now and decompose them later." The strategy session proposed
the shape below (its needs-Jeff 75, recommended); **Jeff has not said no; if he
has by the time this launches, the board will have deferred it.** Strategy
record: `dispatch/docs/strategy/HANDOFF_20261112_strategy.md`.

Baseline: `integration` after `the_page_is_a_fixed_layout_and_nothing_scrolls_the_document`.
Line numbers were read on `master` on 2026-11-12; function names are the
anchors. Scope: `tolerance_stack/topology.py` (the schema),
`tolerance_stack/model_view.py`, `docs/topologies/topology_vpa_end_stop_v2.json`
(the pilot only), `docs/DAG_TOPOLOGY.md`,
`apps/viewer/` (`model.js`, `views/nav.js`, the grid in `views/topology.js`),
tests. Do NOT touch the DAG's drawing (deliverable 5 says what it does instead),
the mesh cache, any mesh's solids, or bindings.

## What exists (read 2026-11-12)

- `Body.parts` is a flat tuple and `Part` has no children
  (`tolerance_stack/topology.py:361-388, 491-509`); every part is in exactly one
  body (`topology.py:1015`).
- Two levels are assumed in `model_view.py:205-224`, `apps/viewer/model.js:146-153`,
  the tree (body → Parts → part → feature, `views/nav.js:341-372, 420-425`), the
  DAG (`bodyOfPart`, `partSpans`, `partPins`, `views/topology.js:3147-3257`;
  `gridPlan`, `:4461`) and the pane's sweep rail (`apps/annotate/app.js:3807-3816`).
- In v2 today: the pitch link assembly and its spherical bearing are siblings
  (`topology_vpa_end_stop_v2.json:60-72`); 212956-005 and its two bearings are
  siblings (`:32-44`); 215177 is one part (`:119-124`) whose mesh is the plate
  plus nine bushings; 215175 is one part (`:94-97`). Bushings are left out on
  purpose (`:712`).

## Deliverables

1. **Schema.** A part may name a `parent` part. Validation: the parent exists,
   is in the same body, and there is no cycle; a part with children is an
   assembly. Depth is not limited by the schema. `docs/DAG_TOPOLOGY.md`,
   "Bodies", says so, with its `claim` block if a count changes.
2. **The model view carries the tree.** `model_view` gives each part `parent`
   and `children`; a body's parts are its top-level parts; everything that
   walks "a body's parts" walks the tree in one stated order (assembly, then
   its children). The browser's model object reads the same.
3. **The left tree** renders parts recursively, indented, an assembly with a
   twisty; selecting an assembly lights it and its children (the highlight
   rule's "own" tier: an assembly contains its parts).
4. **The grid.** An assembly is a collapsible row. Only the part-number column
   is indented. **Collapsed, the assembly's one row shows the roll-up of its
   children** for every numeric column the grid totals, so the stack's total is
   identical with the assembly open or closed. The roll-up is computed through
   the one `fold()` — a path over the children's terms — never by adding
   displayed numbers (ARCHITECTURE.md, "Where computation may live"). Two
   toolbar shortcuts: **Collapse assemblies** (one level of parts per body) and
   **Expand all**. The choice is remembered.
5. **The DAG is left drawing what it draws.** It shows each top-level part of a
   body as today and treats an assembly's children as belonging to the
   assembly's block; the + on a group and the nested outline arrive with the
   map handoff. If a child cannot be drawn inside its parent's block without
   changing the layout, the DAG draws the assembly only and the lesson says so.
   Nothing here may make the DAG worse than it is on `integration` — compare
   shots before and after.
6. **The pilot, on v2, with what already has its own mesh:** the pitch link
   assembly contains its spherical bearing; 212956-005 contains its two
   bearings. The bearing stays in its link's body (the inner ball is not moved
   to the neighbouring body; its tolerances come from the datasheet — Jeff).
   **215177 and 215175 stay single parts**: decomposing them needs their
   bushings as separate solids, which re-keys a mesh and would orphan bindings;
   that is its own handoff. v1 is untouched.

## Definition of done

- On v2 at 3840×2160: the tree with one link assembly open; the grid with
  assemblies collapsed and then expanded, **the same total in both** (state the
  numbers); the DAG before and after, side by side. Shots looked at, in
  `docs/sessions/lessons/shots/<slug>/`.
- The 3D pane and every binding behave as before (open the pane, hover the
  bearing, check a bound face is still marked).
- Tests: value-level — schema validation (missing parent, cross-body parent,
  cycle), the model view's order, roll-up equals the sum of children's folded
  terms for one assembly pinned by id; default `pytest -q` once; the two fast
  node tiers; the browser runner with `--only` for each suite added or changed;
  the witness runner with `--only` for each spec added or changed.
- Lesson (`docs/sessions/lessons/LESSONS_20261112_a_part_may_contain_parts.md`):
  every place that assumed two levels and what it does now; what the map
  handoff must draw for a nested part; what decomposing 215177 and 215175 would
  need, sized.
