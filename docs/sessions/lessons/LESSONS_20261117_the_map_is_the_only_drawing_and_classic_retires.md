# Lesson — the_map_is_the_only_drawing_and_classic_retires (2026-11-17)

The DAG region draws the map for every model; Classic, its switch, the rails
drawing, the respine, the seam leaders, `fitDagTo` and the rails-only controls
are gone, and the suites were rewritten once. Jeff's review page carries a new
section, "After Classic retired"
(`REVIEW_20261117_the_portrait_map_and_the_joints.md`).

## What landed

- **Every model draws a map.** `build_topology_projection.computed_map_places`:
  a model with no `map_<id>.json` gets each body a column (declared order), its
  top-level parts down it in tree order; a top-level part in no body takes one
  more column; no bodies is one column. `load_topology_map` returns the
  authored file verbatim or `{schema, topology, computed: true, places}` — the
  file is no longer a condition of the map. The browser path is unchanged
  (`VA.mapLayout` reads `topoProj.map` either way), so the demo fixture
  (authored places) and the kinematic fixture go through it too.
- **Classic goes.** `renderTopoPane` builds the grid from the walk and hands the
  region to `VA.renderTopoMap`; no rails SVG is built. Removed: the switch and
  its key (`tolstack.viewer.dagDrawing`), `VA.dagDrawingFor`/`topologyHasMap`,
  `railsSvg` and the rail geometry, `rowPositions`/centring, `leaderGeometry`,
  the respine (`animateTopoPane`, tween, ghost) and the study landing
  (`fitDagTo`, `bandPad`), the rails' zoom box and wheel, the seam leaders
  (overlay, anchors listener, `seam*` geometry), the pose film, body collapse,
  colour overlays, group fill, graph width, Parts: Blocks/On the rails, the
  joint glyphs (`apps/viewer/interface_glyphs.js` deleted; its everyday words
  moved to `topology.js`'s `VA.INTERFACE_KIND_WORDS`), and 172 dead CSS
  selectors. The legend dialog, the study summary's empty line, the empty
  Preview line and an interface's Preview note were rewritten for the map.
- **Lines removed** (`git diff f8f8df1e HEAD`): 19,673 deleted / 2,775 added
  across 344 files; 19,510 / 2,312 under `apps/`, `scripts/`, `tests/`.
  `topology.js` −2,386, `views/topology.js` −2,102, `topology_app.js` −1,003,
  `interface_glyphs.js` −210, `topology.css` −369, `tests.js` −5,018,
  `run_viewer_browser_tests.mjs` −4,574 (+866), viewer README −1,038 (+225).
  Witness specs 962 → 825 files.

  > **Correction (review, 2026-11-18):** 962 → **824** files at `15fb19b8`
  > (`git ls-tree --name-only HEAD scripts/mutation_witnesses/ | wc -l`, the
  > README included both times). The 825 was counted before `15fb19b8` retired
  > the pane-open spec. The fast-tier pin's comment in
  > `scripts/guard_enumeration.mjs` said "26 renamed". A name diff of
  > `enumerateGuards` between `f8f8df1e` and `HEAD` gives **19** fast renames
  > and 121 deletions, as this lesson says, so the comment now reads 19.

## Decisions not in the handoff

- **The walk stays as the grid's order source; only its drawing went.** The
  grid's rows come from `VA.gatherParts` then `VA.bandLayout` on the builder's
  walk — the page's default on `master` (Parts: Blocks). `gatherParts` still
  scores column permutations with `blockLayout`/`layoutCrossings`, which
  breaks ties in the row order, so those pure functions stay although nothing
  draws columns. Re-deriving the order from the model's tree order alone would
  have changed rows; the identity requirement won. `collapseBodies`,
  `spineRight`, `blockColumns` and `blockLayout`-after were dropped from the
  pipeline: none changes a row.
- **Grid row lists, identical.** Recorded with a probe before any edit, from
  the baseline tree, and after, both against one projection built from this
  branch: v2 (57 rows), v1 (100), v1 with `pitch_link_shank_out` (10),
  `pitch_system_blade_angle_worst` (16), `pitch_system_end_stop_minus7` (17):
  every list identical, row for row, as text. (A first "before" taken against
  the main checkout's older projection showed v2 at 31 rows — that projection
  predated v2's newer joints; not a change of this branch.)
- **The suites' rails seed went with `partDrawing: "rails"`.** The runner
  seeded both Classic and Parts: On the rails; on the page the grid order is
  the gathered walk, so a few demo orders in suites moved (post's two rows now
  adjacent).
- **The grid's body ink is unconditional.** It was `Colour by: Body` (the
  default); with the overlays gone the grid row always wears its body's ink.
- **Groups keeps two kinds** (Bodies, Parts) and acts on the grid's brackets;
  a stored choice naming a retired study kind is ignored.
- **View keeps Palette only** (the map's and grid's inks); `DAG_VIEW_DEFAULTS`
  is `{palette}` under the same key, an old entry read for its palette.
- **The map's zoom floor fell 0.1 → 0.04**, so Fit shows all of v1 in a
  side-by-side region (5,640 world units wide).
- **`graphNeed()` returns 0**: the map fits any region, so the 3D pane's width
  clamp keeps its reserve floor (it measured the rails' SVG).
- **The Preview's release listens on the capture phase** — the map stops a
  mark's click and its own pan press at its SVG, so a bubbling listener kept a
  stale press and read the next empty click as a pan (found by the suite
  rewrite).
- **Annotate still posts `annotate:anchors`**; nothing reads it now
  (`apps/annotate/` fenced) — noted in the triage issue below.

## The control table (the bar on `master` → now)

| Control | Now | Why |
|---|---|---|
| Map · Classic (region header) | removed | one drawing |
| Rows: Comfortable / Compact | kept | the grid's row height |
| Rows: labelled / values only | kept | the grid's edge rows |
| Lengths | removed | stretched the rails' bars only |
| Fit, `0` | re-pointed at the map | `mapFit` |
| Leaders | removed | rails dots to the 3D scene |
| Side by side · 3D · DAG | kept | the pane |
| Unused (with a lit set) | kept | the 3D scene's unlit look, the grid's band |
| Collapse assemblies · Expand all | kept | the grid |
| Groups | re-pointed at the grid's brackets | Bodies, Parts; study kinds were rails containers |
| View | kept, Palette only | Colour by / Group fill / Graph width / Parts drew the rails |

Before: `Map | Classic | Rows: Comfortable | Rows: labelled | Lengths: uniform |
Fit | Leaders: off | Side by side | 3D | DAG | Groups (4 of 4) | View`. After:
`Rows: Comfortable | Rows: labelled | Fit | Side by side | 3D | DAG | Groups (2
of 2) | View` (`shots/…/before_bar.png`, `after_bar.png`).

## v1's computed map, measured (3840 × 2160)

Counts equal the model's (13 bodies, 35 parts, 113 features, 82 dimensions, 51
interfaces); **no two boxes overlap**; **63 defect notes, 59 of them a route
drawn through a box it does not end on** (the rest: two boxes outgrow their
cell, etc.). Fit: zoom 0.219 Side by side, 0.436 DAG view. Slowest of four
repaints (the density toggle, map and grid together): v2 652 / 953 ms, v1 1,231
/ 1,010 ms on a box carrying three other suite runs — responsive; hover lights
at once (click-around). Seen by eye: two names collide at the top (the ground
body's name under the hub's box — the click-around's hover on it timed out —
and a symbol over the lower piston head's district name). A hand arrangement
is Jeff's call (the review page asks).

## The click-around (v2 and v1, 3840 Side by side; `shots/…/click_*.png`, `click_log.txt`)

Every kind on the map hovered and clicked (pin, jumper, connector, box,
district), a grid row hovered and clicked, a tree part clicked, Escape, wheel
in three notches, a drag, Fit, wheel out then `0`, a resize to 1920 and back,
the 3D pane opened, DAG view, Side by side again, a study opened on v1. Hover
and selection agree on map, tree, grid and Preview; Fit and `0` restore the
fitted zoom; the resize re-fits (0.925 → 0.463 → 0.925 on v2); the document
never scrolls. Found: the v1 name collision above; a study lights nothing on
the map (the study route is fenced out by name); a jumper of the post on the
demo overlaps its sibling at a quarter of its length (a fork's note) — left.

## Feature-identity log

`C:\workspace\tolstack\data\inbox\feature-identity\`: 84 files before, 84
after. Nothing bound.

## The suite table

The browser runner no longer seeds Classic (nor Parts: On the rails). Pins:
fast 722 → 601 declared (−121: deleted with their specs; 19 renamed where the
claim survives on the grid or the map), browser 907 → 774 declared (−133).
Specs: 37 deleted with three whole suites, 73 + 14 deleted with fast checks,
27 deleted with browser checks; 14 fast and 40 browser renamed with their
guards; 20 browser specs given a new mutation because their anchor went with
the rails (`scripts/guard_enumeration.mjs` carries the dated note).

### Browser suites

| Suite | Kept / re-pointed / deleted | Why |
|---|---|---|
| topology file:// respine | **deleted** (whole suite) | the respine is gone |
| leaders across the seam (synthetic anchors, the lit set, the selection triple, P2) | **deleted** (whole suite) | the seam leaders are gone |
| parts as blocks | **deleted** (whole suite) | the blocks drawing is gone; the grid's one-run order is pinned in the fast tier |
| topology file:// / topology http | **re-pointed**, rails checks deleted | the map renders as SVG; every grid row's edge is on the map (as its jumper or its connector), across scroll, density and study; the Preview from a jumper, a connector, a pin; freeze/release (the empty-space release found the capture-phase bug); real grids per topology; deleted: one ink/two weights, the hover label (3), the dashed gap hit, the study landing/blink/reduced-motion (3), "a non-member is dimmed", the length toggle (6), rail legs (4), Lengths on the product model (4), bar-beside-column pairing (2) |
| topology height budget | **re-pointed**, length-mode checks deleted | the grid scrolls alone, the map holds its region, a repaint restores the grid's scroll and the map's view; the length modes (5 checks) are gone |
| the DAG zoom, Fit and the grid header | **re-pointed** onto the map's own zoom, rails checks deleted | the wheel, Fit, `0`, the drag, the grid header pinned and the grid at its own scale, Groups/Compact/Parts on both models re-pointed to the grid's brackets and the map's districts; deleted: Lengths (4), the band and landing (3), sub-stack labels and study groups (2), the zoom box (1), the rails' first row (1), "every row keeps its bar" (2) |
| the map (renamed from "…Map . Classic…" to "the map (the counts on both models, the one selection on four surfaces, the view)") | **re-pointed**, switch checks deleted | v1 now draws its map: its counts, no overlapping boxes, Fit inside the region in the DAG view; deleted: Classic back, Classic's Fit and 0, Map back, the legacy model's Fit; header clauses dropped from three names |
| kinematic study page | **re-pointed**, rails checks deleted | the model is the map; the grid is the study's contributors; Unused; the fold; deleted: the band framed on arrival, compact framing, lit symbols, graph width, colour by body |
| the model drawn alone (renamed from "…and led (…a leader per placed node)") | **re-pointed** | the one light on tree, grid, map and scene: a part, a body, an interface, a joint and a gap hovered and selected, now read off pins, jumpers, connectors, boxes and districts; deleted: the seam leader per joint node |
| annotate flyout | **re-pointed**, respine waits deleted | the map is clear of the panel; the respine settles (4) are gone |
| 3D pane follows the selection | **re-pointed** | the kinematic layout box and a feature row's selection read off the map's pin (the old rails clause was vacuous, `>= 0`) |
| the Preview from the scene | **re-pointed** | the anchor's Preview against its map connector; the pick selects its feature's pin |
| annotate rail holds still | **kept** (a sample field dropped) | — |
| app file:// / app http | **kept**, one renamed | "says nothing about a classic view anywhere on the page" (the switch is gone) |
| render crash shows the banner | **kept**, two deleted | a throw inside a respine frame (2) |
| served mode | **re-pointed** | hovering an edge and a boundary interface on pitch_system's map |
| a window resize re-clamps…, point export, real render path, no nav click wedges, hosted origin, deep links ×2, index redirect ×2, popover mechanics, rebuild affordance, every study opens in 3D, every annotate suite, crop lightbox, typography, a suggestion names its face, a pattern is bound | **kept** | nothing in them read the rails |

Per-check detail for the browser tier is in the three rewrites' reports,
condensed above; every renamed check's spec follows it under the new name.

### Fast tier (`apps/viewer/tests.js`)

19 renamed, 121 deleted; every check below that read only the rails, the
respine, the leaders, the zoom, the lengths, the overlays, the blocks, the
groups-as-drawn, the seam, the switch or the glyphs is deleted. The demo grid's
order moved with the gathered walk (`TOPO_GRID_ORDER`).

| fast-tier check (old name) | outcome |
|---|---|
| the settings bar offers the view only while the 3D pane is open, presses the one in force, and the leaders control says when it can draw nothing | renamed → *the settings bar offers the view only while the 3D pane is open, and presses the one in force* |
| a re-render of the same topology carries the reader's sideways scroll, and a different topology starts at the left edge | renamed → *a re-render of the same topology carries the grid's sideways scroll, and a different topology starts at the left edge* |
| clicking a mark, or Enter on it, is selection -- the one action that freezes the Preview | renamed → *clicking a grid row, or Enter on it, is selection -- the one action that freezes the Preview* |
| a joint between two lit nodes is lit by closure: it draws at full emphasis, survives hiding, and is no row of the grid | renamed → *a joint between two lit nodes is lit by closure and is no row of the grid, and two lit pieces are joined through the model* |
| VA.applyRowDensity moves the one shared row-height metric, and only it | renamed → *VA.applyRowDensity moves the grid's one row-height metric, and an unknown density reads as the default* |
| the render puts the header at the top of the grid's own scroller, the drawing in the DAG's, and draws only the DAG at the zoom | renamed → *the render puts the header at the top of the grid's own scroller, and the map alone in the DAG's region* |
| selecting a study dims the non-members, numbers the chain and drops the grid to the chain's own rows | renamed → *selecting a study numbers the chain and drops the grid to the chain's own rows* |
| VA.gridPlan's focus filters the grid and the leaders and nothing else -- the rails are handed the same walk either way | renamed → *VA.gridPlan's focus filters the grid's rows and their seams and nothing else* |
| a shared node's stated joint kind is printed in everyday words on the tree's interface row and the Preview, and Classic draws it as its glyph; a seat still reads contact | renamed → *a shared node's stated joint kind is printed in everyday words on the tree's interface row and the Preview; a seat still reads contact* |
| the RENDER draws no band behind the leaders, and a grid row wears no tint: its body is a bracket, drawn from VA.gridBraces | renamed → *a grid row wears no tint: its body is a bracket, drawn from VA.gridBraces* |
| a block part whose other edges end on another block's pins is one run: one bracket in the grid and one block in the DAG | renamed → *a block part whose other edges end on another block's pins is one run: one bracket in the grid* |
| each group kind is its own checkbox: every kind draws only what it names, and a reader's choice is remembered per topology | renamed → *each group kind is its own checkbox: the grid draws only the brackets it names, and a reader's choice is remembered per topology* |
| the DAG's view settings are remembered in one store entry, a word outside a table reads as its default, and the width scales the column pitch only | renamed → *the view settings are remembered in one store entry, and a word outside a table reads as its default* |
| the view popover offers the five settings over their own tables and reports a change; the overlay's key is beside it, and absent with none | renamed → *the view popover offers the palette over its own table and reports a change* |
| a Classic paint on a region the map painted releases the map's Fit, its view and its light, so Fit is the rails' again; a map paint takes them back | renamed → *a region the map painted, painted with no projection, releases the map's Fit, its view and its light; a map paint takes them back* |
| the DAG and the grid share ONE hover state through the page's resolver: a dimension lights its bar, its row and its two end dots as own, the interfaces at its ends as touching, and no rail leg; the bar's hit path and the row tell the same key | renamed → *the grid lights through the page's one resolver: a row tells the page its key and lights nothing itself, and a dimension's row is own and the interfaces at its ends touching* |
| an interface has no grid row of its own: its dot is the own tier, and the dimensions that meet it light only as touching -- their rows and bars fainter, never as the thing pointed at | renamed → *an interface has no grid row of its own: the dimensions that meet it light only as touching -- their rows fainter, never as the thing pointed at* |
| [real] no study of any committed topology hides a node, an edge, a rail or a link -- and every grid is exactly its chain | renamed → *[real] every study's grid is exactly its chain, and a study that refused leaves the grid the whole walk* |
| [real] on the pitch linkage the DAG draws no band, and a rendered row wears no tint: a body is a bracket over its rows | renamed → *[real] on the pitch linkage a rendered row wears no tint: a body is a bracket over its rows* |
| railGeometry puts a row's mark at the row's own y | deleted |
| a rail allocated at a fork is drawn from below the fork's dot | deleted |
| leaderGeometry jogs each leader from its node's dot to its grid seam, on monotone lanes that cannot cross | deleted |
| descending leaders cross nothing in either style | deleted |
| angled leaders run flat to the zone's edge, then straight, between the SAME two ends the jogged ones have | deleted |
| dragging the jog zone spreads the lanes across the new width and moves neither end of any leader | deleted |
| the jog-zone scale is a multiple of the zone's natural width, clamped by the geometry | deleted |
| edgeLengthValue reads max − min for tolerance mode, falls back to 2 × plus_minus, and is null with nothing to scale by | deleted |
| rowPositions in uniform mode is the classic row pitch plus the containers' label bands, exactly — today's rendering, not a near miss | deleted |
| rowPositions under a scaled mode stretches edges in proportion, keeps node slots at one row, and floors the rest | deleted |
| a serialisation with no usable values at all — the variation-only case — floors every edge rather than inventing a scale | deleted |
| railGeometry and leaderGeometry read the keyed position store: bars get their slot's extent, dots and leader starts get the keyed node y, and the grid-side seam does NOT move | deleted |
| spineRight mirrors every column claim in a layout and leaves the walk itself alone | deleted |
| a leader leaves a right-justified spine with no rail standing between it and the grid | deleted |
| the RENDER draws the spine on the rightmost rail — the page mirrors, not just the layout helper | deleted |
| the RENDER builds no leader across to the grid, in any style: the grid is in a region of its own | deleted |
| the RENDER widens the jog zone when the preference says so, and the grid's header, in its own scroller, takes none of it | deleted |
| the respine's ghost is handed the scroll the outgoing pane was carrying, so the cross-fade shows ONE horizontal window | deleted |
| a rail is no element: hovering any part of one tells the page its key and lights nothing -- no leg, no curve, no mark on it | deleted |
| the pane's pointer tells the page its key and its leave and lights nothing of its own; a pane repainted under the pointer is lit again from the page's one hover, and the leave after it still reaches the page | deleted |
| the page's light always applies -- the pane's own pointer no longer wins: the scene's pointer on a joint lights every node it stands for as own, and the rows meeting them only as touching | deleted |
| hover emphasis is keyed by element, so it survives the respine's column renumbering | deleted |
| a scaled length mode takes the height it needs: the window is no budget, and only a bar clamped to the legibility floor says so | deleted |
| the zoom's bounds, wheel and anchor arithmetic: clamped, proportional, and the point under the pointer stays put | deleted |
| the lit span is the lit dots and bars (and the grid beside them), the whole walk when nothing is lit | deleted |
| the DAG's header height is the stylesheet's own | deleted |
| the grid is centred against the DAG across the leaders' own span, which is what makes the largest jog smaller | deleted |
| centring across the leaders beats centring the two blocks' heights — the measured reason this is not the obvious rule | deleted |
| the grid's rows start right under their header, in their own region: the DAG's centring offsets the drawing and never the table | deleted |
| respineEase pins both ends, clamps outside them, and rises | deleted |
| the respine tween pairs the two stores by ELEMENT, not by row index — which is the whole reason the store is keyed | deleted |
| a respine at e = 1 is the target store exactly — the animation adds no geometry drift | deleted |
| a settled respine store's KEY SET is the target's, in both directions — nothing of the outgoing serialisation survives settling | deleted |
| an element on one side only fades at its own settled position, and everything shared stays opaque | deleted |
| a bar floored on EITHER side wears the not-to-scale mark for the whole transition, and the target's own flag once it settles | deleted |
| an element the transition ADDS fades in at its own settled position, and the rows around it do not | deleted |
| respineX interpolates the DRAWN COLUMN COUNT and the pane width, and both land on the target's own at e = 1 | deleted |
| a column a respine ADDS unfolds out of the outgoing frame's leftmost rail — it is never drawn left of it, because it has no outgoing x to come from | deleted |
| a respine interrupting a respine unfolds out of a rail the frame it interrupted really drew — not out of drawn column 0, which a frame caught mid-unfold has nothing on | deleted |
| a link a respine ADDS between two columns BOTH serialisations have fades in — the column unfold cannot cover it, because neither column is one the transition adds | deleted |
| the rendered frame carries a link's fade on the drawn path, and a settled frame carries none | deleted |
| a branch link is keyed by where it LANDS, so one fork's two fan-outs are two different links | deleted |
| every frame of a respine draws every rail, mark, link and leader end inside the pane — the DAG no longer unfolds from behind its left edge | deleted |
| a tweened render draws the DAG from the interpolated store and the interpolated layout, cross-fades the grid and keeps the outgoing frame as an inert ghost | deleted |
| a respine interrupting a respine continues from the picture on screen, not from the serialisation behind it | deleted |
| the settled frame carries none of the animation: no ghost, no slide, no inline opacity, and the numbers a fresh render draws | deleted |
| VA.animateTopoPane runs a whole transition off an injected clock: the outgoing pane becomes the ghost, every frame is a render, and a cancel stops it dead | deleted |
| a frame that throws stops the transition and lands on the page's one crash seam, not on an unhandled error | deleted |
| the frames between keyframes move the live nodes and build none: a transition is three renders and a settle, whatever its length | deleted |
| a landing that names a pulled-back scale runs two legs: out to it first, then in to the arrival | deleted |
| prefers-reduced-motion jumps to the end state: one render, no ghost, no tween | deleted |
| VA.prefersReducedMotion asks the media query, and no query reads as no preference | deleted |
| a floored bar is rendered marked: the --floored class, the break glyph, and a hover label that says not-to-scale | deleted |
| hovering a mark on either tier reports its ONE key, draws one line of label, and opens no card | deleted |
| a sub-stack's label sits right of its bar when it fits, and otherwise ends at the drawing's right edge, never past it | deleted |
| the hover label goes where no other mark is, and keeps a picture fact when it must cut the name | deleted |
| selecting a node marks its dot — the grid has no node row to outline | deleted |
| every node row gets a dot and every edge row gets a bar | deleted |
| a bar says only lit or unlit: it wears no confidence, a gap is dashed, and the grid's mark is where its sourcing is | deleted |
| a branch point is marked on the dot — the grid has no node rows to mark any more | deleted |
| selecting a study never hides a node or an edge: the DAG is the whole walk before and after, whatever the study is | deleted |
| the leaders run to the chain and nowhere else, and every one of them lands on a seam one of its OWN edges bounds | deleted |
| the edge-length toggle is on the toolbar, names the current mode from VA.EDGE_LENGTH_MODES, and defaults to uniform | deleted |
| clicking the edge-length toggle calls its own handler, and the mode table's next-pointers cycle through all four and home, skipping contribution on a page that has none | deleted |
| the leader default is off, is a real style the toggle cycles through with the two drawn ones, and the toolbar names it | deleted |
| leaders off: the geometry builds no leader and moves nothing else -- the zone, the width and each node's seam row are what the drawn styles have -- and the pane draws none | deleted |
| the contribution length mode draws each bar at its contribution, and the pose film moves the live drawing to a keyframe's own picture without a rebuild | deleted |
| a curve to a node below it bows downward, a close to a node above it bows upward | deleted |
| a body in several blocks around the band is one container: named once, on the band's field, bridged block to block | deleted |
| a block's pins are on its sides, one height each in walk order, inside the aspect band; a chord runs pin to pin and a rail-side pin is joined to its column | deleted |
| in a scaled length mode two pins a chord joins are the chord's own length apart, and the block stretches for it | deleted |
| a leader leaves a block's pin, and the jog zone starts past the strip | deleted |
| the page draws a block per component only when it asks for blocks: its rect, its chords as curves and its pins' stubs | deleted |
| a body's container is every run of rows tagged with it, as wide as the columns those rows use | deleted |
| a study's group is every run of consecutive rows its lit set holds, and a study the walk splits is several | deleted |
| a group's field is wider and taller than the body field it wraps, and the bodies' own geometry is unchanged by it | deleted |
| the groups draw after every body field and before every mark, and a body's name stays above them | deleted |
| a part's group is every run of rows on one part inside one body, holding an edge, and it sits inside its body's field | deleted |
| every group is a border with no fill by default; the group fill adds parts, then every kind, in one layer under every border | deleted |
| a body's other blocks carry a muted repeat of its name, and only its named block folds it | deleted |
| a colour overlay maps every edge and node through one table of named schemes, and none is the one neutral ink | deleted |
| the contribution overlay is a sequential ramp over |sensitivity| x band at the page's stop, offered on a kinematic page only | deleted |
| the overlay's ink rides on the bar, the dot and the glyph, and with none nothing wears it | deleted |
| the selected study's group is drawn last and a step stronger; hidden, only it remains, whole | deleted |
| clicking a group's title opens its study, and hovering the field lights its edges' bars | deleted |
| collapsing a body folds its block to one pill, and the edges that leave it meet the pill at the columns their nodes were on | deleted |
| the leaders across the seam start at each lit node's dot, turn once left of the rails and end at its anchor; with no study every drawn node does | deleted |
| a leader across the seam leaves level with its own row, so it runs through no lit bar -- and the counter that says so can count one | deleted |
| crossings among the leaders across the seam are counted by pairs | deleted |
| a lit node folded into a collapsed body leads from its own column on the pill's rim, mirrored with it | deleted |
| one selection lights its leaders across the seam -- a node's own, an edge's two ends -- and the rest step back | deleted |
| the overlay draws each leader in its state, the selected one on top, with an outlined end on the scene | deleted |
| a collapsed body is remembered per topology per reader, and an unreadable store reads as nothing collapsed | deleted |
| every contact kind has one glyph symbol, and a joint's two ends are drawn as its glyph in the node's own ink -- never on the edge | deleted |
| a form element wears its squiggle beside its bar and a form modifier beside the face it is on | deleted |
| a kinematic page's lit set dims the rest of the walk, and hidden draws only the lit part | deleted |
| the map is the default drawing for a model with a layout, Classic for one without, the choice is remembered under its own key, and the region's switch presses the drawing shown or says No map | deleted |
| [real] on the product model a scaled length mode draws to scale, and the zoom's minimum shows the whole walk in a 900px pane | deleted |
| [real] a respine of every summing study of every topology settles on the fresh render's own geometry, bar for bar, in every length mode — the animation is presentation and nothing else | deleted |
| [real] the horizontal machinery still holds between two serialisations that DO differ by their columns — synthetic since viewer_respine_whole_walk, and deliberately kept | deleted |
| [real] no two leaders cross on any committed topology, at every density, length mode and leader style | deleted |
| [real] pitch_system is variation-only, so 'feature size' floors every edge and 'tolerance width' scales the real bands | deleted |
| [real] drawn as blocks, every committed topology's whole walk is one block per part, each inside the aspect band, crossing itself no more than the builder's walk does | deleted |
| [real] drawn as blocks, every block wears its part's body and that body's field wraps it, on the whole walk and on every study's band | deleted |
| [real] every committed topology draws its spine on the rightmost rail, with its branches extending left | deleted |
| [real] every number apps/viewer/README.md states about the spine, the fit and the centring is re-derivable from the live projection | deleted |
| [real] right-justifying pitch_system takes its spine leaders off every branch rail they used to cross | deleted |
| [real] the pitch system's five forks are marked | deleted |
| [real] selecting a study marks its chain on the real rails | deleted |
| [real] a study selection is still a respine worth animating: the grid block travels and the jog zone narrows | deleted |
| [real] in the contribution length mode three named bars are drawn at |sensitivity| x band at a pose between the stops, in proportion to each other | deleted |
| [real] every live walk's rails and links re-derive from its rows, and hiding the blade-pitch study's unlit model keeps only its rows and their columns | deleted |
| [real] every live body's container is the builder's own block, and every body of the product model is exactly one | deleted |
| [real] hidden, the blade-pitch study is its band alone: every lit row, one connected drawing, named once per body | deleted |
| [real] collapsing the product model's base folds it to one node carrying its joint count, and its joints meet that node | deleted |
| [real] every study of the product model has a group, and the page paints exactly its spans, in both modes | deleted |
| [real] a grip-budget study's group nests inside its own band | deleted |
| [real] the live product model draws one container per body, named once and bridged, and every end of a stated joint as its glyph | deleted |
| [real] each stop chain is a dashed field inside its bodies that folds and opens with the grid's header row for it | deleted |
| [real] each stop chain's label is drawn inside the drawing and over every mark, so no leader or bar takes the click meant for the fold | deleted |
| no leader default is written as a literal in the app shell | deleted |

## Test record

All against a scratch data root built from this branch,
`C:\workspace\tolstack\data\scratch\classic_retires` (inbox, meshes and
projections copied from the main checkout, then every viewer builder re-run
from this worktree with `--data-root`). The main checkout's projections were
built from `master`, which has no map for v1 and fails the freshness pairing
against this tree, so "in the main checkout" was not possible for the [real]
and browser tiers; the scratch root is that checkout's data, rebuilt.

- **Default pytest tier** (worktree):
  `C:/workspace/tolstack/venv-win/Scripts/python.exe -X utf8 -m pytest -q -p no:cacheprovider`
  → **2116 passed, 1 skipped, 1 failed in 430 s** (ledger: default, inside
  budget). The failure is `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`,
  the documented worktree case (no `data/projections/` in a worktree, so its
  node-fs tier skips); that tier ran separately below.
- **Viewer fast tier, real data:** `node apps/viewer/run_tests.cjs --repo
  C:/workspace/tolstack/data/scratch/classic_retires` → **601/601**, no tier
  skipped. **Annotate fast tier:** `node apps/annotate/run_tests.cjs` →
  **324/324**.
- **Whole browser tier** (handoff DoD):
  `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack/data/scratch/classic_retires`
  → **45/45 suites, 960 checks, 1504 s**, ledger row `2026-11-18T00:46:19Z`
  (sha `6b7f732e`, tree `4b3a4785`, tier merge, inside budget). Before: the
  last whole run on the merge base's family, `2026-11-17T21:53:15Z`, **1903 s,
  1128 checks, 48 suites** (over budget). After this run, three reader-facing
  strings changed (the study summary's empty line, the missing-projection
  line, a comment) — none read by a check.
- **Default tier before/after:** 495 s (`2026-11-17T22:32:30Z`, the previous
  tactical) → 430 s.
- **Witnesses**, `node scripts/run_mutation_witness_tests.mjs --repo
  <scratch> --only …` over the specs whose mutation this branch wrote or
  re-pointed: the runner ran **25 entries** (24 spec files, one with two
  mutations). **19 WITNESSED** on the first pass; **5 more WITNESSED** on a
  second `--only` run after their mutations were rewritten (the real
  every-edge order, a click never moving the map, the grid's pitch at Fit,
  v1's computed places, the seam rows — each first mutation either missed or
  reddened an earlier check of its suite first); **1 retired**: `[real] with
  the 3D pane open beside it the region still draws the map` — every mutation
  that hides the map with the pane open reddens the earlier pane check in the
  same suite first, so the guard stands without a spec. The remaining renamed specs (suite label or
  name only, mutation unchanged) were not re-run here; `pytest
  tests/test_mutation_witnesses.py` (49 passed) holds every anchor to one
  place.

## Issues

- Closed: `ISSUE_20261114_the_dag_still_lays_out_for_a_grid_beside_it_that_has_its_own_region_now`
  (resolved: the leaders, the jog zone and the centring went with the rails),
  `ISSUE_20261117_design_classics_rotary_glyph_arrow_is_crossed_by_a_chord_at_row_pitch`
  (closed without action: Classic is gone).
- Updated: `ISSUE_20261116_what_the_map_does_not_draw_yet` — "a layout for v1"
  and "retiring Classic" done; the fold control and the study route still open.
- Filed: `ISSUE_20261117_open_issues_naming_the_retired_rails_need_one_triage_pass`
  (66 open issues that name the rails, one pass for triage; also notes that
  the scene still posts `annotate:anchors` to nobody),
  `ISSUE_20261117_tolerance_stack_topology_comments_name_the_retired_joint_glyph_file`
  (fenced: two comments in `tolerance_stack/topology.py`),
  `ISSUE_20261117_v1s_fitted_map_draws_past_its_region_by_a_few_pixels`.
- Not filed, in the review page for Jeff: whether v1 wants a hand arrangement
  (its 59 route-through-box notes and two name collisions).

## How the work was split

Three forks rewrote the browser suites on disjoint suite functions while a
fourth rewrote `apps/viewer/README.md`; one fork's whole-file writes risked
clobbering a sibling's edits, so the rewrite was verified by the one whole
browser-tier run after all four had finished (45/45). Specs and pins were
reconciled once, centrally, from the census (`scripts/guard_enumeration.mjs`)
rather than by each fork.

## Found on arrival

The main checkout (`C:\workspace\tolstack`) was clean
(`git status --porcelain=v1 --untracked-files=all` printed nothing).

## Blocked actions

None.
