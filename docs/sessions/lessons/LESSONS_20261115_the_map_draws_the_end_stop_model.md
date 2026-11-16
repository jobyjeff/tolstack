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
| part `hub` (H from tree) | box, name, 4 pins and its 3 jumpers lead; the 4 interfaces to the blade root and the mount and their far pins hot; the mount's box not lit | -- | 3 rows lead, 1 hot | 1 part overlay, 3 faces |
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
- **Two things the click-around found that no check asked about**
  (`click_NN_*.png`, `click_log.txt`): a click on a district's dashed border
  landed in a dash gap and selected nothing, so a district and a box each
  carry a wide transparent twin of their border that takes the pointer
  (`map__districthit`, `map__boxhit`), the drawn border taking none; and a
  top pin's lit label was drawn inside the box, over the part's own name
  (round 1's shot of the tangential link's selection: "mount end bearing
  centre" on "212956-005"; the walk was re-shot after the fix, where it is
  `click_09`), so a top pin's label sits above its box. Also found and left as it is: a connector's
  bounding-box centre is its symbol, so a probe that aims a pointer at the
  centre hits the symbol's group rather than the hit path -- fine for a hand
  (the symbol is in the connector's group and hovers it), a trap for a
  Playwright `hover` on the hit path; the probes aim a quarter of the way
  along the line instead.
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

The scratch root's three viewer projections carry two build stamps -- the
topology, results and kinematic builders ran at `f6b25950`, the crops builder
at `4064ecc2` after the first crops copy (trunk's) was refused for an input
that differs on integration -- so the page's banner in every `region_*` and
`click_*` shot says the data is older than the code. That is a true statement
about the scratch root's stamps disagreeing, not about the map; the fast
tier's own freshness pairing accepted the root (below).

**Fast tiers**, in this worktree:

| command | result |
| --- | --- |
| `node apps/viewer/run_tests.cjs` | 591/591 (the node-fs tier skipped: no projection in a worktree) |
| `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack/data/scratch/map_20261116` | **714/714**, the `[real]` checks armed (the scratch root needed a `docs` junction to this worktree for the worksheet reads, and a crops projection built from this tree) |
| `node apps/annotate/run_tests.cjs --repo C:/workspace/tolstack/data/scratch/map_20261116` | 323/323 |

**Browser runner**, the one suite this handoff added (`node
scripts/run_viewer_browser_tests.mjs --repo <scratch root> --only "the map
(Map"`): **27/27**, five runs over the session, the last on the suite's final
text (70.8 s). No existing suite was edited or re-worded; the runner's
`newPage` wrapper gained the one shared line that seeds Classic.

**Witness runner** (`node scripts/run_mutation_witness_tests.mjs --repo
<scratch root> --only __<digest> ...`, one invocation per batch, the specs
passed together): every one of the 35 specs WITNESSED -- 15 fast mutations
over 9 fast specs, 26 browser specs. It took four batches to get there, each
for a reason worth knowing:

| batch | what it found |
| --- | --- |
| 1 (all 35) | 16 browser WITNESSED. Six browser specs "never reached": under their mutation a `waitForFunction` / `waitForSelector` in the suite threw and ABORTED it before the named check; every wait in the suite now swallows its timeout, so a mutated page fails the check instead. One "cannot see the difference": the DAG-view re-fit happens by two paths (the view switch repaints, and the resize observer re-fits), so mutating the observer alone changed nothing; the first paint, the resize and Fit now share one `fitTo`. Every fast spec "red before the mutation": the scratch projections were built from the previous commit and the working tree had moved on, so the fast tier's `[real]` freshness refused before any mutation. |
| 2 (all 35, after a rebuild) | 19 browser WITNESSED; three not: the anchor-pick spec's mutation (pins keyed by node) broke the suite's own selectors before its check, re-pointed at the page's scene-pick path; the DAG-view spec's second mutation (fit to the height both ways) overflowed the first paint and aborted a hover, re-pointed at a cap under the DAG view's fit with the check computing the expected fit by the rule itself; the 3D-view spec aborted on a `locator.click` stability wait during a repaint, so the switch's clicks are dispatched in-page like the pane-view buttons'. Four browser specs were never run: the runner's default 30-minute cap. The fast specs red again: the crops projection copied from trunk had an input that differs on integration (`tolerance_stack/feature_geometry.py`). |
| 3 (the three re-pointed) | all three WITNESSED. The fast specs red a third time: the crops rebuild had been stamped `dirty` by an edit that landed while it ran. |
| 4 (9 fast + the 4 never run, `--budget-min 0`) | 15 fast mutations and 3 browser WITNESSED; one browser spec ("with the 3D pane open the region still draws the map") NOT -- opening the pane does not repaint the region, so a mutation that forces Classic with the pane open showed only at a later check; the check now repaints the page (the density toggle, twice) before it reads, and the spec WITNESSED on its own run (1m42s). |

Two browser guards carry no spec by design (the suite's skip arm and
"nothing threw on the map's page"), and the pins say so.

**Default tier**, once, in this worktree, at the end:

```
C:/workspace/tolstack/venv-win/Scripts/python.exe -X utf8 -m pytest -q -p no:cacheprovider
1 failed, 2027 passed, 1 skipped, 4 deselected in 463.83s (0:07:43)
```

The one failure is `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`,
the documented worktree red (no `data/projections/` here, so the wrapper
refuses to call a skipped tier green); the same tier ran 714/714 against the
scratch root above. The skip is the pitch-link bearing re-extraction
(`test_fit_bound_features.py`). Recorded with `suite-time record tolstack
--tier default --seconds 464`: inside budget.

**Not run**, the review's after the merge: the whole browser tier and the
`--changed-since` witness gate.

**Scratch left behind**: the scratch data root
`C:/workspace/tolstack/data/scratch/map_20261116` (junctions to the main
checkout's `data/inbox` and `data/meshes` and to this worktree's `docs`; the
projections built from this tree; the runs' logs) is left for the reviewer,
who needs a root with the `map` block until the main checkout is rebuilt from
a tree that has it. The worktree's `node_modules` junction stays for the same
reason. The main checkout's `data/` was not written.

## Found on arrival

Nothing: a worktree session, no main-checkout dirt to disposition.

## Blocked actions

One. Stopping a running witness batch (`taskkill /T` on the runner and its
Chrome) was denied by the auto-mode classifier as destructive, so a batch
started on a suite whose waits still threw ran to its 30-minute cap before the
fixed suite could be witnessed. Nothing was lost but time; the rule is in the
session memory: start a batch only on a suite whose every wait is caught.

## Round 2 (2026-11-16), after the review's REQUEST CHANGES

Three blockers, the first a defect no tier saw; two should-fixes closable in
passing; five nits. All on the handoff branch. The review was of `eb7708dc`;
the three commits after it had already filled the test record and witnessed
every spec, so B3 was mostly behind the review by the time it was read.

**B1 -- Fit and the `0` key were dead on Classic and on the legacy model once
the map had been painted.** `renderTopoMap` set `root.mapFit` (and the resize
observer) on the region, `fitDag` called it and returned whenever it was a
function, and `renderTopoPane`'s `innerHTML = ""` removed children, not
expandos. `VA.releaseMap(root)` (views/map.js) now resets the map's Fit, view
and light and disconnects its observer, and `renderTopoPane` calls it right
after it clears the root, so a Classic paint hands Fit back to the rails and
the page's light reaches no detached map; a map paint sets them again. One
fast guard (a Classic paint after a map paint on the same root; a map paint
through the pane sets Fit back) and two browser checks on the SAME page --
map, Classic by the switch, wheel, Fit, the `0` key; then the legacy model,
wheel, Fit -- each with a spec on the one hook line. Measured on the real
page: Classic after the map, rails 330 → wheel 502 → Fit 325 → wheel 430 →
`0` 325, the pane's `mapFit` null; the legacy model 678 → wheel 1031 → Fit
206 (its walk is taller than the pane even at Fit, by the legibility floor,
so the check asks for the rails back under their arrival width).

**B2 -- the word Classic on the switch reddened the app suites' text guard**
("says nothing about a classic view anywhere on the page", the 2026-09-15
chip-retirement check, a body-wide substring). Resolved the way the review
recommended: the guard now counts the word everywhere but the DAG region's
own switch (`#dag-drawing`), and is renamed to say so -- the retired chip was
a row of the nav and the stack page, never the region's header. The handoff's
own word stays on the switch and in every document. `app file://` and
`app http` are 41/41 again. (This is one edit to an existing browser check,
outside the present DAG's checks the handoff fenced; the reviewer asked for
it by name.)

**B3 -- the record and the specs.** The record above was written before the
review was read (`0d8775b9`); every spec was witnessed by then (batches 2–5
above). The review's four misses were the three I had already re-pointed
(the anchor pick, the DAG-view re-fit, the pane-open repaint) and one abort
of the hover right after the 3D pane opens (`locator.hover`'s stability wait
under the map's re-fit); that hover is now anchored -- the element's rect is
read until two reads agree, and the mouse goes to that centre. The
`--budget-min` default of 30 minutes splits 35 specs over two invocations;
this round's own specs ran as their own invocations.

**Should-fixes.** `load_topology_map` and `tests/test_topology_map.py` read
the model view's `interfaces` for "which ids may carry a symbol word" instead
of restating the node-two-parts-share-or-gap-edge rule -- one rule, the
view's -- so `ISSUE_20261116_the_builder_and_its_test_restate_the_model_views_interface_rule`
(on the review branch) can close with this landing. The tint and the
pressed-control literal stay as the review filed them.

**Nits.** `docs/DAG_TOPOLOGY.md` says which tier counts which (the fast tier
the fixture, the browser tier the real model); the resolved issue's
`resolution:` line says what resolved it; the hub row of the entity table
names its three jumpers; a flank pin's lit label sits just below its pin so it
never touches a two-line name's second line (measured on the piston cover and
the hub's middle right pin, `click_04_*` and `click_05_*` in the re-shot
walk, which has 27 steps now; the round-1 click shots the renumbering
orphaned were removed). The two tab stops per part are left as filed.

**Round-2 record** (this worktree; the scratch root above, its topology and
kinematic projections rebuilt from `80e5d950` after the builder changed):

| command | result |
| --- | --- |
| `node apps/viewer/run_tests.cjs` | 592/592 (node-fs tier skipped, as every worktree) |
| `node apps/viewer/run_tests.cjs --repo <scratch root>` | **715/715**, `[real]` armed |
| `node apps/annotate/run_tests.cjs --repo <scratch root>` | 323/323 (unchanged by this round) |
| browser `--only "the map (Map"` | **29/29** (27 + the two B1 checks), on the suite's final text |
| browser `--only "app "` (`app file://`, `app http`) | 41/41 and 41/41 -- B2 |
| witness `--only __242c2092` (fast, B1) | WITNESSED |
| witness `--only __efee81d8 --only __a1fab9df` (browser, B1) | 2/2 WITNESSED, 4m22s |
| default tier, once, at the end: `…python.exe -X utf8 -m pytest -q -p no:cacheprovider` | `1 failed, 2027 passed, 1 skipped, 4 deselected in 453.07s` -- the documented worktree red on `test_viewer_js_suite_is_green`; recorded, inside budget |

Not run, the review's: the whole browser tier (B2's resolution touches one
check of two app suites, run here `--only`) and the `--changed-since` gate.
