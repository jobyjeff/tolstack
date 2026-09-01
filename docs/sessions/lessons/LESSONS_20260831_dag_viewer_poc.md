# LESSONS 2026-08-31 — dag_viewer_poc

Handoff `docs/sessions/active/HANDOFF_20260831_dag_viewer_poc.md`, from the locked
brief `dispatch/docs/strategy/HANDOFF_20260831_tolstack_dag_strategy.md`.
Delivered: `apps/viewer/topology.html` (+ `topology.css`, `topology.js`,
`views/topology.js`, `topology_app.js`, `topology_fixtures.js`),
`scripts/build_topology_projection.py`, `tests/test_topology_projection.py`, a
new fast tier and browser tier in the existing runners, and the README /
ARCHITECTURE rows.

The topology schema was **not** touched, which the handoff asked for and which
turned out to need no argument: everything the page wanted was already derivable
(§4 records the one place I nearly wanted a field and did not need it).

Everything below is a decision that was **not** in the handoff, or a thing the
next agent cannot derive from the code.

---

## 1. The serialisation rule, and the row mapping the handoff left open

The handoff said *"one grid row per chain element (edges carry values; nodes are
the row boundaries — **decide the exact row mapping and document it**)"*. The
decision:

> **One row per graph element, nodes and edges interleaved.** A dot is an
> interface, a bar is the dimension between two of them, and a chain of n edges
> is 2n+1 rows.

The handoff's own phrasing points at a different answer — nodes as *boundaries*
between edge rows, drawn on the row separator. I built that first and it is
worse, for a reason that only shows up on screen: an interface then has no row,
so it cannot be clicked, and the two things a chain is *named by* — its `from`
and its `to` — are the two things the page cannot select. `Contribution` carries
`entered_at`/`left_at` precisely so a row can be tied to the two nodes it spans;
if the nodes have no rows, that pairing has nowhere to land. The other
alternative, one row per node (the literal git-log reading, where every text row
is a commit), puts the *numbers* between rows, and the numbers are what a
tolerance reviewer came for.

Interleaving costs vertical space — the pitch system is 43 rows for 43 elements —
and buys a page where **the grid is an index of the whole document**: every id in
the JSON has exactly one row, one y and one rail mark. That property is worth
more than the compactness, and it is what makes "click a dot or a row" one
interaction rather than two.

**The walk itself** is the brief's suggestion, verified against the pitch system
before committing: depth-first with rail continuity, a branch keeps its column
until it rejoins or ends. Two things about it are decisions:

- **The root is the document's first node**, not a computed one. I tried the
  obvious heuristics. *Lowest degree* picks `blade_root_oml` for L2 and walks
  backwards through the mechanism; *largest subtree first* is useless here
  because the pitch system is cyclic enough that every branch reaches every node
  (I measured: all four fork nodes report the same subtree size down every
  branch). Document order is deterministic, is already the author's statement of
  what the spine is, and does not move the whole picture when an unrelated edge
  is added. **Consequence worth knowing: reordering a topology's `edges` array is
  now how an author steers the diagram**, with no value touched and no schema
  change. That is a viewer affordance the format did not know it had.
- **A branch node allocates all its columns up front**, before recursing. This is
  the one subtle bug in the whole layout and it looks correct until it does not:
  allocate branch 2's column lazily and it will take a column branch 1's subtree
  has already used and released — and since a branch's rail starts back up at the
  fork, that rail is then drawn straight through branch 1's rows. Reuse is still
  permitted; it just cannot cross a reservation.
  `test_a_column_never_holds_two_rails_at_the_same_row` is that invariant.

  > **Corrected in `review/dag_viewer_poc`.** This paragraph, `apps/viewer/README.md`
  > and that test's own docstring each said reuse "is what keeps the pitch system
  > nine rails wide instead of twelve". Measured: the pitch system allocates
  > **nine** rails over **nine** columns and L1 two over two, and disabling reuse
  > outright leaves both unchanged — so reuse does not fire on either committed
  > topology, and the counterfactual is nine, not twelve. The mechanism and the
  > invariant are right; the sentence was a claim about data nobody had counted.
  > `test_reuse_is_what_this_invariant_guards` now builds the smallest graph that
  > does reuse, so the invariant is not asserted over nothing.

**The L1 case is a ring, not a chain**, and the handoff's *"the degenerate
single-rail case must look sane, not like a bug"* needed re-reading because of
it. Every interface in the grip stack has exactly two edges: five clamped members
in series, the bolt's grip parallel to them, and the derived `shank_out` gap
closing the loop. So the *topology* honestly draws as two rails that rejoin, and
it reads well — a long branch that merges back, exactly the git-log idiom. The
single-rail case is the **study**, which is what the "Showing: study chain"
toggle draws. Two layouts, one serialiser, both in the projection.

## 2. The layout is computed in Python, and that was not obvious

The handoff says *"plain HTML/JS/SVG in the existing viewer's idiom"*, which
reads as "do the layout in JS". I put the serialisation in
`scripts/build_topology_projection.py` instead and left JS only the arithmetic
about the screen (row index × row height).

The argument that settled it: **which column an edge lands on is a claim about
the graph**, not a styling choice, and this repo keeps claims about the graph
where a `pytest` can pin them. The properties that matter — every element gets
exactly one row, a column never holds two rails at once, a branch's rail starts
at its fork, the number of loop closures equals the cyclomatic number — are all
assertions in `tests/test_topology_projection.py`, and none of them is a thing a
reader can see on a screenshot. A wrong rail just looks like a line.

It also means the study-chain layout and the whole-topology layout come out of
one serialiser, so a row cannot line up with one and not the other.

## 3. Alignment is the page's whole claim, so it is *measured*

A grid row and its rail mark describe the same element at the same y. Two things
enforce it, and neither is a stylesheet:

- the row's `height` is set **inline** from `VA.RAIL_METRICS.rowHeight`, the same
  constant `VA.railY()` computes the SVG's y from. A CSS rule saying the same
  thing would be a second place the number lives;
- the rails and the rows are in **one scrollport**. "Scrolling keeps them locked
  together" then has nothing to synchronise and nothing to drift.

And then the browser tier measures it anyway: `getBoundingClientRect` centre
against centre, every row of both real topologies, in both layouts, after
scrolling. I checked the guard bites by adding 3 px to `railY` — it fails with
`off by 3.00px` on every row. **This is the check that justifies the browser tier
existing for this page**; the DOM shim reports the same class names either way.

## 4. What the git-graph style could not express

The handoff asks for this by name. Three things, in order of how much they cost:

1. **A lane colour per part — there is no palette for it, and there cannot be
   one.** This is the real finding. Jeff's second reference image
   (`paste-20260831T161225.png`) colours a rail per branch, and that is the
   obvious thing to want. But on this surface green, amber, red and magenta *are*
   provenance and nothing else may wear them (`index.html`'s own rule: "the only
   saturated colours on the page"). Removing four of the eight hue families from
   a validated categorical palette leaves ~4 usable hues, and the dark-mode
   lightness band is narrow enough that lightness cannot make up the difference —
   I ran the data-viz validator on an eight-slot cool-only candidate and it fails
   the CVD separation and normal-vision floors outright. Meanwhile the pitch
   system has **twelve parts** and nine rails, past any categorical palette's cap
   regardless.

   So the page does something better than a compromise palette: **a rail is
   neutral and an edge's bar wears its citation's confidence.** The rail diagram
   becomes a provenance map — a column of red bars is a mechanism nobody has
   traced, visible before a single row is read — which is the thing this repo
   actually reviews. Part identity is text, on the row and in the pane. If Jeff
   wants lane colour back, the honest form is a *filter* ("colour by part, one
   part at a time"), not twelve simultaneous hues.

2. **A gap has no rail.** `Topology.edges_on_part()` gives a part its lane; a
   `gap` names no part, so it belongs to no lane. Drawn as a dashed bar in
   whatever column the walk is standing in — which is a compromise: it looks like
   it belongs to that lane and it does not. A swim-lane renderer would draw it
   crossing between two lanes; a rail renderer cannot, because the two lanes are
   not adjacent columns. Worth revisiting only if gaps become common; the repo has
   two.

3. **A loop closure is a long curve to nowhere in particular.** git-log's merge
   curves are short because a merge's parents are usually near. The pitch system's
   four closures span 20–40 rows, and while the curve is correct it reads as
   "something goes up there" rather than "this rejoins *that* interface". The
   row's own `↰ closes back to an interface above` label carries the meaning; the
   curve carries the geometry. A hover that highlights both ends would fix it and
   is the cheapest next improvement to this page.

## 5. What lasso-authoring will need (out of scope here, per the handoff)

Selection of existing studies was enough to prove the design, and building it
surfaced what the *authoring* version needs that this POC does not have:

- **A write path.** The viewer is read-only by construction — the FSA grant is
  `mode: "read"` and there is no code path that writes. Lasso-authoring is the
  first thing this app would ever write, and it writes a *document*
  (`study_*.json`) into `docs/topologies/`, not a projection. That is a change to
  the app's founding premise, not a feature; it wants its own decision.
- **Traversal in the browser, or a round trip.** Today every study is folded at
  build time. An interactive lasso needs the answer *while* you click, and the
  answer includes `BranchAmbiguity` — which is the whole point, because the fork
  message is the feedback that teaches the author what a chain is. Two exits, and
  they are genuinely different: (a) re-run the builder on every click through some
  local runner, which keeps one arithmetic path and needs a process; (b)
  reimplement `traverse()` in JS for *ordering only* and still fold in Python,
  which splits the traversal but not the arithmetic. (b) is tempting and is a
  second place a branch rule can be wrong. Neither is free; this is the decision
  the authoring handoff turns on.
- **The selection is already the UI.** A study is `{from, to, selection[]}` and
  nothing else, so the interaction is: click an edge row to toggle it in, click
  two nodes for the endpoints. The page already renders every one of those states.
  What it lacks is the *live* refusal.
- **The chain layout is the preview.** Once a selection is a valid chain, the
  "study chain" layout is exactly what the author is trying to build, one rail,
  in order. That is already there.

## 6. Decisions inside the existing viewer that were not in the handoff

- **The stylesheet moved out of `index.html`** into `apps/viewer/style.css`,
  verbatim, so both pages share the colour system, the chips and the right-hand
  pane. A `<link>` is safe from `file://`; an ES module import is not, which is
  the constraint the whole app is shaped by. `topology.css` holds only what is
  this page's.
- **`views/banner.js` is now parameterised over which projection it describes**
  (`VA.PROJECTION_LABELS`, defaulting to `results`, so every existing call site
  is unchanged). The topology page reuses the freshness line, the
  missing-projection prompt and the which-tree-built-this alarms rather than
  growing a second banner — and gets `extraAlarms` for the one thing only it has
  (a study naming a topology no document declares).
- **`VA.svg()` is a separate helper, not a flag on `VA.el()`**, because both
  halves differ: an SVG node must be created in the SVG namespace
  (`document.createElement("path")` makes an `HTMLUnknownElement` that renders
  nothing), and `className` on an SVG element is a **read-only**
  `SVGAnimatedString` — `node.className = x` there silently does nothing while
  working fine on HTML. That second one is a browser-only failure, so the DOM
  shim in `run_tests.cjs` learned `createElementNS` and learned to mirror
  `setAttribute("class")` onto its class set; without the mirror,
  `querySelectorAll(".rail__bar")` would find HTML and miss SVG, and the fast
  tier would be blind to exactly the elements this page is made of.
- **`topology_fixtures.js` was GENERATED, not written.** Every number in it came
  out of `project_topology()` run over a demo mechanism, so the fixture cannot
  claim a total `fold()` would not produce. Its header says how to regenerate it;
  do that rather than hand-editing a number. The only hand-patched fields are the
  three `crop_key`s, which need a real stack file to derive and are stated
  directly instead — the same licence the stack fixture takes with its
  `unestablished` export, which no live citation carries either.

## 7. Gotchas for the next agent

- **`build_topology_projection.py` is the FOURTH projection writer**, and
  `ARCHITECTURE.md`'s `projection_provenance.py` row counts them. It said "all
  three … the two above" and now says "all four … the three above"; both phrases
  are in `tests/test_architecture_inventory.py`'s `PINNED_CLAIMS` **and** in that
  module's own can-it-fail self-test, so a fifth writer means editing three
  places. That is the design working, not friction: the row has been wrong twice.
- **The banner will tell you `topologies` and `crops` were built from different
  trees**, because `crops.json` is rebuilt rarely and `topologies.json` is rebuilt
  every time you touch a document. The alarm is true and is exactly what
  `provenanceAlarms` is for, but it is going to be on screen more often on this
  page than on the stack viewer. If it becomes noise, the fix is a rule about
  *ancestry* — which the page cannot compute, because it cannot run git. Flagged
  for Jeff below.
- **The `.tv__scroll` height is `flex: 1 1 auto` inside a viewport-height flex
  column**, not `calc(100vh - N)`. It has to be: the banner's height is
  data-dependent (a quiet build is one line, a provenance alarm is six), so a
  fixed subtraction is wrong for one of the two by construction. `html, body`
  therefore get `height: 100%` and `display: flex` — scoped to this page, since
  `topology.css` loads nowhere else.
- **Playwright's default click targets a row's centre**, which on a six-column
  row scrolled to the bottom of the scrollport lands under the totals footer.
  Click a cell (`.tvcell--name`), the same workaround `testTheApp` already
  documents for the elements table.
- **The demo crops index is shared.** `VA.demoTopologyFixture()` reuses
  `VA.demoFixture().crops`, and the three demo `crop_key`s address its
  `demo_joint` entries on purpose (`plate` resolves, `washer` is unresolvable,
  `eye` is absent). Change one and the other page's tests move.

## 8. Jeff-facing questions

Ranked by how much they change the page.

1. **Is "a rail's colour is its citation's confidence" the right trade for
   "a rail's colour is its part"?** §4.1 is the argument for it and I think it is
   the better page, but it is a visible departure from your reference image. The
   fallback, if you want lanes back, is a *filter* rather than a palette: pick a
   part, its edges light up, everything else greys. Cheap to add.
2. **Should the whole-topology view default to a study, or to nothing?** Today it
   opens with no study and every row at full strength, which is the honest "here
   is the mechanism" view but is 43 undifferentiated rows for the pitch system.
   Opening on the first study would make the page land on something readable at
   the cost of implying that study matters most.
3. **Is the document's edge order something you want to curate?** It is now the
   layout's spine (§1). The pitch system's `hub_top_deck` lists the tan-link mount
   before the VPA mount, so the gas-spring branch takes rail 0 and the
   hub → VPA → piston → pitch-plate spine ends up in a branch column — and
   `hub_top_deck_to_vpa_mount` ends up rendering as a *loop closure* at the bottom
   of the page. Nothing is wrong; it just does not read as the primary path. Two
   lines swapped in `topology_pitch_system.json` would fix it, and that is a
   topology-owned edit, not a viewer one.
4. **How loud should the "different trees" banner be here?** See §7. It will fire
   most times you open the page unless you rebuild the crops too.
5. **Do you want the two topologies joinable?** The page keeps them strictly
   separate (the topology lesson's rule: `piston_rod_end_bore` and
   `topology_vpa_output_to_pitch_plate` model the same joint at two levels and
   nobody has decided how they compose). The UI has no affordance that even hints
   at it, which is deliberate — but a reader flipping between the two dropdown
   entries will notice they are the same joint.

## 9. Verification

- `venv-win\Scripts\python.exe -m pytest -q` — 552 passed, 1 skipped (the JS
  suite, which reports itself skipped from a worktree because `data/` is only in
  the main checkout).
- `node apps\viewer\run_tests.cjs --repo C:\workspace\tolstack` — 182 passed,
  including the 12 `[real]` topology tests and both new guards.
- `node scripts\run_viewer_browser_tests.mjs --repo C:\workspace\tolstack` —
  6/6, with 31 topology sub-checks per origin.
- Screenshots taken of both MVP cases with a study highlighted and totals shown
  (the definition of done's first item), by serving `apps/viewer/` and swapping
  `?mock=1`'s fixture for the real projection — the same seam the browser tier
  uses, because the FSA directory picker needs a user gesture and cannot be
  driven from Playwright. That limitation is the stack viewer's too and is
  recorded in its README.
