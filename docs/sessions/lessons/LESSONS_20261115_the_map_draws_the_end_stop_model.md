# LESSONS 2026-11-15 — the_map_draws_the_end_stop_model

Handoff: `docs/sessions/active/HANDOFF_20261115_the_map_draws_the_end_stop_model.md`.
Run 2026-11-16, in the worktree. **The switch ended on Map by default**, with
zero existing suites edited: the browser runner's `newPage` wrapper already
seeded every suite's page onto the rails (Parts: rails), and one more line
there seeds Classic the same way (the count behind the default is below).

## What landed

- `apps/viewer/map.js` — the layout, pure: the model view plus the authored
  places in, geometry out (districts, assembly outlines, boxes, pins, inner
  marks, jumpers, connectors with their symbol points, bounds, defect notes);
  the symbol table; the Map · Classic vocabulary and its stored key; the view
  maths (fit, zoom about a point, pan, bring-into-view); what an entity lights
  on the map (`VA.mapLightKeys`, the one resolver's tiers as `kind:id`).
- `apps/viewer/views/map.js` — the drawing, the lighting (`VA.lightMap`), the
  pointer (hover and click tell the page the entity), the wheel and the drag,
  the resize re-fit, and the switch (`VA.renderDagSwitch`).
- `apps/viewer/map.css` — colour, weight and the two strengths; no sizes.
- `docs/topologies/map_vpa_end_stop_v2.json` — v2's layout, twelve places and
  one symbol word.
- `scripts/build_topology_projection.py` — `load_topology_map` ships the file
  verbatim as the topology's `map` and refuses one that leaves a top-level
  part unplaced, places a part the model has not, or names a symbol for no
  interface; `tests/test_topology_map.py` pins it.
- The hooks, each a few lines: `views/topology.js` hands the region to the map
  at the end of `renderTopoPane` (the walk and the grid are built as ever, the
  grid is the plan's) and appends the region's header; `topology_app.js` reads
  and stores the choice, passes the map its drawing, model, selection and two
  entity callbacks, skips the respine animation when the map is drawn, routes
  Fit and the `0` key to the map's own fit, lights the map from `applyFocus`,
  and reads a map element's entity in `entityUnder`.
- The fixture's demo mechanism carries a layout (`topology_fixtures.js`,
  `map`), so the fast tier draws a map and the `[real]` shape pairing sees
  the key on both sides.
- `docs/DAG_TOPOLOGY.md`, "The map"; `ARCHITECTURE.md`'s viewer row;
  `apps/viewer/README.md`, "The map".

## The reference drawing — three iterations (`shots/the_map_draws_the_end_stop_model/reference_0N_2390x2160.png`, `.svg` beside each)

Drawn by the renderer itself from the real v2 model and the layout file into a
2390 × 2160 box (the DAG view's region at 3840), through a scratch harness;
read with vision against Jeff's sketch, the session's sketch and his
four-arrow screenshot before any interaction code was written.

| # | What it showed | What changed for the next |
| --- | --- | --- |
| 01 | Every part boxed, every body a dashed district, pins on perimeters, jumpers inside, the hub ↔ mount joint as three parallel routes with three symbols, large symbols distinguishable at arm's length. Part names cut ("blade bonded assem…", "tangential link mo…"), the bearings' boxes unreadable ("tangentia…"), districts the size of their cells so the pitch plate's was mostly empty. | Cells 420 × 340 (were 380 × 300), boxes 270 wide (were 210) with the name wrapped to two lines, child boxes 150 × 50 with a two-line label, districts hugging their parts by a pad inside the cells' union inset. |
| 02 | Names whole, bearings labelled, districts tight. The pitch plate ↔ pitch link ball symbol sat on the pitch link district's border: the symbol was at the route's half-length, and a route with a jog is longer on one side of the gap. | The symbol sits where the route passes nearest the midpoint between its two pins -- the gap between two districts for boxes centred in adjacent cells -- rather than at half the route's length. |
| 03 | Every between-body symbol in the gap between districts; accepted. | -- |

Against Jeff's sketch, what carries over and what does not yet (also the last
section): an outline round every part and every body, pins on each part's
perimeter one per interface end, jumpers inside a part, large symbols on the
connectors -- all drawn. His sketch is portrait and ours is wide (the strategy
draft's decision 81); his connectors and pins are one red, ours are the page's
ink and the body's ink (semantic colour only); he drew the hub ↔ mount joint
with one symbol, the model has three constraints and the map draws three.

## The layout file's shape, and why

`places: {part: [column, row]}`, one entry per top-level part, on a coarse
grid; `symbols: {interface: word}` for the one word the model cannot say
(below); `schema`, `topology`, `provenance`. Nothing else is authored: a box's
size, a pin's side and order, a district, an assembly's outline, a route and a
bundle are all computed, so a change to the model redraws without a change to
the file, and the builder refuses a file that leaves a part unplaced.

- **A child part has no entry** and sits in its parent's cell as a small box
  under the parent's; the assembly's outline is computed round both. The
  handoff said "one entry per part"; a bearing with no features has nothing a
  place would decide, so the entry would have been noise.
- **The grid is cells, not pixels**, so two authored boxes can never collide
  and a body's district is bounded by its cells' union inset -- adjacent
  bodies are at least twice the inset apart whatever their parts' sizes.
- **Named `map_<id>.json`**, not the handoff's suggested
  `topology_<id>.map.json`: every reader of `docs/topologies/` globs
  `topology_*.json` for the models (the builder, `test_topology.py`,
  `test_topology_projection.py`, `test_part_mesh_aliases.py`,
  `test_study_completeness.py`, `test_general_note_band.py`,
  `test_model_view.py`), and the suggested name matches it.
- **The arrangement**: the base body across the top row in its stack order
  (hub, tangential-link mount, gas-spring mount, cover), the pitch plate body
  across the bottom row in the same order (plate, piston, lower head, upper
  head), so the four joints between the two bodies are near-vertical; the
  blade and the pitch link down the left; the tangential link alone between
  the two mounts. Five columns by three rows, 2.07 : 1.
- **The pattern word.** The clocking constraint is a shared node like any
  seat; the model has no word for a fastener pattern, so the layout file
  names it (`ISSUE_20261116_the_model_has_no_interface_word_for_a_fastener_pattern`,
  strategy). The six `INTERFACE_KINDS` reach the map through the generated
  vocabulary as `interface_glyphs.js`'s do.

## The six regions (the real page, Map selected, `tests/debug_map_shots_20261116.mjs`; shots `region_<w>x<h>_<view>.png` and `_pane.png`)

Measured off the page: the region's size, the fitted zoom, the smallest part
label on screen, the smallest symbol, whether the drawing is inside the
region and whether any label is clipped by it.

| Window | View | Region | Zoom | Smallest label | Symbol | Reads? |
| --- | --- | --- | --- | --- | --- | --- |
| 3840×2160 | Side by side | 1201 × 2160 | 0.566 | 9 px | 6 px | Legible, small: part numbers and names read at arm's length on a 4K panel, symbols tell apart with effort. The strip sits in the middle third of the tall region. |
| 3840×2160 | DAG | 2390 × 2160 | 1.126 | 18 px | 11 px | Yes. The reference drawing's size. |
| 5120×2160 | Side by side | 1841 × 2160 | 0.868 | 14 px | 9 px | Yes. |
| 5120×2160 | DAG | 3670 × 2160 | 1.73 | 27 px | 17 px | Yes, generous. |
| 1920×1080 | Side by side | 485 × 1080 | 0.229 | 4 px | 2 px | No -- the expected one. The map is a recognisable thumbnail (districts and the two rows of boxes), every name illegible; the reader zooms, and a wheel notch over a district brings its names up. |
| 1920×1080 | DAG | 958 × 1080 | 0.451 | 8 px | 5 px | Borderline: numbers and names read when looked for, symbols are dots. |

Nothing overlaps and nothing leaves the region in any of the six; the counts
drawn equal the model's in all six. The wide arrangement does not read side
by side at 1920 and reads small side by side at 3840; a second, portrait
arrangement is the strategy draft's decision 81 if Jeff wants one
(`ISSUE_20261116_what_the_map_does_not_draw_yet`).

## The switch's default, and the suite count behind it

Map, for a model with a layout. The browser runner's `newPage` wrapper
(`scripts/run_viewer_browser_tests.mjs`) already seeded every page onto the
rails against the Blocks default of 2026-11-06; one `localStorage` line there
seeds `tolstack.viewer.dagDrawing = classic` unless a suite sets
`window.__dagDrawing`, so **zero** existing suites needed an edit and none of
the present DAG's checks was re-worded. The fast tier's bare
`renderTopoPane` renders draw Classic unless the context asks for the map, so
nothing there moved either. The map's own suite asks for the Map by storage
on its first load only (a `sessionStorage` marker), so its reload check reads
what the page remembered.

## The entity × surface table, from the page, the map in the DAG's column

Read off the real page by the suite and the click-around (`click_NN_*.png`,
`click_log.txt`). H = hover, S = select; own / touching as the two strengths.

| entity (how) | map | tree | grid | 3D |
| --- | --- | --- | --- | --- |
| body `ground` (H on its name) | district and name `--lead`, its 4 boxes, names, 15 pins and 11 jumpers lead; the 5 connectors to other bodies and their far pins hot | 5 rows hot (the body, its parts), folds marked | 12 rows lead | the 4 parts' overlays, own |
| part `hub` (H from tree) | box, name and 4 pins lead; the 4 interfaces to the blade root and the mount and their far pins hot; the mount's box not lit | -- | 3 rows lead, 1 hot | 1 part overlay, 3 faces |
| part `215175-002` (S on its name on the map) | box, name, 5 pins, 4 jumpers selected; 4 interfaces and far pins touched | 7 rows on | 4 rows selected | select layer: 1 part, 5 touching faces |
| feature `locating boss` (H on its pin) | pin lead with its label shown; its connector (the pilot) and 3 jumpers hot | the hub's closed fold marked `--holds` | 4 rows hot (the pilot gap and 3 dimensions) | hover layer: 1 face (face 144) |
| feature `locating boss` (S from the tree; S by its anchor picked in the scene) | pin selected, the pilot connector touched | -- | -- | -- |
| dimension `tan_link_mount_height` (H / S from the grid) | jumper lead / selected, its two pins with it | -- | its row | -- |
| interface `travel between end stops` (S on its connector) | connector and symbol selected, both pins | 2 rows on | -- | -- |
| a bearing's box (H) | the box and its label lead; nothing else (no features) | -- | -- | -- |

Escape lets the selection go on every surface; the hover stays where the
pointer is. Nothing goes opaque in the scene on any of these (the suite reads
the pane's light layers; the looks are the 11-12 lesson's).

The filmstrip: `map_selection_four_surfaces.png` (8 frames, 150 ms of page
time apart) -- the hub hovered in the tree then clicked, the map's box and
pins, the tree's rows, the grid's rows and the scene taking the one selection;
its probe JSON beside it.

## Decisions not in the handoff

- **Hover and select by entity, not by element key.** The DAG lights by
  `node|id` / `edge|id`; a node two parts share is one dot there and two pins
  here, so the map reads the resolver's tiers as `kind:id` directly
  (`VA.mapLightKeys`) and tells the page an entity (`onHotEntity`,
  `onSelectEntity`). `applyFocus` calls `VA.lightMap` beside `lightTopoKeys`.
- **The grid is still the plan's.** `renderTopoPane` builds the walk, the
  rails and the grid as ever and then hands the region to the map, so the
  grid, the leaders' geometry and the scroll carry are untouched; the rails
  SVG is built and discarded on a map paint (v2 is small). Classic's retirement
  removes that.
- **The symbol's place** is the route's nearest point to the pins' midpoint
  (iteration 02 → 03 above).
- **Fit never passes 2×**, and the view is per topology for the page's life,
  re-fitted on a resize only while it is still the page's own fit (`auto`); a
  reader's wheel or drag ends that until Fit.
- **A box's and a district's interior is pan space** (`pointer-events:
  stroke`), the border and the name are the controls -- the DAG's rule.
- **Routes are not collision-avoided**; the layout reports a route drawn
  through a box it does not end on as a defect note, and the reference drawing
  iteration is where an arrangement is fixed. v2 has none.
- **The clocking's symbol** comes from the layout file (above).
- `ISSUE_20261114_the_dag_draws_no_nested_outline_for_a_part_inside_an_assembly`
  is marked resolved (the static outline is drawn; the fold stays open in the
  folding issue), and
  `ISSUE_20261114_the_dag_still_lays_out_for_a_grid_beside_it_that_has_its_own_region_now`
  carries a note that the map answers it and it closes when Classic retires.

## What a fold control and a study route would need from this code

- **A fold.** `geo.assemblies` already has every assembly's outline and
  children; a fold reads the grid's store (`VA.readCollapsedAssemblies`) and,
  folded, drops the children's boxes, widens nothing (the parent's box stays
  where it is) and moves a child's pins onto the parent's perimeter -- a
  `pinsOf` pass keyed by the top-level part instead of the child, which is a
  one-line change in step 3 of `VA.mapLayout` once a child has a feature (none
  in v2 does). The "+" sits at the outline's corner, wired like the name.
- **A study as a route.** Every jumper and connector is keyed by the model's
  dimension and interface ids, and the page's lit set (`ctx.lit`,
  `VA.studyLitSet`) is edge ids: a `--route` class on the chain's jumpers and
  connectors, the rest at the DAG's Unused dimming, is a paint-time pass like
  `applySelection`. The chain's ordinals would be labels at the jumpers'
  `mid` points, which the geometry already carries.

Both filed in `ISSUE_20261116_what_the_map_does_not_draw_yet` with the other
fenced work (a layout for v1, Classic's retirement, the compound joints, a
portrait arrangement).

## What in Jeff's sketch the map does not yet do

- One colour for every connector and pin (his red). The map keeps the house
  rule -- the page's ink for routes, the body's ink for pins, the accent for
  the selection alone.
- The portrait arrangement (his) -- ours is wide by decision 81.
- A district folded to one block (the session's sketch's view 3) and a study
  lit as a route (view 2) -- fenced, above.
- His piston cover sits at the base body's top-left with the body as a tall
  column; ours is the last box of the base's row.

## Witness specs

Thirty-five written, one per new guard, named by the census: nine fast
(`fast__the-map-s-…`, `fast__a-pin-sits-…`, `fast__a-route-leaves-…`,
`fast__a-layout-that-leaves-…`) and twenty-six browser (the map suite). Two
browser guards carry no spec and raise the pin: the suite's skip arm and
"nothing threw on the map's page", both absences. Pins moved fast 705 → 714
and browser 868 → 896 (`scripts/guard_enumeration.mjs`, dated). The runner's
verdicts are in the test record below.

## Test record

(Every browser and witness run below was from this worktree with `--repo
C:/workspace/tolstack/data/scratch/map_20261116`, a scratch data root with
`data/inbox` and `data/meshes` junctioned to the main checkout's, the main
checkout's projections copied in and every Python builder re-run from this
tree with `--data-root`; the main checkout's own projection predates the
`map` block and is untouched.)

RECORD_PENDING
