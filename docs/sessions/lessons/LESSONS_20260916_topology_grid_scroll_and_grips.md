# LESSONS 2026-09-16 — topology_grid_scroll_and_grips

Three defects of one box stack on `apps/viewer/topology.html`, landed in one
diff because a fix to any one re-measures the other two. All measurements below
are Chrome 152 headless, 1600×1000, the **real** `pitch_system` from
`C:\workspace\tolstack\data\projections\viewer\`, through
`tests/debug_topology_grid_geometry.mjs` (new, hand-run, never by a tier).

```
node tests/debug_topology_grid_geometry.mjs --repo C:/workspace/tolstack
node tests/debug_topology_grid_geometry.mjs --repo C:/workspace/tolstack \
     --shots docs/sessions/lessons --tag before|after
```

The probe is committed because the six screenshots below are worthless without
a way to re-take them. It reports every number in this file.

---

## The handoff's baseline numbers are 60px light, and it is not a disagreement

The handoff quotes `scrollWidth` 1474, max `scrollLeft` 605 and a 41.5px rail
slide. I measure 1534 / 666 / 103.5 on the same tree at the same viewport.

The whole difference is the `chips` (SOURCING) column, widened 200 → 260 by
`939edca` (*viewer: every study renders its verdict, its margin and what is
missing*, 2026-09-15 21:34) — **after** the three issues were measured and
before the batch merge the handoff calls its baseline. Table 1158 → 1218,
`scrollWidth` = 316 + table. Everything else reconciles exactly: the slide is
`maxScroll − (paneWidth − dagWidth)` less the 10.5px the leftmost drawn mark
sits inside the SVG's own left edge — 605 − 553 − 10.5 = 41.5 then, 666 − 552 −
10.5 = 103.5 now. Same defect, a wider grid.

**Use the numbers in this file, not the handoff's**, and if you re-measure
after another column moves, expect them to move with it.

---

## Deliverable 1 — the grips

### Which of the three candidate shapes, and what chose it

**Candidate 2 (move the grips out of the overflowing region), in a two-part
form.** Candidate 1 (`overflow-x: auto` on `.tv__main`) was never opened:
**the full-page-scroll contract survived this session completely untouched** —
`.tv__main` still declares no `overflow` of any kind, `.tv__scroll` still
declares none, and `.tv__hscroll` is still the one horizontal scrollport on the
page. Candidate 3 (clamp the pane's max) was not taken and is not needed.

What chose it was a measurement the issue does not contain. The issue says
`#detail` "paints over the overflow". **It does not.** `.tv__hscroll` is a real
scroll container and it *clips* at its padding box; the grip out past that edge
is not painted at all, and `#detail` is merely what the page shows beyond the
pane. `LESSONS_..._1_before_grip_under_pane.png` is the proof: at a 560px
preview pane the seam, the grip and every grid column are simply absent from
the frame, and the pointer-down aimed at the grip lands in the preview pane
and selects its prose (visible as the blue selection in that shot).

That distinction is what made the fix a clamp rather than a z-index or a
stacking-context question, and it also rules out the reading that the grips
were merely "under" something reachable.

Measured, pane at three widths, ELEMENT dragged +220 (→ 440px) and the jog zone
at 5.53×, `.tvgrip`'s own centre pointer-downed and the preference read back:

| preview pane | `.tv__main` | jog grip | ELEMENT grip |
|---|---|---|---|
| 430px (shipped) | 869px | before: **live** / after: live | before: **dead** / after: live |
| 560px | 739px | before: **dead** / after: live | before: **dead** / after: live |
| 1000px (`TOPO_PANE_WIDTH.max`) | 299px | before: **dead** / after: live | before: **dead** / after: live |

Note the top-left cell: **the ELEMENT grip was already unreachable at the
shipped default**, at x 1717 on a 1600px viewport, once its own column had been
dragged +220. The issue reported the jog grip; the column grip was worse and
nobody had measured it.

### How far "the visible edge" and "the thing it means" actually come apart

The handoff asked for this number before deciding. With the pane at 430 and the
ELEMENT column at 440, the column's own boundary is **554px right of the pane's
visible right edge**; at the 1000px pane it is ~426px right of it. So for the
ELEMENT grip the two are very far apart, and clamping really does mean the grip
stops standing on the boundary it resizes.

Taken anyway, because the alternative measured worse: unclamped, the control
does not exist at those widths at all, and the gesture still works (the drag is
`dx`-based, so a pinned grip dragged right still widens the column — it just
stays pinned while it does). The grip's `title` already says what dragging it
does, so nothing in the UI claims it marks an edge.

For the **jog** grip the two do not come apart at all below the clamp, and this
is the part the issue's "pin them to the sticky column header's own visible
edge" gets exactly right for the wrong reason: the seam it marks is *itself*
sticky (`.tv__rails { position: sticky; left: 0 }`), so it sits a **fixed**
distance from the pane's visible left edge at every scroll. A grip parked at a
content coordinate was therefore drifting off its seam on any sideways scroll —
a second, unreported defect that the fix removes.

### `position: sticky; right: 0` does not do what it reads like, here

The obvious CSS for "clamp the column grip in from the right" is `position:
sticky; right: 0`. **Measured in Chrome 152 on this page, it does nothing at
all.** A 7px sticky box whose natural position is right of the scrollport stays
at its content coordinate at every `scrollLeft`:

```
scrollLeft:   0    400   800   1200  1366
col grip x: 1417  1017   617    217     51     (1:1 with the scroll, never pinned)
jog grip x:  793   793   793    793    793     (sticky `left`, holds perfectly)
```

Tried and rejected on measurement, not on theory: an explicit `right: 0`, an
explicit `margin-right: 0` so the box is not over-constrained, a fresh probe
box, a lane with a fixed width instead of `left: 0; right: 0`, a floated box,
and the lane re-parented directly under `.tv__hscroll`. All five stayed at
1400. Sticky `left` works in the same lane on the same page.

So the column grip's `left` is **written** — once per render and once per
scroll event on the pane — and the jog grip's is a sticky `left` the browser
holds frame-for-frame with the SVG it tracks. The asymmetry is deliberate and
is commented in both files; do not "simplify" the column grip to a right inset
without re-running the sweep above.

### Structure

Each grip now sits in its own `.tv__griplane`: an inert (`pointer-events:
none`) absolutely-positioned overlay inset 0 in `.tv__head`, which spans the
header's whole scroll width because `.tv__head` is `width: max-content`
(deliverable 3). One lane per grip, not one shared lane — in a shared one an
in-flow sticky grip's natural position is measured from the grip before it.

`VA.TOPO_GRIP = { width: 7, half: 3 }` is new and is paired against
`.tvgrip { width }` and `.tvgrip::before { left }` by a fast-tier test, the same
shape `VA.DAG_FIT.headHeight` is paired against `.tv__head { height }`. The
`- 3` in the old `jogGrip.style.left = (railWidth - 3)` was an unnamed literal
that had to agree with a CSS number in another file.

---

## Deliverable 2 — the reader's sideways scroll

`VA.renderTopoPane` reads `.tv__hscroll`'s `scrollLeft` before `VA.clear(root)`
and writes it back after the new pane is appended, letting the browser clamp
it. Measured, reader parked at the right-hand end (666 of 666):

| | before | after |
|---|---|---|
| first respine frame | 0 | 666 (then clamped down as the DAG shrinks) |
| settled frame | 0 | 612 — which **is** the new maximum (content 1480px) |
| `#density-toggle` | 666 → 0 | 666 → 666 |
| `#edge-length-toggle` | 666 → 0 | 666 → 666 |
| `#leader-style-toggle` | 666 → 0 | 666 → 666 |

The three toggles matter as much as the respine: this was never the
animation's doing, and the respine only made it conspicuous.

### 2.1 — which renders keep it

Same `topologyId` keeps it (`VA.lastTopoRender.topologyId === topoProj.id`); a
different topology starts at the left edge. A study selection is the same
topology re-serialised, so it keeps it. Both arms are pinned in the fast tier.

### 2.2 — the ghost: restored to the same window

**Decided: the ghost is restored to the live pane's post-clamp `scrollLeft`,
every frame.** Three things made that the only defensible answer:

* re-parenting a node out of the document resets its `scrollLeft` to 0, so the
  ghost loses the position silently — `ghostOf` now reads it off the live pane
  *before* the append and leaves it on the ghost as `ghost.paneScrollLeft`,
  which is also where the transition's **first** frame finds it (there is no
  live pane left in `root` at that moment);
* the ghost's `.tv__hscroll` is `overflow: hidden`, which is still a scroll
  container and still programmatically scrollable — so "hidden" was never a
  reason it could not be positioned;
* it is taken from the **live** pane after its own clamp, not from the carried
  number, because the outgoing paint is the wider one and only the live pane
  knows which window the reader is actually being shown.

**What the cross-fade looks like under it.** Caught at e = 0.30 with both panes
at `scrollLeft` 650 (a throwaway probe, not committed): the outgoing table and
the incoming one are **column-aligned** — one SOURCING column, one CROP column,
one set of chip x-positions — and the only thing that differs between them is
which rows exist and at what y, which is the movement the cross-fade is for.
Unrestored, the ghost would be 650px to the left of where it belongs, so the
fading outgoing table's COMPONENT column would be drawn under the incoming
table's CROP column and the whole width of the grid would read as doubled text.

---

## Deliverable 3 — the sticky rails

`.tv__body { width: max-content; min-width: 100% }`, and the same on
`.tv__head`. `.tv__rows` keeps `flex: 1 1 auto; min-width: 0` unchanged — under
a `max-content` container there is no free space to grow into, so it sizes to
its table, and on a topology narrower than the pane `min-width: 100%` leaves it
filling the line exactly as before.

The three boxes the handoff asked to be measured either side of it, plus the
two that actually moved (real `pitch_system`, 1600×1000, shipped defaults,
pane scrolled to its far end):

| box | before | after |
|---|---|---|
| grid overflow — `.tv__rows` / its table | 552px / 1218px → **666px overflowing** | 1218px / 1218px → **0** |
| header `padding-left` seam | 316px | 316px (**unchanged** — it is `leaderGeo.width`) |
| `.tv__ghost` box | 868 × 1196px | 868 × 1196px (**unchanged** — it is 100% of `.tv__scroll`) |
| `.tv__body` width | 868px | 1534px |
| SVG's left edge vs the pane's visible left edge, at `scrollLeft` 666 | **−114.0px** | **0.0px** |

The sticky now holds at **every** `scrollLeft` from 0 to 666: the SVG's own left
edge measures 0.0px from the pane's visible left edge at all of them. (The
*leftmost drawn mark* is a constant +10.5px inside that edge at every scroll,
before and after — that is where the leftmost rail is drawn in the SVG, not
slippage. `dagLeft >= -1`, which the browser tier asserts, is the honest form
of the claim.)

Two things I did not expect and that are worth knowing:

* **`.tv__head` needed the same treatment, for a different reason.** It is a
  block child of the scrollport too, so it was 868px wide with its table
  overflowing, and its `background` and `border-bottom` therefore stopped at
  868px. `LESSONS_..._3_before_rails_slide.png` shows the header band ending
  mid-pane at the far scroll; the after shot shows it reaching the whole width.
  Nothing reported this; it came out of the same one-line fix.
* **The pane's `scrollWidth` did not change at all** — 1534px before and after,
  in an 868px pane. The overflow moved from "out of `.tv__rows`" to "out of
  `.tv__body`"; the union was always the same.

### For the strategy session on the folded totals strip

**Real `pitch_system`, 1600×1000, shipped defaults: the pane's `scrollWidth` is
1534px in an 868px viewport — max `scrollLeft` 666 — and this work did not
change it.** Decide against that number, not against the handoff's 1474 (see
the first section). Nothing in this session re-laid the strip or re-widened a
column.

---

## Evidence: the six screenshots

All six: Chrome 152 headless, viewport 1600×1000, projection `pitch_system`
from `C:\workspace\tolstack\data\projections\viewer\`, captured by
`tests/debug_topology_grid_geometry.mjs --shots docs/sessions/lessons --tag …`.
The "before" pair was taken with `apps/viewer/topology.css` and
`apps/viewer/views/topology.js` checked out at `1b3848b` (the handoff's
baseline) and nothing else changed.

| file | pane width | `scrollLeft` | state |
|---|---|---|---|
| `…_1_before_grip_under_pane.png` | 560px (`.tv__main` 739px) | 0 | ELEMENT 440px, jog zone 5.53× (SVG 796px). Pointer held down on the jog grip's own box and dragged 200px **left**. SVG stays 796px — the gesture reached the preview pane instead, and selected its prose. |
| `…_1_after_grip_under_pane.png` | 560px (`.tv__main` 739px) | 0 | same seeding, same gesture. SVG 796 → **596px** mid-drag and the COMPONENT column comes into frame. |
| `…_2_before_scroll_discarded.png` | 430px (grid 868px) | parked at 666 of 666, then a study click | settled frame, `scrollLeft` **0** — the reader is back at the left edge. |
| `…_2_after_scroll_carried.png` | 430px (grid 868px) | parked at 666 of 666, then a study click | settled frame, `scrollLeft` **612**, the new maximum on the narrower content. |
| `…_3_before_rails_slide.png` | 430px (grid 868px) | 666 of 666 | the DAG's left-hand rails clipped off the pane's left edge (SVG left −114.0px); the header band stops mid-pane. |
| `…_3_after_rails_hold.png` | 430px (grid 868px) | 666 of 666 | the whole DAG pinned against the pane's left edge (SVG left 0.0px); the header band spans the pane; the grid scrolls under the rails' own background, which is what the sticky is for. |

Shot 1 is a **narrowing** drag on purpose: a widening one pushes its own result
off the pane and photographs as almost nothing.

These are the first PNGs tracked in this repo. `.gitignore` does not exclude
images and nothing needed changing.

---

## The mutation witness

`sticky-rails-hold-a-scrolled-dag`'s `find` string **still matches
`apps/viewer/topology.css` byte-for-byte** — `.tv__rails`'s declaration line is
untouched, because the containing-block fix landed in `.tv__body`/`.tv__head`
as the handoff guessed it would. No replacement string is needed, and
`scripts/mutation_witnesses.json` was not edited.

```
node scripts/run_mutation_witness_tests.mjs --only sticky-rails-hold-a-scrolled-dag --repo C:\workspace\tolstack
  1/1 declared mutations witnessed
  reddens: [real] scrolled sideways, the DAG stays pinned to the pane's VISIBLE left edge — …
```

Its `expect_red` check kept its name verbatim for exactly this reason. Its
**`note`** is now stale — it still describes the limit this change removed —
and that file is owned elsewhere, so:
`docs/issues/ISSUE_20260916_the_sticky_rails_witness_note_describes_a_limit_that_no_longer_exists.md`.

---

## The three stale claims, rewritten rather than deleted

In `testRespine`'s scrolled arm, all naming this handoff:

1. *"but only as far as the room the DAG leaves beside it…"* → **"and it holds
   PAST the room the DAG leaves beside it, all the way to the far end"**. Same
   two operands, opposite assertion, so it is still the check that would catch
   the containing block shrinking back.
2. *"a respine rebuilds the pane, so a scrolled reader is at the left edge from
   the first frame"* → **"a respine carries the reader's sideways scroll onto
   the FIRST frame"**.
3. *"and it settles at the left edge on a pane the respine made narrower"* →
   **"and it settles where the reader was, clamped by the browser to the
   right-hand end of the narrower pane"**, asserting the exact clamped value
   rather than 0.

A **fourth** went red that the handoff did not predict: *"and the frame in
flight is drawn inside the pane from there, exactly as the unscrolled arms
measured"*, whose `dagPastGrid <= 1` was only ever true because the pane was
being reset to `scrollLeft` 0. A sticky DAG over a scrolled grid is *supposed*
to overlap the columns that have slid under it — that is what `.tv__rails`'s
own background is for — so that operand was dropped with a comment saying why,
and the rest of the claim kept.

Two new sub-checks, in the same arm: the ghost's window equals the live pane's
(`catchFrame` gained `ghostScrollLeft`), and the arm re-parks at the far end
before the study click (the sticky measurement above it had left the pane at
`clientWidth − dagWidth − 20`, which is not the far end and made "carried, then
clamped" unfalsifiable — the console line in the first green run read
`666 -> 532 -> 532` and that 532 was the sticky probe's own number, not a
clamp).

The jog-zone block gained four: both grips dragged for real at a 560px pane and
at `TOPO_PANE_WIDTH.max`, with the ELEMENT column pre-dragged +220. It restores
the pane width and the column width afterwards and asserts that it did, because
the divider block below it measures from the shipped default.

---

## Scope: one file past the fence, reported as the handoff asks

The handoff scopes me to `apps/viewer/topology.{css,js}`,
`apps/viewer/views/topology.js`, `apps/viewer/topology_app.js`,
`apps/viewer/tests.js` and two regions of
`scripts/run_viewer_browser_tests.mjs`. I also edited **`apps/viewer/README.md`**
(two passages) and added **`tests/debug_topology_grid_geometry.mjs`**.

* The README told the reader that a widened jog zone "put its own drag grip
  *underneath* the preview pane… so the interaction is filed rather than
  papered over", citing the issue this session closes. Leaving a live document
  stating something false is the defect this repo has a whole handoff named
  after. The same paragraph exists as a comment on `.tv .detail` in
  `topology.css` (in scope) and both were corrected together — including the
  "underneath" reading, which the screenshots disprove.
* The three-way collision the handoff warns about is **historical**: both
  `mutation_witness_tier_reaches_its_checks` and
  `viewer_unwitnessed_surface_guards` had already merged into the 2026-09-16
  batch (`1b3848b`) my worktree is cut from, so `apps/viewer/` has no other
  live claimant. I did not touch `apps/viewer/topology_app.js` at all — the
  app shell needed nothing.

`docs/strategy/` untouched, `apps/annotate/` untouched,
`scripts/mutation_witnesses.json` / `scripts/run_mutation_witness_tests.mjs` /
`tests/test_mutation_witnesses.py` untouched, and none of the crop or
value-guard modules touched.

---

## Test state

* fast tier: `node apps/viewer/run_tests.cjs` — **334/334** (was 329; +5).
* browser tier: `node scripts/run_viewer_browser_tests.mjs --repo C:\workspace\tolstack`
  — **20/20 suites**, 320/320 in `test.html` over both `file://` and `http`,
  188/188 in each topology suite, 40/40 in the respine suite.
* Python: `venv-win/Scripts/python.exe -m pytest -q` — **1 failed, 1175 passed,
  1 skipped**. The failure is **pre-existing and not mine**:
  `test_no_live_document_states_an_unguarded_hardware_entry_count` matches the
  phrase *"the other three do not have"* in a 2026-09-15 strategy brief against
  its `other (N) do not` pattern. It reproduces with my two app files reverted
  to `1b3848b`, and my diff touches neither the brief nor the guard. Filed:
  `docs/issues/ISSUE_20260916_a_strategy_briefs_prose_trips_the_hardware_entry_count_guard.md`.
  The handoff's "at or above 1155 passed" is met (1175, and the suite has grown
  by two batch merges since that number was taken).

### Two fast-tier tests are node-only on purpose

`apps/viewer/tests.js` runs in **both** the node DOM shim and a real browser
(`test.html`). The two new scroll-carry tests write a `scrollLeft` and read it
back, and a real browser silently refuses to scroll the **detached, unlaid-out
`<div>`** this suite renders into — so they would have asserted `0 === 0` about
a pane that was never scrolled. They probe for the capability first
(`canHoldScroll`) and return if it is absent, with a comment pointing at the
browser tier's scrolled arm, which makes the same claim on a laid-out pane with
real overflow. Cost me a full browser-tier run to find; if you add a test here
that touches scroll, layout or hit-testing, expect the same.

---

## Running the browser tier from this worktree

Unchanged from every previous viewer session and still the first thing that
bites: `node_modules/` is gitignored and exists only in the main checkout.
`cp -r C:/workspace/tolstack/node_modules ./node_modules` **and**
`--repo C:/workspace/tolstack`. Under the Bash tool, write the `--repo` value
with **forward slashes** — `C:\workspace\tolstack` comes through with the
backslashes eaten (`workspacetolstack`) and the run dies on a missing
`topologies.json`.
