---
priority: high
depends_on: [a_pattern_is_bound_as_its_like_faces_and_a_face_can_be_added]
model: fable
hitl: false
---

# HANDOFF 2026-11-15 — the_map_draws_the_end_stop_model: the DAG region gains the tube map — bodies as districts, a box round every part, pins, jumpers, large joint symbols and bundles — drawn from the model, lit by the one selection, with the present DAG one click away

Source: Jeff, 2026-11-10 ("Yes I like your tube map", with his own sketch) and
his notes of 11-12 and 11-15 ("new dag layout (subway map) is this coming up
soon in the plan? DAG still looks like the old version"); the plan in
`C:\workspace\dispatch\docs\strategy\drafts\DRAFT_tolerance_analysis_over_the_kinematic_model.md`
("68 answered", "2026-11-12", "2026-11-15"). Baseline: `master` with the
handoff above merged (and with it `the_hub_is_one_part_in_the_grid_and_the_dag`,
so the hub is one part everywhere). This is the viewer chain's one slot.

Scope: **new files** for the map (suggested: `apps/viewer/map.js` for the
layout as pure functions, `apps/viewer/views/map.js` for the render,
`apps/viewer/map.css`), a layout file beside the model (suggested:
`docs/topologies/topology_vpa_end_stop_v2.map.json`),
`scripts/build_topology_projection.py` to ship it, the smallest edits in
`apps/viewer/views/topology.js` and `apps/viewer/topology_app.js` needed to
mount the map in the DAG's region and add the switch, tests, one or more new
browser suites, `ARCHITECTURE.md`'s inventory, `docs/DAG_TOPOLOGY.md`. Do NOT
change the present DAG's layout or render functions
(`apps/viewer/topology.js` about `:1124-4400`; `railsSvg` and its neighbours
in `apps/viewer/views/topology.js`), the grid, the tree, `apps/annotate/`, or
the model file `topology_vpa_end_stop_v2.json` itself. Do not re-word or
re-point the present DAG's browser checks; if the switch's default makes
them need a line of setup, that line is all they get.

## The reference — read these with vision before writing anything

- `C:\workspace\dispatch\docs\strategy\drafts\mockups\tolstack_tube_map_20261109\jeff_sketch_20261110.png`
  — Jeff's own sketch.
- `...\tolstack_tube_map_20261109\index.html` (built by `build.py` from the
  real v2 file) — the strategy session's sketch.
- `...\tolstack_tube_map_20261109\jeff_dag_screenshot_20261109_four_arrows.png`
  — what he dislikes in the present DAG.

What carries over from each (Jeff, 2026-11-10):

| From | What |
|---|---|
| The session's sketch | A placed 2D layout with 0° / 45° / 90° routing; bodies as lightly filled districts; parallel paths where two parts meet through several constraints |
| Jeff's sketch | An outline round every part as well as every body; pins on the part's perimeter, one per interface end, on each part; jumpers inside a part linking its pins (the part's dimensions); joint symbols drawn large on the connector between two pins |

Joint symbols, large (Jeff: the present ones are "a bit small and hard to make
out"): planar = the capacitor mark; boss-in-hole = a closed circle and dot;
spherical = cup and ball; a fastener pattern (clocking) = a ring of dots. The
model's other kinds (the cylindrical slide, the clearance at the stops) keep
the present design's symbols at the same large size.

## What it is drawn from

The model view the page already has: `model {bodies, parts (parent, children,
depth), features, dimensions, interfaces, joints, counts}` built by
`tolerance_stack/model_view.py::model_view` and shipped in
`data/projections/viewer/topologies.json` (`scripts/build_topology_projection.py:1817`).
v2 on 2026-11-15: 5 bodies, 15 parts (2 of them assemblies, 3 bearings inside
them carrying no features), 34 features, 22 dimensions, 17 interfaces,
15 joints. Interfaces are grouped by part pair, so a joint is one thing with
several constraints; only hub ↔ tan-link mount has three today. The map reads
`model` and its own layout file and nothing from `layout {columns, rows,
rails, …}`, which is the present DAG's.

The region it is drawn into (`#topopane`, measured by
`LESSONS_20261112_the_page_is_a_fixed_layout_and_nothing_scrolls_the_document.md`):

| Window | Side by side | DAG view |
|---|---|---|
| 3840×2160 | 1201 × 2160 | 2390 × 2160 |
| 5120×2160 | 1841 × 2160 | 3670 × 2160 |
| 1920×1080 | 485 × 1080 | 958 × 1080 |

## Deliverables

1. **A reference drawing first.** Before any renderer code, produce one
   static SVG of v2's map from the real model and a first layout, sized for
   the 2390 × 2160 region, and read it with vision against the three
   reference images: every part boxed, every body a district, pins on
   perimeters, jumpers inside, the three-constraint hub ↔ tan-link mount
   joint as a bundle, symbols large enough to tell apart at arm's length.
   Iterate on the drawing, not the code, until it reads. Keep it and its
   earlier attempts in `docs/sessions/lessons/shots/the_map_draws_the_end_stop_model/`.

2. **The layout is authored, small, and beside the model.** One entry per
   part: where its box sits on a coarse grid. Everything else is computed:
   a box's size from its pin count, which side a pin sits on from where its
   counterpart is, a body's district from its parts' boxes, an assembly's
   outline round its children (three nested outlines: body, assembly, part),
   routes on 0° / 45° / 90°, bundles as parallel offsets of one route. The
   authored arrangement is wide, like both sketches (Jeff, 11-12: the DAG is
   moving "towards something that has a wider aspect ratio"). The page fits
   it to the region and pans and zooms it as the present DAG does. A model
   with no layout file (v1 today) has no map and the switch says so in two
   words; that is data, not a branch on a model's shape. Suggested shape for
   the file and the grid; prototype and report what you chose.

3. **The renderer draws every entity once, keyed by the model's ids.**
   Districts, part boxes (a bearing with no features is a small empty box
   inside its link's outline), pins (one per feature that ends an
   interface), jumpers (one per dimension, between the two pins it
   measures, or a stub when it has one end on the part), connectors (one per
   constraint, with the joint's symbol at its middle, bundled when a part
   pair has several), names for bodies and parts, a short label per pin shown
   on hover and when lit. No element is drawn twice and nothing in `model`
   is left undrawn: the suite counts districts, boxes, pins, jumpers and
   connectors against `model.counts`. Every curve takes `fill: none` (the
   11-14 walk found SVG's default black fill under a hover).

4. **The one selection lights it, both ways.** Hover and select on any map
   element go through the page's one store and one resolver
   (`VA.focusLightOf`, `VA.focusElementKeysOf`), with the two strengths (own,
   touching) and nothing going opaque, exactly as the present DAG, the tree,
   the grid and the 3D pane do. Selecting a body lights its district and
   every part in it; a part lights its box and its pins harder than itself; a
   feature lights its pin and the connectors it ends; a dimension its jumper;
   an interface its connector and both pins. A selection made anywhere else
   lights the map and brings the lit element into view if it is off-screen.
   Re-fill the entity × surface table from
   `LESSONS_20261112_hover_and_select_light_the_same_things_on_all_four_surfaces_and_nothing_goes_opaque.md`
   for the map in the DAG's column, from the page.

5. **A switch in the DAG's region: Map · Classic.** One two-way control in
   the region's own header, in every pane view that shows the region. The
   map is the default for a model that has a layout **if** the present DAG's
   browser suites can go on driving Classic by one line of shared setup;
   count the suites that would need an edit and, if it is more than a shared
   helper's worth, default to Classic and say so at the top of the lesson.
   The choice is remembered the way the pane view is. The present DAG is
   unchanged underneath: it retires in a later handoff, on Jeff's yes to the
   map, and its suites are rewritten once, then.

6. **`docs/DAG_TOPOLOGY.md`** gains "The map": what is authored (a part's
   place), what is computed, the symbol table, and the sentence that the map
   is a second drawing of the same model and never a second model.
   `ARCHITECTURE.md`'s inventory gets the new modules' rows.

Not in this handoff, each named so it is not half-built: a fold control (the
"+" on a group) and the collapsed / expanded shortcuts
(`ISSUE_20261114_the_dag_draws_no_nested_outline_for_a_part_inside_an_assembly`
is closed by item 2's static outline; the fold stays open in
`ISSUE_20261114_assembly_folding_left_out_of_three_surfaces`); a study lit as
a route; a layout for v1; authoring the other compound joints; retiring
Classic. `ISSUE_20261114_the_dag_still_lays_out_for_a_grid_beside_it_that_has_its_own_region_now`
is answered by the map and closes when Classic retires; note that on it.

## Definition of done

- The real v2 model on the real projection, Map selected, shot and read with
  vision at all six regions in the table above (3840, 5120 and 1920 wide;
  Side by side and DAG view). For each: is every part name legible, are the
  symbols distinguishable, does anything overlap or leave the region. The
  lesson's table says so per region in a word each, and names the regions
  where the wide arrangement does not read (the 485 × 1080 one is expected
  to need zoom; say what it looks like).
- Counts drawn equal `model.counts`, in a browser check on the real
  projection and on a fixture.
- Hover and select, both directions, between the map and each of the tree,
  the grid and the 3D pane: a browser suite, and a filmstrip of one
  selection travelling across all four.
- The present DAG's suites green with no check re-worded.
- Exploratory click-around on the real projection before the checks.
- Each new guard carries its mutation spec, passed to the witness runner in
  one invocation.
- Lesson (`docs/sessions/lessons/LESSONS_20261115_the_map_draws_the_end_stop_model.md`):
  the reference drawing's iterations and what changed between them; the
  layout file's shape and why; the six-region table; the default the switch
  ended on and the suite count behind it; what a fold control and a study
  route would need from this code; anything in Jeff's sketch the map does
  not yet do.
