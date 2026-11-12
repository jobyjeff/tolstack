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

> **Correction (review, 2026-11-12).** Not quite all through `setHovered`:
> `revalidateHover` (next paragraph) writes `state.focus.hovered = null` and
> `hoverSource = null` directly, on purpose -- it runs before `applyFocus` at
> the end of a paint and must not re-enter it. So hover has one setter and one
> paint-time clearer (`grep -n "focus.hovered = " apps/viewer/topology_app.js`:
> three sites, two in `setHovered`, one in `revalidateHover`). Selection's
> "one writer" claim above re-derives exactly.

**A hover survives a repaint only where the pointer still is.** The first
browser run of the topology suite found the Preview stuck on a hovered row
with the pointer parked at (4, 4): the old `mountPreview` nulled every hover
key on each render, so a stale hover never outlived a paint; the one state
does outlive it, and the mark rebuilt under a pointer that has since moved on
fires no mouseleave. Two fixes, both in `topology_app.js`: `revalidateHover`
runs before `applyFocus` at the end of every paint and keeps a `dag`/`tree`/
`page` hover only if `document.elementFromPoint(pointerAt)` is still part of
that entity (`entityUnder`; the scene's hover is the scene's, since this page
does not repaint it), and the page-level `mouseover` on anything outside the
DAG pane and the tree that is no element's row lets any non-scene hover go
(one pointer, demonstrably elsewhere).

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

> **Correction (review, 2026-11-12).** Eleven suites read a leader, not
> eight. `kinematic study page` asserts `leaders > 0` in three `[real]`
> checks and was red 24/27 in the review's whole-tier run (it was not on
> this handoff's `--only` list); `topology height budget` and `parts as
> blocks` read leaders only for drift and were green over zero of them.
> All three turn leaders on since `5e998fbf` and are green with them drawn.

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
element rows of the edges at the node: the pane is still scoped to the
selected node (`filter-element` -- the first cut tried dropping it and
cutting the pane's whole list by the node's edges on the page, and the probe
`tests/debug_bind_rows_20261111.mjs` showed the whole list is the open
study's seven elements, none of which touch the pitch link's lower centre),
and the page cuts the rows by the node's edges too
(`VA.sceneRowsForFeature(tree, node, edgeIds)`); element rows carry
`data-edge` so the mirror's key names the edge. A second feature row opened
in bind mode without being selected therefore has no rows to show; sweep
mode's rows are the whole rail's and every open row has its end.

## Witness specs

- **Added (12):** the six fast guards (the leader default; the off geometry;
  a feature's body; the model's focus resolvers; the tree lit in place; the
  pane's pointer telling the page) and six browser guards (leaders off by
  default; the seam row with no leader; turned on; off keeps the zone; the
  real graph's off stop; the feature row is the one title).
- **Renamed with their guard (16):** the rail suggestion suite's seven, the
  rail-holds-still suite's six, the sweep rail's hub end, the armed pick's
  pressed row and its row template -- each spec moved to its
  derived name with `expect_red` rewritten; where the mutation's anchor was
  the code that left (the twisty, the Pick button, `filter-element`, the
  legend's glyph), the mutation was re-pointed at the code that replaced it.
- **Re-anchored (17 mutations in 15 specs, 12 of them browser):** every spec whose `find` sat on
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

## Shots (`docs/sessions/lessons/shots/one_selection_one_hover_and_leaders_off/`)

Taken by `node tests/debug_one_focus_20261110.mjs` against this tree's `apps/`
over the main checkout's `data/`, rebuilt from this tree (`af383764` and
after), on the end-stop model v2 with the pane open on the newest sweep (the
P2 run) and leaders off, at 3840×2160 (`_3840`) and one pass at 5120×2160
(`_5120`); beside each the probe prints what is lit on every surface and what
the pane holds, and I read every one before writing this. The nit shots are
the nav column alone (`n*_nav_*`), the page cut away.

| shot | what it shows |
| --- | --- |
| `f0_v2_sweep_loaded_leaders_off_3840` | at rest: `Leaders: off`, no leader on either tier, the sweep playing |
| `f1_tree_feature_selected_3840`, `_5120` | the hub's `locating boss` clicked in the tree: its row open to `candidates · 2`, two faces with why, `Pick a face…`; its dot selected on the DAG, the Preview frozen on it, the pane's end row selected |
| `f1b_tree_feature_after_repaint_3840` | the same after the window was resized (a full repaint): every surface still lit |
| `f2_dag_node_selected_3840` | the tangential link mount's `pilot bore` dot clicked on the DAG: its part opened, its row selected and open, the Preview frozen, the pane's end selected -- and its body empty, since the P2 run (v1's) carries no end for a v2-only node (`ISSUE_20261111_a_feature_the_newest_sweep_does_not_carry_opens_to_an_empty_body.md`) |
| `f4_scene_end_selected_3840`, `_5120`; `f4b_..._after_repaint_3840` | an end selected in the 3D pane (the rail's `inspect`, what a bead or face click does in sweep mode): the gas-spring mount's `bushing bores` row selected and open to `face 53 of 213668-002`, eight candidate faces, `show all 10`, `Pick a face…`; its dot selected; the Preview on the DAG dot the pointer still rests on |
| `f3_grid_row_selected_3840` | the grid row `tangential link mount base face to attachment bore` clicked: the row selected, the dimension's two end features lit in the tree, the Preview frozen on the edge -- and the pane taken to bind mode by its follow rule (`ISSUE_20261111_an_edge_selected_on_a_topology_page_with_the_sweep_loaded_takes_the_pane_out_of_the_sweep.md`) |
| `f5_grid_row_hovered_3840` | a grid row hovered: the edge's two end features `--hot` in the tree, its bar and dots `--lead` on the DAG, the Preview on it |
| `f6_tree_part_hovered_3840` | the hub's part row hovered: its four features' dots and its dimensions' bars lit on the DAG and in the grid |
| `f7_leaders_on_3840` | the toggle clicked once: `Leaders: angled`, 25 leaders drawn, the selected edge's two on top |
| `n1_nav_hub_open_features_closed_3840` | the hub open: four feature rows, each with a closed twisty, one mark each |
| `n2_locating_boss_open_3840`, `n2_nav_...` | `locating boss` (has suggestions) opened in place: state line, two candidate faces, `Pick a face…` |
| `n3_root_bearing_bore_open_3840`, `n3_nav_...` | `blade 1 root bearing bore` (has none) opened in place: `no face bound`, `Pick a face…` -- the same layout and one title; both rows of the shared node and the interface row under Joints between bodies lit |
| `n4_nav_selected_row_folded_3840` | the selected row folded by its twisty: closed, still selected |

What I looked for and did not find: a second title under an open row, a legend
under a row, the column scrolling when a row opened (the probe reads
`scrollTop`), a leader drawn with the toggle off, a console error on any shot
(`errors: []` beside every one). What I found and filed is above and in
Filed below.

## What the browser tier taught, run by run

Five passes of the thirteen suites this handoff touched, each red one read
and fixed before the next:

- **A hover outlived the pointer across a paint** (topology suites: the
  Preview stuck on a row with the pointer at (4, 4)) -- `revalidateHover`,
  above.
- **A fresh document has leaders off again** (the zoom suite's kinematic page
  is a second `goto`): `leadersOn` after every page open that reads a
  leader, not once per suite.
- **A row that holds its list is clicked on its text**: the end row's centre
  is now inside its list, and the list stops clicks (rail suggestion suite).
- **The pane's rebuilds take its hover down, and the page's dedupe kept
  saying "already posted"** (the 3D pane suite's body hover): every
  `annotate:tree` resets the posted hover and re-posts; a clear is posted at
  once rather than debounced, or a leave-and-enter within 150 ms coalesced it
  away. This also replaces the old "clear at once" special case with one rule.
- **A bind-mode element the pane selects is the pane's own step**: with
  element rows keyed by edge, `followScenePick` would have selected the edge
  and closed the feature row over the list the reader was using.
- **A joint's 3D dot stands for two nodes, and the hover had to light both
  ends' rows** (seam leaders suite): the entity is the edge joining the
  members, and a gap interface now lights its edge and its two ends' nodes.
- **A selected feature whose joint is folded in the pane had no row to
  activate** (the pilot bore from the DAG): `syncSceneInspect` posts the
  pane's own `inspect feature <edge> <end>`, which opens the joint, and the
  next tree carries the rows.
- **The mirror check had always tested bind mode by accident**: its page is
  opened with `?embedded=1` and `page.frames().find(url includes
  "embedded=1")` returned the main frame, so the sweep ran in the outer page
  (whose rail posts to nobody) and the only tree ever read was the iframe's
  boot tree. It drives the child frame now and reads the sweep end's row.
- **Playwright's `.first()` row and Chrome's hover under a resting pointer**:
  the hub's candidate list hover washed face 3469, not the top face 3460 --
  the rail rebuilds for seconds after a run loads and the row under the
  pointer changes; the check hovers the top face's row by id and waits for
  its wash.

## Filed

- `ISSUE_20261111_the_pane_keeps_two_selections_of_its_own_beside_the_pages_one.md` (strategy).
- `ISSUE_20261111_renderscenetree_and_the_marks_legend_are_tested_but_the_app_no_longer_draws_them.md` (chore).
- `ISSUE_20261111_the_panes_hidden_rail_still_wears_a_pick_button_on_contributor_rows.md` (chore).
- `ISSUE_20261111_an_edge_selected_on_a_topology_page_with_the_sweep_loaded_takes_the_pane_out_of_the_sweep.md` (strategy, med).
- `ISSUE_20261111_a_feature_the_newest_sweep_does_not_carry_opens_to_an_empty_body.md` (strategy).
- Addenda on `ISSUE_20261110_the_faces_layer_repeats_the_marks_legend_under_every_selected_feature.md` and `ISSUE_20261110_a_body_or_part_hovered_in_the_tree_lights_the_scene_in_sweep_mode_only.md`.

## Suite record

Projections rebuilt from this tree into the main checkout's `data/` first
(every builder run by hand from the worktree with `--data-root
C:/workspace/tolstack/data`, in `rebuild_projections.ps1`'s order, after the
first commit `af383764`; the merge of `integration` that followed touched no
builder input, so the stamps still agree). Every run below was made from this
worktree; the browser and witness runs read the main checkout's data through
`--repo` and the `node_modules` junction (removed before sign-off, from
PowerShell with `cmd /c rmdir`; the main checkout's `playwright-core` is
intact).

| tier | command (from the worktree) | result | wall |
| --- | --- | --- | ---: |
| default | `C:/workspace/tolstack/venv-win/Scripts/python.exe -X utf8 -m pytest -q` | 1 failed, 1927 passed, 1 skipped, 2 deselected -- the one red is `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`, the deliberate worktree red (its `[real]` tier has no projection under the worktree's `data/`); an earlier run on the tree before the browser fixes also found `test_no_viewer_vocabulary_is_spelled_as_a_comparison_chain` red on `model.js`, fixed in `96174c56` | 470 s, inside budget, recorded with `dispatch suite-time record` |
| viewer fast + `[real]` | `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` | 681/681 (676 before; the six new, one renamed) | ~25 s |
| annotate fast | `node apps/annotate/run_tests.cjs` | 307/307 | ~20 s |
| browser, `--only` per suite this handoff changed (13 suites, final pass) | `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack --only "<suite>"` | suite http 544/544 · topology file:// 214/214 · topology http 214/214 · the DAG zoom, Fit and the grid header 48/48 · topology file:// respine 44/44 · 3D pane follows the selection 32/32 · annotate sweep rail 24/24 (`--write-bind-rail-snapshot`, the element rows' new `data-edge`) · annotate armed pick 17/17 · annotate rail suggestion 19/19 · annotate rail holds still 42/42 · the Preview from the scene 11/11 · leaders across the seam 26/26 · the model drawn alone and led 6/6 | 10 + 305 + 213 + 176 + 93 + 97 + 50 + 11 + 60 + 72 + 13 + 98 + 45 s across five passes (each red read and fixed between passes, above) |
| mutation witnesses, fast (`--only` per spec: 6 new, 3 re-anchored) | `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack --only "<guard>"` | 15/15 mutations WITNESSED | ~8 min |
| mutation witnesses, browser (`--only` per spec: 6 new, 16 renamed, 12 re-anchored = 34) | same | **28 specs WITNESSED (32 mutations), 6 not run** -- every spec whose suite is the annotate rail, the 3D pane, the Preview or the seam leaders, plus two of the topology page's (`leaders are off by default`, the seam row with no leader). Two clean runs came up red on a first attempt and were WITNESSED on a retry: the 3D pane suite's known flake under this runner (`ISSUE_20261105_3d_pane_follows_selection_suite_flakes_under_the_witness_runner.md`, the contributor-row spec, 19 min) and one topology run (the seam-row spec, 10 min). Not run, left to the review's `--changed-since` gate: the six whose suite is the five-minute topology page -- `turned on, they draw in the first drawn style`, `one more click: leaders off…`, `[real] the next click is off…`, `hovering a grid row previews its record…`, `[real] switching topology keeps the density…`, `[real] switching topology keeps the leader STYLE too` -- at ten minutes each under the slot, which the budget rule puts on the gate rather than on a branch | 11 min (one spec) + 67 min (26 specs) + 30 min (the two retries), under the browser slot, over about three hours of wall clock with the suites and the shots interleaved |

Not run: the whole browser tier and the witness `--changed-since` gate --
the review's, after the merge (CLAUDE.md's table). The suite-time ledger row
for the default tier is recorded with `dispatch suite-time record`; `--only`
runs write nothing.
