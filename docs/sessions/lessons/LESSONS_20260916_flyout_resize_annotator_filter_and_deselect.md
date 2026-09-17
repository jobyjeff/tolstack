# LESSONS 2026-09-16 — flyout_resize_annotator_filter_and_deselect

Five deliverables off Jeff's 2026-09-16 "# 3d flyout" note. Everything below is
measured, and the screenshots beside this file are re-takeable:

```
node tests/debug_flyout_and_alerts.mjs --repo C:/workspace/tolstack
node tests/debug_flyout_and_alerts.mjs --repo C:/workspace/tolstack \
     --shots docs/sessions/lessons
```

a hand-run probe (never a tier), committed for the same reason the previous
three sessions' were. The PNGs sit beside this file, one per `shot()` call in
that probe -- deliberately not counted here, because nothing pairs a number in
this sentence against the probe and the first draft of it said seven when there
were eight.

**Counts.** `venv-win/Scripts/python.exe -m pytest -q` → **1192 passed, 1
failed, 1 skipped**; the one failure is
`test_no_live_document_states_an_unguarded_hardware_entry_count`, red on
`master` before this branch existed (a strategy brief's prose trips the
hardware-entry-count regex, three open issues describe it, nothing here touches
it — the previous two lessons say the same thing about the same test).
`node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` → **437/437**
(431 at session start). `node apps/annotate/run_tests.cjs --repo
C:/workspace/tolstack` → **81/81** (66 at start).
`node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` →
**21/21 suites** (20 at start; the new one is `annotate rail filter + face
deselect`, 30 sub-checks). The annotator's two suites went from 37 sub-checks
to 87 between them: `annotate flyout` 19 → 39, the new rail suite 30, and
`annotate hosted posture` untouched at 18. `app file://`/`app http` went 37 →
39 each, where the source column's consolidation is measured. `node scripts/run_mutation_witness_tests.mjs --repo
C:/workspace/tolstack` → **51/51**, eight of them added here.

> **Note on the worktree.** `npm install` in the worktree root first or the
> browser tier will not start: Node resolves bare specifiers from the running
> script's own ancestors, so `scripts/run_viewer_browser_tests.mjs` needs
> *this* tree's `node_modules/`, not the main checkout's. It fetches
> `playwright-core` only, in under a second. This is written down in three
> previous lessons and is still the first thing that stops a session.

---

## 1. What was already true on master, so you do not re-fix it

The handoff warned that Jeff's builds have hit stale-served-JS repeatedly.
Every complaint was checked against the branch point first:

| complaint | state at the branch point |
|---|---|
| flyout is right-docked at a fixed width | **live** — `topology.css`, `inset: 0 0 0 auto; width: min(760px, 55vw)`, no divider anywhere |
| the left menu is not filtered to the element | **live, and worse than the handoff said in one half.** `cmdTrace`/`cmdGoto` scoped the ELEMENT list to a study; `renderPartsPanel` walked `state.meshList` and was scoped by **nothing at all** |
| no way to deselect a face | **live, all three ways.** `state.currentPick` cleared on an empty-space click and the tint stayed; re-clicking re-highlighted the same face; no `deselect` verb existed |
| no link out to the full annotator | **live** — `VA.annotateLink` existed but was only reachable from the degraded no-mount paths |
| the rails are loud | **live.** The annotator's rows printed the raw state VALUE as badge text (`owner_not_in_set`, underscores and all); the stack source column carried up to two filled all-caps chips |

Nothing was a stale-build sighting this time. All five were real.

---

## 2. The flyout's clamp: the first version reserved the wrong thing

The handoff asked for the panel to be resizable with "the DAG … visible beside
it (that adjacency is the point)". A clamp with a pixel max cannot promise that
— at `FLYOUT_WIDTH.max` on a 1280px window the panel leaves 80px of page — so
`VA.clampFlyoutWidth` takes a measured width and holds a `reserve` back from it.

**The first version measured the reserve against the VIEWPORT, and that is
wrong in a way that looked right and passed its own test.** The right-hand edge
of this page is the 560px preview pane. Reserving 420px of *window* handed the
reader back 420px of *pane* and covered the diagram completely. Measured in
Chrome at 1600px with the panel dragged to 1100: `#topopane` laid out at
300..1038 and **every pixel of it was underneath the panel**. The browser check
guarding it passed, because it compared the DAG's own box against the flyout's
width — and `position: fixed` means that box never moves however wide the panel
gets. A covered diagram and an adjacent one are indistinguishable from the
layout tree; you have to compute the overlap.

What it measures now (`topology_app.js`'s `roomBesideFlyout`) is
**`#topopane`'s own right edge** — everything left of it is coverable (nav rail,
diagram, grid), everything right of it is the preview pane and its seam. Not
`window - paneWidth`: that is off by the divider between them, and at 1600px it
reserved 300 and left 298px of DAG showing, which is the kind of two-pixel lie a
guard then gets written around. Stack mode (no DAG pane rendered) falls back to
`window - pane`; no layout at all falls back to the px max, never to zero — a
clamp that read an absent measurement as "no room" would pin the panel at `min`
for ever.

**The consequence to know about: the stylesheet's width is now a wish, not a
promise.** `topology.css` still declares `min(760px, 55vw)` and is still the one
place the default lives, but `launchAnnotate` clamps the *measured* width on
every open. At 1600px with the pane at its own default that trims 760 → **738**,
because 1038 − 300 is all there is. The clamp runs **after** `dialog.show()`,
which is not a detail: a closed `<dialog>` is `display: none`, so measuring
first reads 0 and opens the first launch at `FLYOUT_WIDTH.min`. The clamped
width is deliberately **not** remembered — a width the layout imposed is not a
preference the reader expressed.

**Honest limit, and Jeff should see it.** At 1600px the 300px strip that
survives shows the grid's columns, not the rails: the diagram sits at the LEFT
of `#topopane`, which is the end the panel covers. `.tv__hscroll` is how a
reader brings the rails into the strip, and a wider window leaves more of them.
`min` is 560 (the annotator's own three-column grid plus canvas), so a panel
narrow enough to clear the diagram entirely is not a panel you can annotate in.

---

## 3. The bug the drag actually had: an iframe eats pointermove

`onResizeStart` listens on the **document**, for a reason recorded at length in
`topology_app.js`: the grid's grips are destroyed by the re-render each
pointermove triggers, so a pointer capture on the grip would end the drag on
its own first frame.

The flyout's seam breaks that assumption, because the panel is an **iframe**.
Pointer events over a cross-document iframe are delivered to *that* document,
so a drag that started on the seam and moved left over the 3D panel stopped
reaching this page at all. Measured: **one** `pointermove` seen by the parent
document across an entire 8-step drag, and the panel never moved a pixel. It
failed silently and it failed only in one direction — dragging *right* leaves
the dialog for ordinary page content and worked fine, which is exactly the
shape of bug that ships.

The fix is one CSS rule, `body.tv-resizing .flyout__frame { pointer-events:
none; }`. `body.tv-resizing` is already set for the duration of every gesture,
so no new state was needed, and making the 3D canvas inert while its own panel
is being resized is right anyway. A pointer capture would also have worked here
(this divider is static markup and survives a render, unlike the grid's grips)
and was declined as the larger change.

`flyout-drag-survives-its-own-iframe` is the witness, and it names the
**leftward** drag on purpose: rightwards passes either way.

---

## 4. The filter verb: `filter-element`, and why not two verbs

**Name and shape:** `filter-element [<edge or node id>]`. With an argument it
scopes the rail to one element; with none it lifts the filter. Registered in
`app.js` beside the other verbs, driven by the UI's "Show all" button and by
`cmdGoto`, which runs it on arrival — that is the "entered from" in Jeff's note,
and `goto` is the one verb that means it.

**One verb, not a `filter-element` / `show-all` pair.** "Show everything" is
this filter's own empty value, not a second operation, so the control that lifts
a filter and a deep link that arrives with none execute the same line.

**Nodes as well as edges**, because both are elements of a topology
(`docs/DAG_TOPOLOGY.md`: interfaces are nodes, dimensions are edges) and a card
on either can route in. Edges are looked up first — the deep link's own `edge=`
param means an edge, and an id collision between the two sets would be a data
defect. A node contributes every edge touching it plus its own `parts` list;
the mock fixture's topology has no `nodes` array at all and still filters,
because the walk falls back to the edges' `from`/`to`.

**Two decisions that are not in the handoff:**

* **`select-edge` deliberately does NOT filter.** It is what clicking a row in
  the rail runs, and a rail that collapsed to the row you just clicked would be
  unusable.
* **`selectTopology`/`selectStudy` drop the filter.** A scope belongs to one
  topology's id space, and picking a study by hand is a reader saying "show me
  this study" — the opposite of a one-element scope. `goto` sets its filter
  *after* both of those run, so a deep link is unaffected.

**The filtered element list is read from the FILTER, not intersected with the
study.** A flyout can be entered from an edge no study in the topology selects,
and an intersection would answer that with an empty rail.

**An element whose part has no installed mesh says so** ("No installed 3D part
for: …"). An empty parts panel with no reason for it is the silent drop this
repo keeps paying for.

---

## 5. Deselect: the missing half was one line, in a place no caller could reach

`scene.restoreColors(sha)` existed. It was reachable **only from inside
`highlightFace`**, on its way to tinting the next face — so no code path
anywhere could arrive at "nothing is picked", and a click into empty space
cleared `state.currentPick` and left the orange exactly where it was. Two facts
that are one fact, disagreeing.

`scene.clearHighlight()` is the other half, and `scene.highlightedFace()` is
the read-only observable that lets anything check the two agree.
`deselect [face|element|all]` is the verb, defaulting to **`face`** — which is
load-bearing, not a coin toss: defaulting to `all` would take the bind form
down with a mis-click, and a reader who mis-clicked a face has not said they are
done with the element.

The toggle decision is pure (`AA.planPickToggle`) because the three surfaces
Jeff asked for are **one** decision: a click into empty space and a click back
onto the already-picked face both clear, everything else selects. A face-id
equality written inside a DOM event handler is an equality nothing on this
machine can test.

Clearing something already clear is **not** an error. This is an undo, and an
undo that throws when there is nothing to undo makes every caller check first.

---

## 6. The two alert rails did NOT share a mechanism, and that is the answer

The handoff asked how this ended up. They share the **model shape** and nothing
else, and the reason is concrete rather than architectural:

**The viewer's** badge is a `cardtrig` over the page's existing hover-card
apparatus — `VA.alertsCard` is a card model like `VA.citationCard`, rendered by
a new `alerts` branch in `views/cards.js`, opened by the same three handlers the
confidence chip beside it already uses. It therefore inherits the hover-intent
corridor, the placement-and-flip logic, the room cap, Escape and the
outside-click close for free. Reusing that was obviously right: the badge sits
in the same table cell as a trigger that already does all of it.

**The annotator's** badge could not use any of that, because the annotator has
no card apparatus and shares no stylesheet with the viewer (deliberately —
`apps/annotate/style.css` opens by saying why). It got ~25 lines: one shared
`#alert-pop` node, `position: fixed`, placed by JS, below-by-default and flipped
when there is no room below.

**Why not CSS-only, which is what I tried first:** `.an__rail` is
`overflow-y: auto`, so a popup parented to a row is clipped to the rail's 260px
and a row near the bottom opens its popup below the fold. The browser tier
asserts the escape (`the popup escapes the rail's scrollport rather than being
clipped inside it`) rather than trusting it, because that is the whole reason
the node lives outside `#workspace`.

**What did NOT change: the words.** `VA.rowAlerts` reads `VA.ATTENTION` and
`VA.EXPORT_CHIP_TEXT`; `AA.elementAlerts` reads a new
`AA.BINDING_STATE_ALERTS` keyed by `AA.BINDING_STATES`, paired against it by the
annotate tier so a state added without a decision about whether it is an alert
fails there. `VA.EXPORT_CHIP_FALLBACK` is new only because the old `||
"EXPORT STATUS UNKNOWN"` literal at the call site moved and deserved a name.

**Two things the consolidation improved beyond quietness:**

* the annotator's rows stopped printing schema values. The badge text *was*
  `needs_re_confirmation`, on a surface a reader reads. The everyday sentence
  lives in the table now, and a tier check refuses any alert text containing
  the state's own value or an underscored identifier.
* the viewer's card shows each alert's **why**, which the filled chips carried
  only as a native `title` — nothing could screenshot it and nobody hovered it.
  See shots 4a/4b/4c: two chips became one badge and one card with two items.

**The row keeps its colour, both sides.** Jeff asked for that explicitly. In the
annotator it moved from a word-bearing badge to the row's own left border, one
rule per `AA.BINDING_STATES` value; the browser tier compares all three live
states' computed `borderLeftColor` and requires three different ones, so a
stylesheet that coloured them alike fails. In the viewer the confidence, kind
and material chips were left alone: they are the row's primary provenance
signal, not alerts, and one of them is already the citation card's trigger.

**The badge is outlined, not filled**, and that is also pinned as computed
style — with a paired check ("...but it is still findable") so the fix for
"too loud" cannot become "delete the border too".

---

## 7. Tier-side traps worth knowing before you touch this area

* **`window.__scene`.** The pick tint lives in a WebGL colour buffer, so
  `scene.highlightedFace()` is the only observable for "the orange came off" —
  the entire deliverable of §5, previously un-assertable. It is published
  read-only under the app's existing autotest convention (`window.__lastTrace`,
  `window.__autotestResults`). Nothing in the app reads it and every mutation
  still goes through `AA.exec`.
* **The mock mesh is edge-on to its own default camera**, and a real click on
  it is a coin flip. It is one triangle in the `z = 0` plane and `frameParts`
  looks at it along `-Y` with `up = +Z`, so a ray at the face centroid *grazes*
  it: `pick()` answered `true` from a `page.evaluate` (ndc y = 1.3e-16) and
  `false` from inside the pointerdown (ndc y = 0) **at the same coordinates with
  the camera unmoved**. The tier orbits to face the triangle before it clicks
  and says why;
  `ISSUE_20260916_the_mock_annotator_mesh_is_edge_on_to_its_own_default_camera`
  files the demo being a hairline.
* **Don't hunt for the face with a grid walk.** At ~51 units off a 1-unit
  triangle (`frameParts`' `+50` floor, meant for real parts) it lands ~0.05 NDC
  across: coarse enough to be fast misses it, fine enough to find it is ~900k
  raycasts. Project the face's manifest centroid through the live camera
  instead — `Vector3.project`, reached off a vector already on the mesh, since
  the page has no `THREE` global — and **confirm the aim with `pick()` before
  clicking**, or a bad aim reports itself as "deselect is broken".
* **The respine ghost, again.** Adding a reload + study re-selection to the
  flyout suite reintroduced the strict-mode violation the suite's own header
  warns about (two `tr.tvrow` with the same `data-id` during
  `VA.RESPINE.duration`). Every study click in that suite needs its
  `paneSettled()`.
* **A round-trip check on a value sitting at its clamp cannot fail.** The
  remembered-width check narrows the panel first, and asserts it is well inside
  the clamp, because a panel already at the cap would "round-trip" with nothing
  stored at all.
* **`suite` in `scripts/mutation_witnesses.json` is an EXACT `SUITES` key**, not
  the `--only` substring you typed. Four of the eight entries added here were
  written with substrings and `tests/test_mutation_witnesses.py` caught all
  four immediately, which is the test doing exactly its job.

---

## 7a. The mutation runner found three of my own guards checking the wrong thing

Eight witnesses were declared and the first full run reported **five of them
unwitnessed**. Two were bookkeeping — stale anchors left by this session's own
renames, which `tests/test_mutation_witnesses.py` flags on the next pytest run
anyway. **The other three were real**, and all three the same class of mistake:
the check they named was measuring a *proxy* rather than the claim, so it was
green on the clean tree AND green on the mutated one, which is the worst shape
a guard has. Worth reading as three separate mistakes:

1. **The deselect guard read the BOOKKEEPING, not the tint.** It asserted
   `scene.highlightedFace() === null` — and `highlightedFace()` reports
   `_lastPick`. Deleting `restoreColors` from `clearHighlight` leaves
   `_lastPick = null` and the mesh orange, which is *the exact bug this whole
   deliverable exists to fix*, and the check waved it through. It reads the live
   `geometry.attributes.color` array against `userData.baseColors` now. The
   lesson generalises: when the defect is "two representations of one fact
   disagree", a guard that reads either one of them is not a guard.

2. **The parts-panel guard could not discriminate, because the fixture has one
   mesh.** "Filtered to 1 part" and "unfiltered, 1 part" are the same number, so
   the check passes over a filter that does nothing. The discriminating case is
   the no-installed-mesh edge (1 → 0), which the suite already had; the witness
   points at that one, and the call site now says in as many words why the
   obvious check is not the owner.

3. **Distinctness could not see a rule going missing.** "Three states, three
   different colours" survives one state falling back to `.el-row`'s own
   neutral border, because the neutral is a *fourth* colour — so the row stays
   distinct from its neighbours while saying nothing about its state. There is
   a second check now, comparing each stripe against a clone stripped of its
   state class, so the fallback is measured rather than assumed absent.

The previous session's lesson says "write a new guard's mutation *before*
believing the guard". This session is the same lesson again, from the other end:
I wrote the mutations after, and three of eight were bluffing.

---

## 8. Still to do

* **`ISSUE_20260916_the_viewer_nav_rail_may_be_the_left_side_menu_jeff_called_loud`**
  — `audience: strategy`, and the one worth reading. The handoff mapped "Left
  side menu is now impressively loud" onto two rails and both are quiet now, but
  the loudest surface in shot 4c is a **third** one the handoff never listed:
  the nav tree's study badges. And in the same note Jeff calls that rail "the
  left side select menu" in as many words. Quietening it partly reverses
  `viewer_study_verdicts_and_gaps` (2026-09-15), which made those badges loud
  deliberately and wrote down why — so it is a decision for Jeff, not a
  copy-paste of the fix that shipped. The mechanism is built and reusable
  either way.
* **`ISSUE_20260916_the_mock_annotator_mesh_is_edge_on_to_its_own_default_camera`**
  — small, and it has a pinned blast radius (the fixture's `centroid_native`
  appears in its bound event too, which several annotate-tier checks read).
* The probe runs at `?mock=1` throughout, so the rail shots are the fixture's
  three elements and one synthetic mesh rather than Jeff's live topologies.
  That is not the mock seam being lazy: File System Access cannot be granted
  from an automated browser at all, so there is no version of this probe that
  reaches the real bindings. Everything it shows is layout, copy and colour,
  which the fixture exercises fully; the numbers are pinned against the live
  projections by the tiers.
