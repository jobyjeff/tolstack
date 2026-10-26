---
priority: high
depends_on: [a_contributor_may_be_a_study]
model: opus
hitl: false
---

# HANDOFF 2026-10-26 — the_dag_draws_bodies_as_containers_and_joints_as_symbols: a rigid body is a collapsible container, a sub-stack is a container inside it, and a joint is drawn as the kind of contact it is

Source: `dispatch/docs/strategy/HANDOFF_20261026_one_graph_drawn_twice_strategy.md`
(locked brief; Jeff's answers 1 and 3), from his walkthrough of 2026-10-26:
"it should be clear which nodes/elements lie in a sub-stack … a container
around them and/or making them collapsible … Joint types should be shown
with different icons … an interface between two flat parts … two parallel
lines similar to a capacitor symbol … kinematic joints … 'ball joint'
symbols … Form tolerances … a horizontal squiggly line". Baseline: `master`
with `pitch_system_folds_into_the_pitch_linkage_model` (the topology has
`bodies[]`), `the_kinematic_page_keeps_the_dag_and_says_each_contributor_once`
(lit set, dim/hide toggle) and `a_contributor_may_be_a_study` (`study_ref`)
merged. Scope: `tolerance_stack/topology.py` (the `interface` vocabulary and
the form rule), `scripts/build_topology_projection.py` (layout of
containers), `scripts/js_vocabulary.py` + the generated `apps/viewer/vocab.gen.js`,
`apps/viewer/topology.js`, `views/topology.js`, `topology.css`,
`docs/DAG_TOPOLOGY.md`, `docs/SOP_TOLERANCE_STACK.md` (the authoring step),
`docs/topologies/topology_vpa_pitch_linkage.json` (author `interface` on its
gap edges), `tests/`, mutation specs. Do NOT touch `apps/annotate/`
(`the_shell_seats_the_scene_beside_the_model` and its successors own it) or
the kinematic page's table.

## What is true today (measured 2026-10-26, before the merge handoff)

- Layout is computed in Python: `serialize_topology` (`build_topology_projection.py:671`)
  walks the graph into rows and columns, `order_columns` (616) permutes
  columns to minimise `layout_crossings` (398), trunk pinned to column 0
  (146). JS draws it: `VA.spineRight` (`topology.js:1811`) mirrors columns so
  the selected chain is the right rail; `VA.gridPlan` (2271) groups edge
  rows into per-part components for the grid's leaders; `railsSvg`
  (`views/topology.js:1204–1450`) draws bands, rails, branch/close links,
  leaders, edge bars and node dots. **No groups, containers, collapsible
  nodes or per-kind glyphs exist.** Edge kind changes only the stroke
  (`.rail__bar--gap { stroke-dasharray: 4 3 }`, `topology.css:379`).
- Vocabularies: `EDGE_KINDS = ("structural", "gap")` (`topology.py:169`),
  `NODE_KINDS = ("mating_surface", "datum_feature")` (150),
  `TRANSFORM_KINDS` (185); kinematic `ZONE_KINDS = ("band", "sphere", "disk")`;
  `LINKAGE_JOINT_TYPES` (spherical, distance, revolute, cylindrical,
  prismatic, screw, fixed, axial_position) generated at `vocab.gen.js:189–192`.
  The vocabulary rule: a word is changed in Python and regenerated; a JS
  table over a Python key set is a `VOCAB.table` (`CLAUDE.md`).
- After the merge handoff the topology carries `bodies[]`
  (`{id, name, parts[], kind: body | link}`); after `a_contributor_may_be_a_study`
  a kinematic study may name a chain study as a `study_ref`.

## Deliverables

1. **`INTERFACE_KINDS` on gap edges**, a module constant in
   `tolerance_stack/topology.py`: `planar`, `pin_in_bore`, `spherical`,
   `cylindrical_slide`, `thread`, `clearance`. Optional on a gap edge in
   v0 (an unauthored one draws today's dash and is listed by the gap list
   as "contact kind not stated"); refused on a structural edge. One Python
   table maps `LINKAGE_JOINT_TYPES` onto these where they coincide
   (`distance`/`spherical` → `spherical`, `revolute` → `pin_in_bore`,
   `cylindrical` → `cylindrical_slide`, `screw` → `thread`, `prismatic` →
   `cylindrical_slide`, `fixed`/`axial_position` → none), so the sweep's
   joint type can suggest the value and a disagreement is a test failure,
   never two sets of words. Generated into `vocab.gen.js` through the
   registry. Author the value on every gap edge of `vpa_pitch_linkage`
   (about fifteen after the merge: the four ball joints are `spherical`, the
   two coaxialities `cylindrical_slide`, the hub-face seats `planar`, the
   end-stop and cotter clearances `clearance`, the bearing-centre identities
   are not contacts — decide and record), with a `note` where the choice was
   not obvious.
2. **The form rule, stated once and drawn two ways.** `docs/SOP_TOLERANCE_STACK.md`
   gains the rule from Jeff's answer: a form callout on a surface two
   components are attached to, with no size band of its own in the chain,
   is a **structural edge** of nominal 0 and ± the form band; a form callout
   on a feature that already carries a size band is a **modifier** on that
   element — it can tighten, never loosen — carried as a `form` field on the
   edge's dimension (band and source_ref) and folded only where the SOP says
   (v0: display and gap list only; the fold is unchanged — say so). The DAG
   draws the rough-surface squiggle **on the edge bar** in the first case
   and as a **node adornment** in the second. `docs/DAG_TOPOLOGY.md` carries
   the glyph table (interface kinds and the form mark) with one example
   edge each.
3. **Body containers.** The layout places every node inside its body
   (nodes belong to parts, parts to bodies — `bodies[]`); the projection
   emits per body the rows and columns it spans, and the renderer draws a
   rounded field behind them with the body's name once at its top-left,
   muted fill cycling through a per-body palette (never the accent — the
   selection colour), and a flat outline with no fill when no edge of the
   body is lit in the current study. **Collapsible**: a body collapses to
   one wide node carrying its name and its joint-node count; the edges that
   leave it (the joints) re-attach to the collapsed node's rim in their
   column order; collapsed state is remembered per body per reader (the
   angled-leader default's storage). A node shared by a hidden/collapsed
   body and a lit edge stays visible (the dim/hide toggle's rule).
   Column ordering keeps minimising crossings **within the constraint that
   a body's nodes are contiguous**; measure the crossing count on the
   merged model before and after and record it (the 09-30 numbers were 32
   → 17 → 7 on the old `pitch_system`).
4. **Sub-stack containers.** A chain a `study_ref` names is drawn as a
   dashed field inside its body, collapsed to one bar labelled with the
   study's title and its folded interval (display only — the fold is never
   reused; the chain rule), expanding into its edges. The kinematic page's
   group row and the DAG's container collapse together.
5. **Joint glyphs.** Each gap edge with an `interface` draws its glyph at
   the bar's midpoint, in the bar's colour, sized in CSS px off the type
   scale (`docs/DESIGN_TYPE_AND_COLOUR.md`); the glyph carries the edge's
   hover card. Six glyphs, one SVG `<symbol>` each, in a file the test
   enumerates against the Python constant.

## Definition of done

- On the merged model, `topology.html?kinematic=…` and a chain study page
  show bodies as containers (named once, muted fills, collapsed state
  remembered), the travel sub-stack as a container inside its body when the
  kinematic study is open, and every authored gap edge with its glyph;
  collapsing `base` reattaches its joints to one node. Screenshots at 1600
  and 1920 wide in `docs/sessions/shots_20261026_dag_containers/`.
- `pytest -q` green: the vocabulary pairing (Python ↔ generated JS ↔
  symbol file), the linkage-type mapping table, the form rule's two cases
  on a fixture, the crossing count pinned on the merged model.
- `node apps/viewer/run_tests.cjs` and the viewer browser suites green
  against projections rebuilt from the committed tree; mutation spec per
  guard; the deep-link README untouched.
- Lesson (`docs/sessions/lessons/LESSONS_20261026_the_dag_draws_bodies_as_containers_and_joints_as_symbols.md`):
  the crossing numbers, which `interface` values were not obvious and why,
  and what the leaders handoff (`leaders_follow_the_active_study_across_the_seam`)
  needs from the container geometry (a collapsed body's anchor point).
