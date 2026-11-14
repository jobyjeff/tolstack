# LESSONS 2026-11-12 — the_page_is_a_fixed_layout_and_nothing_scrolls_the_document

Run 2026-11-14. Step F1c of
`dispatch/docs/strategy/drafts/DRAFT_tolerance_analysis_over_the_kinematic_model.md`:
the page is exactly the window, and the tree, the 3D pane, the DAG, the grid
and the Preview each scroll by themselves.

## What the shell is now

`[title + tree] | 3D pane | DAG | [banner, settings, grid, totals, Preview]`
(`apps/viewer/topology.html`; README section "The page is a fixed layout, and
nothing scrolls the document").

- `#topopane` is the DAG's region, a box that does not scroll; its drawing's
  scroller is `.tv__hscroll`, both ways. `#topogrid` is the grid's region; its
  scroller `.tv__gridscroll` holds the header (CSS `position: sticky`) and the
  rows. `VA.renderTopoPane(root, ctx)` builds both, the grid into
  `ctx.gridRoot` — or, with none given (the pose film's shadow render, the
  fast tier), into `root` after the drawing. Both scrollers are rebuilt per
  paint, so both scrolls are carried across a repaint (`carriedScroll`,
  `carriedGridScroll`; a different topology starts at the top-left).
- The banner moved to the head of the right-hand column, so the 3D pane and
  the DAG start at y = 0. The title sits above the tree in `.tv__left`; the
  model picker is sticky at the tree's top.
- Seams, all wired by `wireDivider` and remembered: the tree (`#nav-divider`),
  the 3D pane (`#flyout-divider`), the right-hand column (`#side-divider`, kind
  `pane`, a NEW key `tolstack.viewer.sideWidth` — the old `detailWidth` held the
  Preview's width beside the grid, a number that means something else now),
  and the Preview's height (`#detail-divider`, now a row divider, kind
  `preview`, `tolstack.viewer.previewHeight`, up/down arrows).
- With no width dragged, the right-hand column is the grid's own width
  (1148 px at default columns), less on a narrower window: it leaves the tree
  and the middle 1260 px, and never goes under 560 px (`MIDDLE_KEEPS`,
  `PANE_DEFAULT_MIN`, `applyPaneWidth`, re-applied on resize). Each number was
  found by a suite: the grid's whole width at 1600 left the DAG 98 px beside
  the 3D pane at its floor (the seam suite failed 20 checks); 1060 left the
  pane pinned at its floor with no room to resize at 1920 (the flyout suite);
  under 560 the kinematic results' chart no longer fits (the kinematic
  suite). At 3840 and 5120 none of it binds.
- The 3D pane opens at half of the middle when no width was dragged
  (`flyoutDefaultWidth`); `VA.FLYOUT_WIDTH.max` went 1200 → 2400 so that half
  is reachable at 5120.
- Every grid column has a grip; Contribution starts at 172 px (the widest
  total, `±2.355 deg · RSS ±1.034`, 168 px; 150 clipped seven numbers and a
  number never clips here). Grips whose boundaries are past the grid's visible
  right edge used to all pin to the same pixel — fine with one resizable
  column, a stolen drag with ten (SOURCING took ELEMENT's). Only the first of
  them is pinned now; the rest are not drawn.
- The Preview keeps its 40 % of the column whatever the grid's length: the
  grid's region carries a shrink weight of 1000 to the Preview's 1, so a long
  grid gives way (and scrolls) first — beside v1's grid the Preview had shrunk
  to 490 px. Only on a window too short for both does the Preview shrink too,
  never under 120 px nor into the grid's last 160. A Preview crop stays at
  520 px, the width it had inside the old 560 px pane, so the lightbox is
  still the big view.
- Every divider sits above the 3D pane's dialog (z-index 4 over 3): the
  click-around found the tree's divider under the dialog's box with the pane
  open, so the tree could not be resized then.

## Side by side · 3D · DAG

`VA.PANE_VIEWS` (`both` | `3d` | `dag`), `state.paneView`, `?view=3d` /
`?view=dag` (the default writes no parameter), `tolstack.viewer.paneView`. The
control is in the settings bar and only while the pane is open; the class
(`tv--view-3d`, `tv--view-dag`) is on `main.tv` only while the pane is open, so
closing the pane gives the DAG the middle whatever the choice. "DAG" hides the
open dialog (`display: none`) rather than closing it: the scene, the camera
and the loaded meshes survive, and the scene still lights from the one
selection.

How the three read (shots in `shots/the_page_is_a_fixed_layout_and_nothing_scrolls_the_document/`):

- **Side by side** at 3840: the scene 1189 px and the DAG 1201 px share the
  middle, and the grid fits its column with no sideways scroll. At 5120 the
  scene is 1829 and the DAG 1841. Both read well; the end-stop model's DAG is
  ~350 px of drawing in its 1201 px region.
- **3D** is the most striking of the three: 2391 px (3840) / 3671 px (5120) of
  scene beside the grid, with the tree on the left still driving it. For
  binding and for reading the mechanism this is the better view at both
  sizes.
- **DAG** today mostly shows how little room the current drawing uses: about
  250 px of drawing in a 2390 / 3670 px region, the rest empty. It is the view
  the map will make sense of; until then it is not worth defaulting to.

So, for Jeff's question (tabs as the default once the DAG is a map): the
three-way control costs nothing to keep, "3D" already earns its place, and
"DAG" can only be judged once the map fills its region. Side by side stays the
default.

## The region the map will draw in

The DAG's region (`#topopane`), measured at rest with the tree at 300 px and
the right-hand column at its default, both models:

| Window | Side by side | 3D | DAG |
|---|---|---|---|
| 3840×2160 | 1201 × 2160 | — (hidden) | 2390 × 2160 |
| 5120×2160 | 1841 × 2160 | — (hidden) | 3670 × 2160 |
| 1920×1080 | 485 × 1080 (v2), 558 × 1080 (v1) | — (hidden) | 958 × 1080 |

At 1920 the document does not overflow either, in all six cases (both models,
three views); the grid's column is 660 px there and the grid scrolls sideways
under its rows (1132 px of table), which is the laptop compromise Jeff named.

The region starts at the window's top-left of the middle (x = 1490 / 2130 side
by side, 301 in "DAG") and runs to its foot. The map's aspect is the open
question: side by side it is a tall column (about 0.56 : 1 at 3840, 0.85 : 1 at
5120); in "DAG" it is wide (1.1 : 1 and 1.7 : 1).

## Measured: nothing scrolls the document

`tests/debug_fixed_layout_20261114.mjs` (hand-run; `measurements.json` beside
the shots). `document.scrollingElement` overflow, X / Y, in every case:

| Window | Model | Side by side | 3D | DAG |
|---|---|---|---|---|
| 3840×2160 | v2 (`vpa_end_stop_v2`) | 0 / 0 | 0 / 0 | 0 / 0 |
| 3840×2160 | v1 (`vpa_pitch_linkage`) | 0 / 0 | 0 / 0 | 0 / 0 |
| 5120×2160 | v2 | 0 / 0 | 0 / 0 | 0 / 0 |
| 5120×2160 | v1 | 0 / 0 | 0 / 0 | 0 / 0 |

Each region scrolls alone: on v1 the DAG's scroller is 3982 px of content in
2160 and the grid's 2600 in 1457 (before the Preview stopped shrinking), and
the browser tier's `[mock] scrolling the DAG moves the DAG alone, and
scrolling the grid the grid alone -- never the document` pins it.

## What became of each trap

1. **The document-scroll check is rewritten, not worked round.**
   `testHeightBudget` now pins the region contract: no document overflow either
   way, each region a scroll container inside the window, one region's scroll
   moving no other, a repaint putting each back, the grid's rows directly under
   their header in every length mode, and the same on the product model. Its
   window went to 1400 × 600 and the mock DAG is zoomed in with the reader's
   own wheel, so "scrolls something real" is true of the fixture.
2. **The unreachable "bounded pane" branch is deleted** — all eight sites. The
   region's scroller is always the scroller now, so `paneScroller`, `ctx.bounded`,
   `.tv__scroll--bounded` and the window-scroll fallbacks in `scrollDag`,
   `dagScrollY`, `setDagScroll` and `viewport` went; the "bounded" behaviour
   (carry the pane's own scroll, scroll the pane not the page) is what every
   page does.
3. **The JS header pin is gone**: `VA.pinTopoHead`, `VA.headPinOffset`,
   `VA.stickyOffsets`, `VA.syncStickyOffsets`, `visibleTop`, the `--bar-h` /
   `--filter-h` tokens and every caller. The header is the first child of the
   grid's scroller with `position: sticky; top: 0`.
4. **The comments describing the 2026-10-26 layout** are rewritten: the 3D
   column's lead comment in `topology.css` ("nav | scene | DAG + grid", "the
   preview pane stands down instead"), the flyout-open block ("the row is nav |
   scene | model + grid | results"), the grips' block (sticky jog grip, the
   preview pane over the grid), `.tv__scroll`'s full-page-scroll essay and the
   stack view's "let the DOCUMENT scroll". The legend's leader item and its
   "the page scrolls" sentence were wrong too and are rewritten. The README's
   two history sections carry a dated "Superseded" note.
5. **`ISSUE_20261112_at_3840_the_3d_pane_is_a_narrow_strip_under_the_sweep_bar`**
   is resolved on this branch: the shell sizes the pane (1189 px at 3840 side by
   side), the pane starts at the window's top, and nothing of the page sits over
   its top bar. The pane's own top bar is the annotator's and was not touched.

## Leaders

No leader runs from the DAG to the grid any more: the grid has its own region,
so a leader ending at the drawing's right edge would point at a row that is
somewhere else. `renderTopoPane` passes `style: "off"` to `VA.leaderGeometry`;
the plan's seams (`boundaryEdge`) are kept, because a selected node scrolls the
row its seam is above into view. The Leaders control now governs only the
leaders across the seam to the 3D scene and is **off / on** (the overlay has one
look, so "angled" and "jogged" had become two identical states). It can be set
at any time — a preference the reader sets before opening the pane — and its
hover says, whenever the pane is closed or not side by side, that it draws only
then (`VA.LEADERS_UNAVAILABLE`). An earlier cut disabled the button instead;
that broke every suite that turns leaders on before opening the pane and was
worse for a reader too.

The DAG-to-grid leader geometry, the jog zone's width and the DAG's centring
against the grid are still in the DAG's own layout, behind the handoff's fence
("do not change how it is laid out inside its region"):
`ISSUE_20261114_the_dag_still_lays_out_for_a_grid_beside_it_that_has_its_own_region_now.md`
hands them to the map. The jog grip and the app's jog drag did go: with no
leaders to spread they had no subject.

## Selection scrolls each region

`scrollSelectionIntoView` brings the selected row into view in the grid's
region (under its header) and the mark into view in the DAG's, each by its own
scroller and by the least it takes (`bringIntoView`). The filmstrip is
`shots/.../tree_selection.png`, from
`tests/debug_filmstrip_tree_selection_scrolls_regions_20261114.mjs`.

## Defects the browser tier found in my own change

- The kinematic play rewrote the grid's numbers under `nodes.pane`
  (`VA.applyStackText`), where no row lives any more — the numbers froze while
  the angle moved. Found by `annotate rail holds still`; fixed to
  `nodes.topogrid`. Grep for any `nodes.pane` lookup of a row before
  splitting anything like this again.
- The pinned-grip stack above, and the 98 px DAG at 1600.

## Tests

- **Witness registry.** Fast: 0 net guards; 13 new or renamed specs, every one
  WITNESSED with `--only` against the scratch root (about 55 s each). Browser:
  −37 net; twelve specs follow renamed guards, eight are deleted with theirs,
  seven new ones pin the region contract and the seams, nine had rotted anchors
  re-pointed. 37 reworded browser guards whose predecessors never had a spec are
  declared without one:
  `ISSUE_20261114_reworded_browser_guards_of_the_fixed_shell_carry_no_spec.md`.
- **A stale `index.lock`** in this worktree's git dir appeared after the witness
  runs; no git process was alive, and removing it was the fix.
- **The scratch data root** (`data/scratch/fl1114`, the memory's recipe) must be
  built from a *committed* tree: a build that overlapped an edit stamps
  `dirty` and the `[real]` tier refuses it.
