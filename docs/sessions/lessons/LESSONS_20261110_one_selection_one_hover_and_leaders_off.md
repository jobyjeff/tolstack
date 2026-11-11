# LESSONS 2026-11-10 — one_selection_one_hover_and_leaders_off

Handoff: `docs/sessions/active/HANDOFF_20261110_one_selection_one_hover_and_leaders_off.md`.
Written as the work landed; the shots and the suite record are last.

## The state object, as shipped

`state.focus = { selected, hovered }` in `apps/viewer/topology_app.js`, each a
model entity `{kind, id}` with kind one of `VA.FOCUS_KINDS` (`apps/viewer/
model.js`: body, part, feature, dimension, interface, joint) or null. Two
setters and one applier:

- `setSelected(entity)` writes `focus.selected`, derives `state.selection`
  (the element form -- `{kind: node|edge, id}` -- every view already keys by,
  through `VA.focusElementOf`) and clears the reader's fold on a newly
  selected feature so its row's default (open) applies again.
- `setHovered(entity, source)` writes `focus.hovered`; a set from any source
  wins (one pointer), a clear counts only from the source that set it
  (`dag`, `tree`, `scene`, `page`).
- `applyFocus()` lights every surface from the two: the DAG and the grid
  (`VA.lightTopoKeys` over `VA.focusElementKeysOf`), the tree
  (`VA.lightNavTree` over `VA.focusNavRowsOf`; the selected rows are drawn
  lit by the nav's render through the same resolver), the Preview (the
  hovered element's key, else the frozen one's), the pane (`syncPaneHover`,
  `syncSceneInspect`) and the seam leaders. It runs on every change and
  after every paint (`paint()`'s tail, `repaintDag`, `ctx.onPainted`), so
  the two mechanisms a full repaint used to clear -- `paneHot`/`sceneHot`
  and the Preview's three keys by source -- are gone with their variables.

The DAG's own `hot` state (`views/topology.js`) stays, with ONE lighter
behind both doors: `setHot` (the pane's pointer; also tells the page through
`onChange`) and `VA.lightTopoKeys` (the page's one hover) both call
`lightKeys`. The pane's pointer still wins while it holds a key, since what
it lit is the page's hover. The change that mattered: a leave with nothing
held (`on` null after a repaint under the resting pointer) still tells the
page, which is how a hover carried across a repaint is let go of; the old
`if (hot.on === key)` guard swallowed it.

Translation lives in `model.js` only: `VA.focusEntityOf` (a shared node is
its interface, a node on one part that part's feature of it; a gap edge its
interface, any other edge its dimension), `VA.focusElementOf`,
`VA.focusElementKeysOf` (a part's and a body's are everything they hold, a
joint's its constraints) and `VA.focusNavRowsOf` (a feature lights its row,
the other row of its node and the interface the node is; a dimension its two
end features). Without a model block an element stands for itself.

## Every writer of selection and hover that remains, and why

Selection -- all through `setSelected`:

| writer | why it stays |
| --- | --- |
| `selectElement(kind, id)` (DAG mark, grid row -- `ctx.onSelect`; scene pick via `selectFromScene`) | an element clicked is selected as the entity it is |
| `onNavFeature`, `onNavInterface` (`selectEntity`) | the tree's rows |
| `onScenePick` -> `selectFromScene(featureEntityOfNode(...))` | a 3D anchor clicked; the node's feature so the row opens and is revealed |
| `followScenePick` -> `selectFromScene` | the pane's rail selected a row (a Take's partner end) |
| `unfreeze()` (Esc, the pin, empty canvas, a second click) | the one way to let go |
| `selectTopology`, `selectKinematic`, `onNavStudy` (`setSelected(null)`) | a selection means nothing on another model or study |
| the deep link (two sites) | `?node=`/`?edge=` resolved to an entity once at load |

`state.selection` is written in `setSelected` and nowhere else (one grep:
`state.selection =`).

Hover -- all through `setHovered`: `ctx.onHot` (the DAG's and the grid's
marks, source `dag`; a rail's key is no element and reads as the pointer on
nothing), `onNavHover` (`tree`), the scene's `annotate:hover` message
(`scene`; a joint's dot with `members` is the model's joint one member is an
interface of), `wirePageHover` (`page`: any `[data-row-kind][data-id]` row
outside the DAG pane and the tree -- none exists on the page today, kept as
the one listener for one that arrives), and the flyout's `close` (clears a
scene hover).

What the pane still keeps of its own, honestly: the sweep rail's `inspect`
(its selected end row) and the model layer's `model.selected` (its selected
dot) are two pane-side selections. The page drives both -- `model select
node` and a rail `activate` on the selected feature's end row
(`syncSceneInspect`) -- and reads both back as gestures into the one state
(`onScenePick`, `followScenePick`), so neither can hold a different answer
for long, but they are copies. `sceneTreeSelected`, `seamScrolledTo`,
`paneFollowed`, `sceneSelectPosted` and the hover's two posted keys are
dedupes of outbound or inbound messages, not state.

## Leaders

`VA.LEADER_STYLES` gained `off` (off -> angled -> jogged -> off) and
`VA.DEFAULT_LEADER_STYLE` is `off`. `VA.leaderGeometry` with `style: "off"`
builds no leader and the same zone, width and height; it now also returns
`boundaryEdge` (the plan's seam row per non-internal node), which
`VA.lastTopoRender` carries and `scrollSelectionIntoView` reads instead of
the leader hit path's data attribute, so a selected node still finds its
grid row with no leader drawn. `drawSeamLeaders` clears and returns while
off; the scroll listener and the ResizeObserver skip the seam re-measure
while off. `VA.LEADER_STYLE_ON` (`angled`) is what the browser tier turns
leaders on to (`leadersOn(page)`, called after every page open in the eight
suites that read a leader).

## Which pick affordance stayed

**The last row of the end's list stayed; the hover Pick / Re-pick button
went.** Reasons: the row is visible in every state (a feature with nothing
bound used to show only `no face bound` and a button on hover, which Jeff
found inconsistent with the suggested case), it gives one layout -- state
line, candidates if any, action -- and one wording. `AA.CANDIDATE_LIST_WORDS
.pickOther` is `Pick a face…` (was `Pick another face…`); while armed the
same row reads `AA.ARMED_PICK_WORDS.cancel`, pressed (`aria-pressed`, which
the mirror carries as `row.pressed` and the shell's Esc reads). In the pane
(`apps/annotate/app.js`) `featureRow` always appends the end's
`candidateList` with `endPickAction(topology, via)` and no `candidateTwisty`
in sweep mode; the proposal case keeps Accept and lost "Pick a different
face" (`AA.SUGGESTION_ROW_WORDS` lost those two words). Bind mode's element
rows keep their disclosure and the same list function with the same words. A
contributor row's Pick (the jump to bind mode) is untouched: it never
appears under a feature.

The feature row (`views/nav.js`) carries a real twisty while the scene is
open (`handlers.sceneSlot`), keyed `f:<fid>`, open when it is the selected
feature unless the reader folded it; every open feature row has a slot
(`data-scene-feature`) that `renderSceneSlot` fills with
`VA.renderFeatureBody`: the end row's state line (its `sub`, with the pane's
kind and mark as data), its own buttons (Accept; an armed pick's part
switch), then its list. The pane's head row for the feature is not drawn, no
legend is drawn, and opening a row scrolls nothing (`revealNavRow` runs only
for a selection the scene made: `revealPending`). With the scene closed the
row is a leaf: there is no body to open. In bind mode the body is the
element rows of the edges at the node, cut by the page
(`VA.sceneRowsForFeature(tree, node, edgeIds)`); the pane's
`filter-element` scope is no longer posted, and element rows carry
`data-edge` so the mirror's key names the edge.

## Witness specs

- **Added (12):** the six fast guards (the leader default; the off geometry;
  a feature's body; the model's focus resolvers; the tree lit in place; the
  pane's pointer telling the page) and six browser guards (leaders off by
  default; the seam row with no leader; turned on; off keeps the zone; the
  real graph's off stop; the feature row is the one title).
- **Renamed with their guard (16):** the rail suggestion suite's seven, the
  rail-holds-still suite's six, the sweep rail's hub end, the armed pick's
  pressed row, the 3D pane's bind-mode check -- each spec moved to its
  derived name with `expect_red` rewritten; where the mutation's anchor was
  the code that left (the twisty, the Pick button, `filter-element`, the
  legend's glyph), the mutation was re-pointed at the code that replaced it.
- **Re-anchored (17 mutations in 15 specs):** every spec whose `find` sat on
  `state.selection =`, `selectedFeature`, `setPreviewHot`, `paneHot`,
  `followFeatureOfNode`, `schedulePaneCommand` or the DAG's `setHot` body.
- **Retired (1):** `[real] the legend draws every mark once, as the annotator
  names them` -- the legend is not drawn under a feature any more (the
  deliverable), and its mark words are on each row's hover.

Pins: fast 676 -> 681, browser 868 -> 873 (`scripts/guard_enumeration.mjs`).

## Gotchas

- **The fast tier's DOM shim matches `tag`, `.class` and `tag.class` only.**
  An attribute or descendant selector in a test or in app code the tier
  reaches returns nothing, silently; `VA.lightNavTree` walks
  `div.navtree__row` and filters by attribute for this reason.
- **A heredoc with single quotes in it breaks under the Bash tool here**
  (`unexpected EOF while looking for matching ''`): write the script to the
  scratchpad with the Write tool and run the file.
- **The witness runner's `--unenrolled` lists every guard without a spec in
  the tree (1053 on this branch),** not only the branch's own; grep it for
  the names you added. The derived file name is in its `write` line.

## Shots

(filled in below once the projections are rebuilt and the page is read)

## Suite record

(filled in below)
