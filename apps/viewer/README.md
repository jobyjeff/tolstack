# tolstack — viewer (`apps/viewer/`)

**Review a stack or a topology without opening a `.json`.** One page,
`topology.html`, one left-rail nav tree: every topology with its studies as
children, and every stack as a leaf — a classic-only stack (most of them; a
topology is extra authoring, not a free side effect of having a stack) at the
top level, the one stack a topology also re-expresses nested under that
topology instead. Picking a topology or a study draws the rail diagram + grid;
picking a stack renders the classic elements table — folds, checks with
verdicts, notes and gaps, coloured by where each value came from. Either way,
clicking a row opens its full sourcing (citation, export provenance, drawing
crop) in the pane on the right, and every crop-bearing row also carries a
hover/click thumbnail trigger right there in the grid.

> **History:** this used to be two pages — `index.html` (stacks) and
> `topology.html` (topologies) — until handoff `viewer_consolidation`
> (2026-09-04) merged them into one page with two separate `<select>` pickers
> and a flat stack rail alongside it; handoff `viewer_v2_single_nav`
> (2026-09-08) then replaced both selectors and the flat rail with the one nav
> tree above, after Jeff found the two-selector page "a complete mess" to
> review in. `index.html` still exists and redirects to `topology.html`, so an
> old shortcut or bookmark still lands somewhere.

Static and build-free — plain HTML + classic scripts, no framework, no npm
build, no daemon of its own (the forge `apps/notes/` and `apps/dashboard/`
pattern). **Read-only**: neither transport below has a write path.

## Two transports, and the banner says which one is live

A load-time probe (`storage/http.js`, wired in `topology_app.js`'s
`chooseAdapter`) decides once, before the first paint, which way the page
reaches `data/projections/viewer/`:

- **served** — the origin that answered the page also answers a projection
  request. Probed against `topologies.json`, content-type checked (never
  status alone — a catch-all route can answer 200 + HTML for anything). No
  folder grant, no picker. Two mount shapes are known and both are tried, in
  order: drawing-checker's own (`http://127.0.0.1:8000/tolstack/viewer/topology.html`,
  a sibling `/tolstack/data/` mount), and a plain static server rooted at the
  repo (`python -m http.server` from `C:\workspace\tolstack`). This is a
  prerequisite for ever hosting the viewer, not just a local convenience.
- **FSA** — the original transport, and the only option on `file://`:
  **Connect folder** grants read access to the tolstack repo root via the
  File System Access API, exactly as below.

Served mode is tried first whenever the page is not on `file://`; FSA is the
fallback whenever neither served candidate answers (nothing built yet, or a
server with no matching mount). The banner says which is live — a served page
reads *"Served over HTTP — no folder grant needed"*; FSA mode is unchanged,
the connect/granted flow already says so. Neither transport offers a control
it cannot service (`adapter.capabilities()`, never the adapter's class): the
one real capability gap is that drawing-checker's own mount cannot reach
`docs/` at all (only the viewer app and its projection dir are mounted), so a
worksheet is unavailable there specifically — a repo-root static server can
reach it, and FSA always could.

## Launch (one-click, `file://`)

**Double-click `apps/viewer/topology.html`.** Classic scripts exist precisely so
this works with no server. For a desktop shortcut, run from the repo root:

```powershell
$ws = New-Object -ComObject WScript.Shell
$sc = $ws.CreateShortcut("$env:USERPROFILE\Desktop\Tolstack Viewer.lnk")
$sc.TargetPath = "$PWD\apps\viewer\topology.html"
$sc.Save()
```

## First use

```powershell
# 1. build what the viewer renders (fast, stdlib only)
venv-win\Scripts\python.exe scripts\build_viewer_projection.py

# 2. build the drawing crops (needs PyMuPDF -> drawing-checker's venv)
C:\workspace\drawing-checker\venv-win\Scripts\python.exe scripts\build_viewer_crops.py

# 3. for a system that has one, the topology + study folds (shares the crops above)
venv-win\Scripts\python.exe scripts\build_topology_projection.py
```

4. Open the page, click **Connect folder**, pick the **tolstack repo root**
   (`C:\workspace\tolstack`), grant **read**. The banner turns into a build line:
   *results built … · crops built … (26 resolved — 22 sha256-verified, 4 with no
   sha to check; 22 unresolvable)*, then *crops by rule: source_ref_export 22 ·
   spec_pile 4*. A resolved count on its own says nothing about whether anything
   was **checked**, which is the whole difference between a crop of the export a
   citation names and a crop of a file that happens to share its name — so the
   verification counts sit beside it, out of `crops.json`'s own `summary`.

All three steps are **wipe-and-rebuild** and each owns its own files, so any can
be re-run alone. Re-run step 1 after editing a stack JSON; re-run step 2 after a
new drawing export lands; re-run step 3 after editing a topology or study. The
banner says when each was built **and which tree built it** — the viewer never
guesses whether a projection is stale, it reports what the stamps say and lets
you judge.

### If a build refuses (exit 3)

`data/projections/viewer/` is **one directory shared by every live worktree**, so
since 2026-08-10 each builder that writes there stamps its own branch and HEAD
sha into its output and **refuses** to overwrite a projection built from a commit
this tree does not contain (`scripts/projection_provenance.py`, and
`ISSUE_20260806_concurrent_worktrees_clobber_the_shared_viewer_projection`,
which happened three times). The refusal names the other tree's branch, sha and
filesystem path and says what to run; the fix is normally *rebuild from that
tree instead*, or merge it in here first. `--allow-older-tree` overrides it,
loudly, for the one legitimate case — a deliberate rebuild from an older tree.

No folder grant handy? `topology.html?mock=1` renders a seeded demo — a
mechanism plus the nav tree's own demo classic-only stack — that exercises
every provenance state. Nothing touches disk.

### The stale-pair alarm never prints a command (`viewer_rebuild_affordance`)

Pasting `venv-win\Scripts\python.exe ...` into PowerShell straight from a web
page is not acceptable UI design (Jeff, 2026-09-10) — and the pasted text had
a bug of its own besides: two commands landed on one line with no separator,
because they were adjacent inline `<code>` elements with nothing between them.
The alarm box (`views/banner.js`'s `provenance()`) never shows a rebuild
command again, in either mode:

- **served, with drawing-checker's rebuild endpoint live** (probed —
  `adapter.capabilities().rebuild`, never assumed from the mount matching) —
  a **Rebuild** button drives the whole thing: click, POST, poll status,
  reload on success, a fixed plain-words sentence on failure.
- **everything else** (`file://`, a plain static server, or the mount without
  the endpoint) — one sentence, nothing to type.

## The one rule: the viewer computes nothing

`tolerance_stack.fold()` is the only arithmetic in this repo — *"there is exactly
one line where a sign can be wrong"* (`ARCHITECTURE.md`). A second fold written
in JavaScript would be a second such line, so there isn't one:

- every interval and every verdict is read out of `results.json`, which
  `scripts/build_viewer_projection.py` produced by calling `fold()`;
- element `nominal`/`min`/`max`/`lmc`/`mmc` are printed **as transcribed** —
  `String(n)`, no `toFixed`, no unit conversion, no band derived from limits;
- even the rounding happens in Python (fold outputs are rounded to 6 dp, term
  coefficients to 9 dp, at build time) so the browser is never the thing deciding
  how a number reads.

`tests/test_viewer_projection.py` pins the embedded stack as byte-identical to
the authored file, and re-asserts the ground-truth numbers *through* the
projection.

## The one nav

The left rail (`#navtree`, `views/nav.js`) is a single tree, not a picker plus
a separate stack rail: every topology lists its studies as children, and every
stack is a leaf. Clicking a topology or a study draws the rail diagram + grid
(topology mode); clicking a stack switches the centre pane to the classic
elements/paths/checks/gaps view (`views/stack.js`, stack mode) instead. The
active node is the one thing driving the page — there is no second "which mode
am I in" state to keep in sync with it.

Most stacks have no topology re-expressing them — a topology is extra
authoring for a mechanism-shaped question, not a free side effect of having a
stack, and today only `stack_vpa_output_to_pitch_plate.json` does
(`topology_vpa_output_to_pitch_plate.json`, the L1 proof). Those classic-only
stacks are top-level leaves of the tree; the one stack a topology also
re-expresses is nested as a child of that topology instead, alongside its
studies, rather than being a second top-level leaf — but it is still there,
one click under the topology it also is, and not merged into or hidden by it:
its own authored `checks` block (a worst-case verdict against a criterion) has
no field in the topology projection at all — DAG_TOPOLOGY.md's L1 proof
compares *totals*, never a verdict — so making it unreachable would drop that
check off the page entirely. `VA.navTree` (`topology.js`) computes which stack
that is by reading the linkage already on hand — an edge that re-expresses a
stack element carries `crop_key: {stack, element}`, and that IS the "this
stack has a topology" fact, so nothing new is authored to say so.

## The topology mode

The third archetype's surface — read `docs/DAG_TOPOLOGY.md` first; this section
is only about how it is drawn. A topology or a study, picked from the nav tree
("The one nav" above), draws this; a stack picked from the same tree (most
stacks — no topology re-expresses them) switches to the classic elements table
instead. Building it:

```powershell
venv-win\Scripts\python.exe scripts\build_topology_projection.py
```

Then reload the page. (`topology.html?mock=1` runs a demo mechanism with no
disk access, exactly like the classic view's own demo.)

### The row model: edge rows, merged components, and leader lines

**A dot is an interface; a bar is the dimension between two of them; a grid row
is a dimension; a leader line is a part boundary.** Since handoff
`viewer_leader_line_grid` (2026-09-10) the grid holds **one row per edge** in
walk order — compact and evenly spaced — while the DAG keeps its own layout
(one slot per node and edge today; the coming edge-length scaling modes will
make it deliberately uneven). The two are tied together by **jogged leader
lines**, GD&T ordinate-dimension style: orthogonal segments from a node's dot,
across the jog zone, into the seam between the two grid rows that interface
separates.

**A leader is drawn only at a part boundary, and that omission IS the
component grouping** (locked 2026-09-10; it supersedes the earlier
boundary-lasso question). A node whose adjacent edges all carry one `part` —
several tolerances on one feature, size + flatness on one distance — is
*internal* and gets no leader (`VA.internalNodes`, topology.js); a node whose
edges span two parts, or a part and a clearance, gets one. The grid says the
same thing in table form: its leftmost **component** column is one merged cell
per contiguous same-part run (`rowspan` over the run's tolerance sub-rows,
`VA.gridPlan`), and a group breaks exactly where the part changes or a leader
lands. One honest consequence: the depth-first walk can revisit a part on a
later branch, and each contiguous run gets its own merged cell — the real
pitch system's 12 parts render as 18 runs: `hub` as two, its pitch plate as
three, `gas_spring` and `blade_root` as two each (all four splits pinned by
the `[real]` fixture tier).
Reordering the grid to force literally one row per part would cross the
leaders and break the walk-order correspondence, so the walk wins.

Nodes have no grid rows any more. An interface is clicked on its dot or its
leader (both open the preview pane, which also says which side of the leader
rule the node is on); a chain of n edges is n rows, which is roughly the row
count of the Excel stack it replaces.

The grid itself is a real `<table>` (since 2026-09-04, handoff
`viewer_consolidation`) with real `<th>` headers, not a div-flex grid styled to
look like one — a rectangular selection of it pastes into Excel as columns, cell
for cell, which only genuine table markup does. The values are `nominal` /
`min` / `max`, three columns, printed exactly as transcribed (`VA.fmt`: no
`toFixed`, no band derived from the limits — the same rule the classic elements
table follows). Column widths live on a shared `<colgroup>`
(`views/topology.js`'s `COLUMNS`), one array driving both the head table and the
body table so the two cannot silently disagree about how wide a column is.

Every row whose edge carries a `crop_key` — it re-expresses a committed stack
element — gets a **crop** cell at the row's right end: once the PNG is fetched
(`ensureThumbImages`, topology_app.js) the trigger *is* the thumbnail, the
actual crop of the tolerance annotation inline on the row; before that, or for
a crop that cannot resolve, it is the same stateful text button the classic
elements table has always had (`crop-trigger`, `views/crop.js`'s popover,
shared — hover/click behaviour unchanged; richer hover cards belong to the
staged `viewer_hover_cards_and_deep_links` handoff). An edge with no
`crop_key` — authored inline in the topology, or a derived gap — gets nothing
at all, never a placeholder image: showing one would read as "not built yet"
when the truth is "no document to crop," and the two are different facts (see
"The preview pane reuses the crop plumbing" below, which draws the same
distinction in the pane on the right).

### The rails: a column is a branch, not a part

The serialisation is a depth-first walk from the **document's first node**, with
rail continuity: a branch keeps its column until it rejoins or ends. So the
author's node and edge order is the layout's spine — put the datum first, and
reordering an `edges` array is how you steer the picture without touching a
value. There is deliberately no cleverness to fight: a heuristic root would move
the whole diagram when an unrelated edge is added.

Three shapes come out of it, and all three are in the projection:

* **a fan-out** at a fork — a short curve into a freshly allocated column, which
  then runs as a rail from the fork downwards, past whatever the first branch's
  subtree puts on screen;
* **a loop closure** — a long dashed curve back up to an interface the walk has
  already drawn. There is exactly one per independent cycle (|E| − |V| + 1),
  which `tests/test_topology_projection.py` checks;
* **column reuse** — a column is freed when its branch ends and the next
  allocation may take it, so a column holds a *list* of disjoint rail spans
  rather than one extent. Measured in `review/dag_viewer_poc`: on the two
  committed topologies reuse does not currently fire at all — nine allocations
  over nine columns for the pitch system, two over two for L1, and disabling
  reuse entirely leaves both numbers unchanged. It is the mechanism the
  disjointness invariant guards, not an explanation of today's widths.

The L1 grip stack draws as **two rails that rejoin**, not one, and that is the
truth about it: every interface has exactly two edges — the five clamped members
in series, the bolt's grip running parallel to them, and the derived `shank_out`
gap closing the ring. The single-rail case is its *study*, which is what
"Showing: study chain" draws.

### The colours: there is no lane palette, and that is deliberate

Jeff's second reference image colours a rail per branch. This page does not.
Green, amber, red and magenta are **provenance** on this surface and nothing else
may wear them; what is left of a validated categorical palette after removing
four of its eight hue families cannot separate nine rails, and the pitch system
has twelve parts, which is past any categorical palette's cap regardless. So:

* rails are neutral, alternating two greys by column parity so two crossing rails
  can still be told apart;
* **an edge's bar wears its citation's confidence**, which makes the rail diagram
  itself a provenance map — a column of red bars is a mechanism nobody has
  traced, visible before a single row is read;
* a `gap` bar is dashed (it crosses between lanes and has no rail of its own) and
  a **derived** gap is dashed and thin, because it carries no value at all: it is
  the quantity a study computes;
* the selected study's path is the accent, and that is a binary, so it needs no
  palette.

Part identity is carried as text, on the row and in the preview pane.

### Studies

Picking a study highlights its chain, numbers each row with **its place in the
sum** — which is generally not the row order, because the rows are a walk of the
whole graph — prints each edge's own signed and scaled contribution, and puts the
totals at the bottom. "Showing: study chain" re-lays the rows as
`StudyResult.chain`: one rail, the sum's own order.

**A study that refuses to sum is a result, not an error.** `BranchAmbiguity`,
`BrokenChain`, `CycleDetected` and `UnitMismatch` each render as a block carrying
the exception's own message — which names the node and the candidate edges — plus
what to do about it. An author lassoing interactively will hit branch ambiguity
constantly, and the message *is* the feature: which parallel path binds is a
mechanics question this tool does not answer (`docs/DAG_TOPOLOGY.md`, "Not a
solver").

### The preview pane reuses the crop plumbing, and says so when it cannot

An edge that re-expresses a committed stack element **is** that element: same id,
same citation, same crop. The projection derives a `crop_key` — the `(stack id,
element id)` pair `crops.json` is keyed by — and the pane runs it through the
stack viewer's own `VA.cropFor`, so the resolved / unresolvable / not-built /
stale-index quartet is unchanged.

An edge with no key is **not** a stale index and must not read like one. It says
which of the two it is: a dimension authored in the topology (in no stack, so no
crop index covers it) or a derived gap (no value to cite). A citation of kind
`assumed` says outright that there is no document behind it to crop — which is
most of the pitch system.

### Row/leader correspondence is the claim, so it is measured

A grid row, its rail bar and the leaders around it describe the same graph — but
since `viewer_leader_line_grid` they are deliberately **not** at one y (the grid
is compact, the DAG is not), so the measurable contract is the leaders': each
leader's node-side end sits on its own dot's centre, and its grid-side end sits
on the seam of the boundary row it names (`data-boundary-edge` on the hit path).
Three things enforce it and none is a stylesheet:

* the row's `height` is set **inline** from `VA.RAIL_METRICS.rowHeight`, the same
  constant `VA.leaderGeometry` computes every seam from — and the node ends come
  off the same keyed position store (`VA.rowPositions`) the dots were drawn from,
  whatever the edge-length mode did to the DAG above;
* every cell's content is clamped to that pitch (the chips and crop wrappers) —
  a `<tr>`'s height is a floor, not a cap, so one overgrown cell would silently
  walk every seam below it off its leader;
* the rails, the leaders and the rows live in **one scrollport**, so "scrolling
  keeps them locked together" has nothing to synchronise.

`scripts/run_viewer_browser_tests.mjs` then measures it (`CORRESPONDENCE_IN_
PAGE`): the leader paths' real geometry (`getBBox`) against the dot boxes and
row boxes, every topology, in both layouts, after scrolling, at both densities.
That is the check no DOM shim can make, and it is why the browser tier is not
optional here.

### The DAG owns the main area

`HANDOFF_20260904_dag_viewer_vertical_budget.md` gave the graph pane
(`.tv__scroll`) a 10-row `min-height` floor because the chrome above it — a
provenance alarm banner, two `<select>` pickers, a totals panel that could
grow to 260px, an always-open legend — could otherwise squeeze it to a
handful of rows. `HANDOFF_20260908_viewer_v2_single_nav.md` removed the floor
instead of raising it, by shrinking the chrome it was floored against:

* the two `<select>` pickers and the flat stack rail retired into the one nav
  tree (`#navtree`, "The one nav" above), which sits *beside* the DAG pane, not
  above it — it costs the page horizontal width, not vertical height;
* the provenance alarm (`views/banner.js`) collapsed from an always-expanded
  block (headline + alarm list + two `<code>` rebuild commands) to a one-line
  badge — "Data is older than the latest code — needs a rebuild" — with the
  full detail behind a `<details>` a reader opens on purpose;
* "How to read the rails" moved into `#legend-dialog`, a `<dialog>` opened from
  a topbar button, so it no longer reserves a line of layout even collapsed;
* the totals footer (`.tvtotals`) demoted from a 260px panel to a slim,
  always-visible strip of chips — the same folded numbers, one line, with the
  rule sentence and a study's own `notes` behind their own `Details` toggle.

The topology's own joint block (`#topojoint`, deliverable 4) is new chrome
above the pane, not removed chrome — but it costs one collapsed `<details>`
line even for the 4 of 5 topologies that carry a real one, the same as a
stack's own joint block always has, so it does not reopen the budget the rest
of this section closes.

With that chrome capped to roughly a topbar, a one-line banner, a toolbar
strip, a one-line joint block and a slim totals strip, `HANDOFF_20260909_
viewer_error_surface_and_layout.md` finished the job the floor and its
removal were both fighting toward: the DAG pane (`.tv__scroll`) no longer
clips its own rows at all. Every row renders at full height and contributes
that height to the **document**, which scrolls once the content is taller
than the viewport — the same "one page" model the rest of the site already
used. The **left nav is the one region still capped to the viewport**
(`position: sticky; max-height`) and scrolls independently; everything else,
this pane included, just gets longer. `scripts/run_viewer_browser_tests.mjs`'s
`testHeightBudget` pins this directly: `.tv__scroll` carries no `overflow-y`
of its own, its rendered height is never less than its own row count demands,
and — with the real `pitch_system` loaded, which has more rows than a 900px
viewport can show — the *document's* scroll height exceeds the viewport's,
proving the growth actually reached the page rather than clipping inside the
pane.

The grid's own columns (`COLUMNS`, `views/topology.js`) sum to well over a
typical pane's width and always have — that is a **separate, pre-existing**
axis this handoff did not touch. `.tv__rails`'s own `position: sticky; left:
0` (so the rail column stays put while the grid scrolls sideways) needs a
scrolling ancestor to mean anything, so the header and the body still share
one **horizontal-only** scrollport, `.tv__hscroll` — `height: max-content` is
what stops that scrollport from being a second place a row count could get
squeezed: an element with `overflow-x: auto` is a scroll container, and a
scroll container's automatic content-height contribution to its own flex
ancestor is zero by spec, not its actual content size, which is exactly the
"squeeze to fit" shape the rest of this section retires. Scrolling remains
vertical-at-the-page, horizontal-at-the-grid — two axes, two scrollports, on
purpose.

Scrollbars are themed to match the page everywhere they still appear
(`scrollbar-color`/`scrollbar-width` plus the `::-webkit-scrollbar` pseudo
pair, both set once at `html`/`*` in `style.css` so no scrollable box needs
its own rule).

**The worksheet** moved into its own `<dialog>` too (`#worksheet-dialog`),
for the same reason as the legend: opening it can no longer compete with
anything else for space, because a `<dialog>` sits in the browser's own top
layer, entirely outside `.tv`'s flex column.

**Row density** (`VA.ROW_DENSITIES`, `topology.js`) is the toggle that is still
worth having even with the floor gone: "Rows: Comfortable / Compact", on the
toolbar strip above the DAG pane (`#toolbar`, next to the layout-mode toggle),
at 26px and 16px respectively — compact turns the pitch system's 45-slot DAG
into ~720px, a single screen instead of several (its grid, at one row per edge,
is shorter still). Row height is one number that has to
move in three places at once (documented where it bites, `topology.js`): `VA.
RAIL_METRICS.rowHeight`, the `--tv-row` CSS variable, and the grid's inline
row heights. `VA.applyRowDensity` mutates `RAIL_METRICS.rowHeight` **in
place** rather than replacing the object, so the SVG geometry and the inline
row heights — both of which hold a reference to that same object — pick up
the change with nothing to re-wire; `topology_app.js`'s `applyDensity()` is
the one DOM write left, setting the CSS variable to match. Density is a
display preference, not a fact about a topology or a study, so switching
topologies never resets it.

### A render crash cannot leave the page silently unchanged

`HANDOFF_20260909_viewer_error_surface_and_layout.md`: a live incident had a
stale-cached script throw from *inside* `render()`, and every path that could
have reported that — the boot chain's `.then(render)`, `onReload`'s
`load().then(render)` — had nothing after it to catch a throw, so the DAG
pane just stayed empty with a Reload button that did nothing. `render()` is
now one seam: it calls the real paint in a `try`/`catch`, and a throw from
*anywhere* inside it — not just a rejected promise before it runs — renders
`VA.renderCrashBanner` instead (plain words, the exception's own message, and
the "hard reload may clear a stale cache" hint, since that is what actually
fixed it). `onReload` and the boot chain both gained the `.catch(err => state.
error = …).then(render)` shape `gesture()` already had. One seam, not a
`try`/`catch` in every view — `scripts/run_viewer_browser_tests.mjs`'s
"render crash shows the banner" tier proves it by forcing `VA.renderTopoPane`
to throw and asserting nothing escapes as an uncaught page error.

### Whole-edge hover, and an experimental values-only row mode

Two related pieces from the same handoff. First, a fix: a rail bar's
*visible* stroke is dashed wherever its citation is a gap or derived
(`.rail__bar--gap`/`--derived`), and under `pointer-events: stroke` a dash's
own gap used to hit nothing — only a lucky hover over a solid segment of a
long edge showed its tooltip. `.rail__barhit` is a second, invisible line per
edge (`stroke: transparent`, wider, `pointer-events: stroke`) drawn over the
same coordinates, carrying the hover title and the click handler instead; the
visible bar is untouched.

Second, an experimental **view setting, default off** (the toolbar's third
button, "Rows: labelled" / "Rows: values only", `state.edgeValueOnly`): Jeff's
observation that this page used to run about 2× a typical Excel stack's row
count, because a spreadsheet lists only the dimensions *between* interfaces,
never the interfaces themselves. `viewer_leader_line_grid` retired the node
rows outright (the grid is edge rows only now — the bigger half of the same
observation), and this toggle remains as the smaller half: an edge's own label
is just its two adjacent node labels concatenated, so it hides it and lets the
row read as values only, with the label moved to the row's own hover
(`VA.edgeHoverTitle`, the same text `.rail__barhit` already shows — one hover
surface, not two). The merged component cell, and a row the projection cannot
resolve (`missing()`), are unchanged either way: hiding a label is only ever
dropping a redundant concatenation, never a grouping and never a diagnostic.

### Edge-length scaling: three modes, one keyed position store

The toolbar's fourth button (`#edge-length-toggle`, `state.edgeLengthMode`,
`VA.EDGE_LENGTH_MODES` in `topology.js`) cycles how much vertical extent a
dimension bar gets:

* **uniform** — the default and the classic rendering: every slot is one
  `rowHeight`.
* **tolerance width** — a bar's length ∝ its dimension's band (`max − min`,
  falling back to `2 × plus_minus` where min/max are absent).
* **feature size** — a bar's length ∝ its dimension's nominal.

The scale is relative to the serialisation on screen: the largest value renders
at `EDGE_LENGTH_SCALE.maxRows` row heights, everything else in proportion — and
**nothing renders shorter than one row height** (`floorRows`). The floor keeps
a zero/tiny/unstated edge clickable (whole-edge hover is a landed contract) and
keeps every node at-or-below its uniform y, which is what lets the leaders keep
rising in every mode. A bar sitting at the floor is **not a measured
proportion** and is never allowed to read like one: it gets
`.rail__bar--floored`, a drafting-style break mark (`.rail__break`) across its
middle, and a hover title that says "not to scale" (`VA.flooredEdgeTitle`); the
legend states outright that lengths are indicative. The variation-only edges
the real workbooks produce (`nominal: 0.0`, the provenance note saying the
nominal is unstated) are exactly this case — under feature size the whole real
`pitch_system` floors, honestly marked, rather than inventing a scale.

The mechanism under all three modes is one **keyed position store**:
`VA.rowPositions(layout, topoProj, mode, metrics)` computes every slot once —
node id → y, edge id → `{y1, y2, length, floored}` — and both geometry passes
(`VA.railGeometry`, `VA.leaderGeometry`) consume the store rather than
re-deriving `row × rowHeight` inline. The **grid never moves**: its rows stay
at `rowHeight`, evenly spaced, and the leaders' grid-side seams stay
`boundary × rowHeight` — only their node-side ends follow the store, which is
the stretch the jogged leaders were built to absorb. The store is also the
seam the future study-selected animated rearrange needs: geometry is a pure
function of `(layout, metrics, positions)`, so an animator can interpolate
between two stores and redraw per frame with nothing else changing. A display
preference like density: switching topologies never resets it, and the mode
button only ever re-renders (no scroll rewind).

### Generated checks are generated in Python too

Some archetypes do not author their checks: a `thermal_fit` stack ships an empty
`checks` array on purpose, and `tolerance_stack.thermal` builds the term lists
from its own block at load time so the file cannot carry a stale coefficient. The
projection dispatches on the stack's `archetype` and runs that loader
(`ARCHETYPE_LOADERS` in `build_viewer_projection.py`) — so the checks are
generated **once, in Python, by the same code the tests pin**, and the viewer
renders them like any other. There is no archetype logic in JS.

Their terms carry real **coefficients** — `2` because a sleeve OD is bore + 2 ×
wall, a soak factor `1 + ΔT·α` per member per temperature, and a `k` / `1−k`
stiffness split — so every weighted term prints its weight
(`+ 2.0010712 × sleeve_wall_lower`). A weighted term rendered as a bare
`+ sleeve_wall` would look readable and be wrong by a factor of two, which is
worse than rendering nothing at all. The identical term table prints outside the
browser with:

```powershell
venv-win\Scripts\python.exe tests\debug_report_thermal_fit.py --terms --markdown
```

A stack declaring an archetype the projection has **no** loader for still renders
zero checks — and says exactly that, rather than "no checks".

## Reading the colours

Provenance is the only saturated colour on the page; everything else is grey.

| | meaning |
|---|---|
| green `traced` | the value comes off the cited document |
| amber `inferred` | a reading or an argument sits between the document and the value |
| **filled red `UNTRACED`** | no document backs it. Filled, plus a row tint — an untraced value has to survive being skimmed |
| **filled magenta `NO CITATION`** | worse than untraced: no `source_ref` at all (code: `no_source_ref`) |
| **filled magenta `EXPORT UNESTABLISHED`** | the citation exists and the stack says outright that the *bytes* behind the value cannot be identified. A separate axis from confidence: an `inferred` citation can have a nailed-down export and a `traced` one can have none. See below |
| **filled magenta `CTE NOT TRANSCRIBED`** | a material whose `values_status` says nobody has read the CTE off a source |
| dashed blue `zero-width band` | `min == max`; no document gives a tolerance, so every interval it feeds is a **lower bound** on the real spread. A separate axis from confidence, not a fourth confidence |
| striped card + amber `BUDGET` | the check's `verdict_scope` is `budget`: a term is missing from the model, so read the magnitude as a budget for the missing term, never as a verdict on the joint — a `fail` here is true of the model and false of the hardware. The missing terms are printed on the card, directly under the numbers they are a budget for. Read off the schema (`complete: false` + `excluded_terms`) since 2026-08-13, never off the prose |
| dashed card + amber `NOT A RESULT` | a `[SENSITIVITY]` probe: the same check with an undocumented input moved, so you can see how much of the answer rests on it. Its verdict is about that hypothetical, not about the joint |
| blue `checks GENERATED` | the term lists are not in the stack JSON — the archetype's loader built them (see above) |
| monospaced weighted chip | a term whose coefficient is not 1: `+ 2.0010712 × sleeve_wall_lower`. Hover says what a coefficient can be |

A path or check also shows the **weakest** confidence among its expanded inputs:
a check fed by four traced elements and one untraced one is an untraced result.

## "Annotate this →" — jumping into the 3D tool from a gap

An edge whose confidence is `UNTRACED` or `NO CITATION` (the two loud gap
states above) gets an `annotate this →` link in the topology-mode detail
pane (`views/topology.js`'s `renderEdgeDetail`, `VA.needsAnnotation`) — a
traced/inferred edge already has a citation, so the link only offers
something when there is a gap to close. The link (`VA.annotateLink`, the
same builder the toolbar's own "Annotate →" link uses) is relative
(`../annotate/index.html`), carrying `topology`/`edge`, plus `study` when one
is selected and `isolate=<part>` when the edge names an owning part — booting
`apps/annotate/` with that study open, the edge selected, and the part
isolated if a mesh for it happens to be installed (handoff
`annotate_deep_link_and_part_filter`; `apps/annotate/README.md`'s own "Deep
link in" section is the other end of this). A binding made there is
identity, never a value source (`docs/ANNOTATION_SURFACE.md`) — this link
does not change what number this page shows, only helps someone establish
which physical feature the row means.

## Selecting an element

The elements table shows only a confidence chip, a kind chip, a short one-line
where-ref, and (for the states that cannot wait) a loud export/identity chip —
that is the whole compact row. Click anywhere on a row to select it: the row
gets a visible outline, and the pane on the right (`views/detail.js`) fills in
with everything the row does not have space for — the callout as printed, the
citation's own note in full (not clamped), the export-provenance block below,
and the drawing crop itself, rendered inline rather than only behind a hover.
Nothing is selected when the page loads; the pane says so and tells you to
click a row.

## Which bytes the number was read off

A citation says *where on a page* a value is written. `source_ref.export` says
*which file that page was in* — and the two are not the same claim, because
filenames get re-exported over, so a drawing number and a revision do not
identify bytes. Selecting an element's row shows the export block in the right
pane, beneath its citation:

| state | what the block says |
|---|---|
| `established` | *export established: `X.pdf`* · **sha256 recorded** (first 12) · the drawing-checker runs that consumed it, or *no run has consumed this export*. The sha **is** the identity; runs are corroboration, and 15 of the 22 live established *citations* have none — 6 of the 9 distinct exports they name. |
| `unestablished` | **filled magenta, on the row's chip AND on the panel's block**: *EXPORT UNESTABLISHED — which file this value was read off cannot be identified*, with the recorded `why` unclamped beneath it. The stack is stating outright that the bytes behind this number are unrecoverable. |
| no `export` key | *no export block — this citation names no exported file, so nothing here identifies the bytes the value was read off*. Stated, not alarmed: 22 of the 48 live citations are here — 21 workbook, 1 assumed — and for a spreadsheet or an assumed value there is no exported PDF to name. |
| no `export` key, `identity_rule: "spec_pile_filename"` | *Spec-pile document: identity by filename (append-only pile)*, with the argument beneath it. The **deliberate exception** — see below. 4 live citations, all `traced`. |
| anything else | loud: *export status `"X"`, which this viewer has no branch for*. `VA.EXPORT_STATUSES` is a table for the same reason `VA.CROP_RULES` is — an enumerated field needs a total function, because a silent default cannot be told from a handled case by reading the code. An identity rule the viewer has no branch for is loud the same way, through `VA.IDENTITY_RULES`. |

### The spec-pile exception

`data/inbox/specs/` is **append-only**: nothing there is renamed, deduplicated or
re-exported over, so for a document in the pile the **filename identifies the
bytes** and there is no export to name. `SourceRef.export` says exactly that —
mandatory for `drawing`/`parts_list`, optional for `spec`.

Four citations are `traced` in that state, and until 2026-08-13 the rule that
makes the pair legitimate was statable only inside a **crop entry**
(`resolved_by: "spec_pile"`), one hop from the row a reader is looking at — so
the row read `traced` beside "nothing here identifies the bytes" and both halves
were true (`ISSUE_20260812_four_traced_spec_citations_carry_no_export_block`;
second sighting of "a fact about the citation reachable only through a crop").

`build_viewer_projection.py` now hoists it: a citation of `kind: "spec"` that
names no export gets a **derived** `identity_rule: "spec_pile_filename"` on its
`elements[]` row, and the viewer renders the sentence in place of the no-export
one. Nothing is authored and no vocabulary widened — `export.status` is still two
values and the four citations still carry no export block, which is the 2026-08-06
position (*a drawing number plus a revision does not identify bytes*) left intact.
An `export` block still wins wherever there is one: three live `spec` citations
carry one and are unaffected.

The rule itself is on the page, not only here: **"How to read the sourcing
column"**, the collapsed legend above the elements table.

Two deliberate limits:

* the block says a sha is **recorded**, never *verified*. The viewer cannot hash a
  file, so that is the only honest claim available to it; `sha256 VERIFIED`
  belongs to the crop hover below, where a script really did compare bytes.
* a run id is a **link** only where the element's own crop resolved through that
  run. An export carries a run *id* (`20260803_145243`); drawing-checker addresses
  a run by its *directory* name (the id plus the drawing), which only the crop
  entry knows. Every other id prints as plain text with a hover saying why —
  building a URL from a prefix would be a guess, which is the class of mistake
  this whole surface exists against.

The export block renders whether or not a crop resolved, which is the point: until
2026-08-12 these facts appeared **only** in the crop popover, so a citation whose
crop could not be pinned said nothing at all about its export — a fact about a
*citation* reachable only through a *crop*
(`ISSUE_20260811_viewer_shows_nothing_for_source_ref_export`).

## Materials — the provenance of a *number*

A stack whose archetype has **material properties** also gets a Materials table:
the `materials.json` entry verbatim (designation, CTE, the range it is a mean
over) beside its own sourcing — and the CTEs are the least-traced numbers in this
repo, so the table speaks the same colour language as the elements table. A
thermal fit's answer is a CTE *difference*, and the soak factor in a term's
coefficient is `1 + ΔT·α` from that table with the ΔT on the check card.

A material's *name* and its *number* have different provenance, and the sourcing
cell keeps them apart:

* **`values_status`** — what kind of record the CTE column is. `inline`: the
  number is the record. `library`: it is a **cross-check** of the projection named
  in `library_ref`, not the record. `not_transcribed`: **filled magenta** — nobody
  read it off anything, so a number in the column is a placeholder and since
  2026-08-12 the schema lets the entry state none at all — though not one you
  will ever meet here, because a material with no CTE stops its stack loading
  (`thermal.material_soak_factor`) and so never reaches a projection. All three
  rendered identically until 2026-08-12.
* **`library_ref`** — printed whenever it is set, *whatever the status says*:
  `spec_library:NAS6403U11D` is the provenance of a number, and reading the field
  only under `values_status: "library"` would be the same silent drop one field
  along. `library` with **no** `library_ref` is a self-contradiction the schema
  permits, so the viewer says so loudly.
* **the two temperature ranges, paired** — the range the source *quoted* the mean
  over, and the ranges this stack *applies* it over (`applied_over_c`, in accent
  blue beneath it). A mean CTE quoted over 20…100 °C and applied over 20…−20 °C is
  the quiet way a thermal answer goes wrong. The viewer prints both and compares
  neither: deciding whether one covers the other is arithmetic, and arithmetic
  happens in Python.
* **`designation_source`** — where the *name* came from, with its callout and
  note. Its confidence chip has been on the row since the table shipped; where the
  name came from had not.
* **`cindas_request`** — the outstanding ask for a real value, clamped, where the
  entry records one. A CTE traced to nothing whose recorded next step is invisible
  is the same defect one layer down.

## Hover crops — and the same crop, inline, in the right pane

Each element has a **drawing crop** button, kept on the compact row alongside
the crop-trigger's own hover behaviour: hover, focus or click it (✕, `Esc`
or an outside click closes it). The popover shows the pre-rendered crop, *how it
was placed*, and click-throughs: the drawing-checker run page when a run is
behind the citation (needs `cmd /c serve.bat` in that repo — see
`config.js`), plus the source PDF as a `file://` link and as a copyable path.

Selecting the row does the same thing without a hover: the right pane fetches
and renders the same crop **inline**, with the same placement text and the same
links, so the image is visible the whole time the row is selected rather than
only while the pointer sits on the trigger.

`crops.json` reports four different answers and the difference matters:

| status | what it means |
|---|---|
| `resolved` | there's a crop |
| `unresolvable` | the citation could not be pinned to a page **without guessing** — a finding about the stack, with the reason |
| `not-built` | nobody has run `build_viewer_crops.py` — a chore, and the popover shows the command |
| `no-entry` | `crops.json` predates this element, i.e. it's stale |

A resolved popover then says **which rule** pinned the document and **whether
the bytes were verified** — a crop of a *guessed* export looks perfectly correct
on screen, so this is the fact the hover exists for:

| `resolved_by` | what the popover says |
|---|---|
| `source_ref_export` | *read from the export this citation names, `X.pdf` — sha256 VERIFIED*. The rule every export-resolved crop in the repo uses; the sha is mandatory under it, so a crop can only exist if the bytes matched. |
| `spec_pile` | *from `data/inbox/specs/` by filename — no sha256 to verify*. The pile is append-only, so a filename **is** the identity; there is no sha to check and the line says so rather than implying one passed. |
| `joint_export_run` | *LEGACY RULE: export pinned by the joint block, not by this citation*. Still in the crop script for a stack written before 2026-08-06 (no `source_ref.export`, `document` == `joint.assembly_drawing`, and a `joint.assembly_export` naming a drawing-checker run). No stack in the repo reaches it today. |
| anything else | *resolved by `"X"`, a rule this viewer has no label for* — loud, and `VA.unlabelledCropRules()` puts it in the banner too. `provenance.sources_used`, deleted from the crop script on 2026-08-06, gets exactly this treatment: a branch for a value nothing can carry reads as "this case is handled". |

Placement, in order: the **cited printed zone** (padded a cell) when the sheet's
border grid is legible; else a **unique callout-text match**; else the **whole
sheet**, saying why. When a zone is cropped, the popover also says whether the
callout's own text was found inside that cell — corroboration, not a
requirement (a parts-list nomenclature is cited at the balloon and lives on the
parts-list sheet).

## Worksheets

The worksheet ("the agent's report") opens in its own `#worksheet-dialog`,
from the **Show worksheet** button in the topbar — offered in EITHER mode,
exactly when the selected node's own projection names one
(`worksheet_file`). A topology can carry one too, since `topology_schema_v1`
(2026-09-08): `pitch_system`'s own is `WORKSHEET_end_stop_graft.md`,
`provenance.worksheet`-declared on the topology file the same way a stack's
is. The button hides for a node with none, in either mode — it used to be
stack-mode-only, before a topology had a `worksheet_file` field to read. The
worksheet used to live in the right-hand pane; that pane now shows an
element's or edge's full sourcing instead (see "Selecting an element" above).
It moved again with `viewer_v2_single_nav` (2026-09-08), from an inline
`<details>` below the elements table into a `<dialog>`: opening it can no
longer compete with anything else for space — a `<dialog>` sits in the
browser's own top layer, outside the page's flex column entirely — closed by
default so it never covers the table uninvited, but one click away, not gone.

`WORKSHEET_*.md` is authored prose, so it is read **live** from
`docs/tolerance_stacks/` or `docs/topologies/` rather than copied into the
projection: edit the markdown, reload, see it. Rendered with the
dependency-free markdown renderer vendored from forge's notes app
(escape-first, no sanitize pass). A stack or topology with no worksheet of
its own says so instead of borrowing a neighbour's.

Which sheet belongs to a stack or a topology is decided by its own
projection builder, two rules deep and identical between the two: a
`provenance.worksheet` in the file wins (one worksheet legitimately covers
several documents — `WORKSHEET_hub_bearing_thermal_fit.md` covers both
thermal configurations, which are one analysis), otherwise `X.json` →
`WORKSHEET_X.md` by name. The pane says when the sheet was *declared* rather
than matched, so a name that does not match what it covers is explained
instead of suspicious.

A topology's own `joint` block (the same free-form assembly/context shape a
stack's is) renders above the DAG pane, collapsed by default — `{}` when a
topology spans more than one physical joint, as `pitch_system` does, which
renders as "no joint block" rather than an empty one. A study's own authored
`checks` (verdict vs. criterion) do NOT render anywhere yet: the projection
has no field for one (`ISSUE_20260908_topology_projection_never_emits_a_
studys_checks.md`) — the two-thirds of this deliverable the projection
already supports (`joint`, `worksheet_file`) are wired; this third is not.

## Tests

Two tiers (forge `CONVENTIONS.md` §7):

```powershell
node apps\viewer\run_tests.cjs                          # fast tier (node + DOM shim)
node apps\viewer\run_tests.cjs --repo C:\workspace\tolstack   # ...from a worktree
venv-win\Scripts\python.exe -m pytest -q                # runs the fast tier too

npm install                                             # once: playwright-core, no browser download
node scripts\run_viewer_browser_tests.mjs               # truth tier (installed Chrome, file:// + http)
node scripts\run_viewer_browser_tests.mjs --repo C:\workspace\tolstack   # ...from a worktree
```

The truth tier takes `--repo` for the same reason the fast tier does: it drives
`topology.html` against the **real** `topologies.json` as well as the demo, and
that file lives only in the main checkout. Without it the topology page's real
tier reports itself skipped and the demo tier still runs. The app's own files
always come from this tree either way.

The fast tier also drives `storage/http.js` against two real local servers it
starts itself (`run_tests.cjs`) — both mount shapes, a catch-all-HTML trap, and
a mid-session server stop, none of which a DOM shim's `fetch` could stand in
for. The truth tier adds a THIRD static server, rooted at the repo instead of
just `apps/viewer/` (`startRepoRootServer`), and boots `topology.html` with no
`?mock=1` and no folder grant at all — proving the served-mode deliverable
itself, not a stand-in for it.

The fast tier includes a **node-fs adapter** tier that drives the real
`data/projections/viewer/` through the same adapter contract the browser uses, so
"Jeff's actual stacks render" is asserted rather than assumed. It reports itself
skipped when the projection isn't there (e.g. from a worktree, where `data/`
lives only in the main checkout) rather than failing.

That tier also carries the two guards that keep `fixtures.js` honest, and they are
the reason a builder change can fail a *viewer* test (2026-08-12):

* `[real] every fixture shape still matches the builder's` compares the key union
  of each shape in `fixtures.js` against the live projection's. **If you add a
  field in `scripts/build_viewer_projection.py` or `build_viewer_crops.py`, add it
  to `fixtures.js` too** — the failure names the shape and the keys.
* `[real] no live value is one the viewer has no branch for` asks, per enumerated
  field, whether the live data holds a value the viewer cannot render. That is the
  half a key-set diff cannot do: the bug it exists for was a stale *value* in a
  field that was present and correctly named.

Both run only when the node-fs tier runs, i.e. only with `--repo`.

The truth tier is not optional theatre: it caught a NodeList-vs-array divergence
between the shim and real Chrome, and a hover popover that closed itself the
instant it opened.

**Not automatable:** the FSA directory picker needs a user gesture, so the
`Connect folder` path is verified by hand, not by Playwright — the same
limitation forge's notes app records.

## Layout

```
apps/viewer/
  style.css           the SHARED stylesheet — the colour system lives here
  index.html          retired: redirects to topology.html (was the stack viewer)
  topology.html       the ONE viewer's shell (nav, toolbar, the joint block,
                      three panes, legend + worksheet <dialog>s)
  topology.css        that page's own rules: the nav tree, the toolbar, the
                      rails, the grid, the slim totals strip, both dialogs
  test.html           browser test page; publishes window.__TEST_RESULTS__
  config.js           paths, the drawing-checker webui base, rebuild commands
  viewer.js           pure view-model logic — no DOM, no IO, no arithmetic
  topology.js         the same, for the topology mode: its vocabularies, the
                      rail GEOMETRY (row index -> pixels; the columns are the
                      projection's), the grid PLAN + leader geometry
                      (VA.gridPlan / VA.internalNodes / VA.leaderGeometry),
                      VA.looseStacks / VA.stacksCoveredByTopology
                      (which stacks have no topology, read off edges' own
                      crop_key) and VA.navTree (the nav's data shape)
  fixtures.js         the ?mock=1 demo STACK projection (every provenance state)
  topology_fixtures.js  the ?mock=1 demo MECHANISM, generated by running the
                      real builder over it; topology_app.js merges the two
                      fixtures into one mock adapter at boot
  topology_app.js     boot + wiring for the whole page (formerly app.js's job
                      too — app.js is deleted; there is one boot file now)
  storage/adapter.js  the read-only adapter contract
  storage/fsa.js      File System Access (mode: read), handle persisted in IndexedDB
  storage/http.js     served transport — no folder grant, probed at load time
  storage/memory.js   in-memory mock (?mock=1, tests)
  storage/node_fs.js  real-checkout adapter for the node test tier
  views/              dom, banner, nav, stack, crop, worksheet, detail, topology
  vendor/markdown.js  vendored from forge apps/notes (namespace changed only)
  run_tests.cjs       fast-tier runner (node vm + DOM shim)
```

The stylesheet was inline in `index.html` until 2026-08-31 and has been a linked
file since, because the DAG mode needs the same colour system, the same chips
and the same right-hand pane the classic mode does — and now, since the two
modes are one page, `style.css` is simply the whole app's stylesheet
(`topology.css` on top of it for the DAG-specific rules). A `<link>` is safe from
`file://`; an ES module import is not, which is the constraint this whole app is
shaped by.
