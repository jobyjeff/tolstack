# LESSONS 2026-11-22 — the_tree_sits_beside_the_3d_canvas_and_holds_still

Handoff: `docs/sessions/active/HANDOFF_20261122_the_tree_sits_beside_the_3d_canvas_and_holds_still.md`.

## How the tree redraws now

It is still rebuilt whole. The eighth patch would have been another
rebuild-and-hope, so the fix is the anchor, plus one place that knows the
tree's shape:

- **`VA.navPlan(model, state)`** (`views/nav.js`) is the tree's shape: the
  rows that exist, their fold keys and their order, for either grouping and
  under the filter. The renderer walks it, a selection opens the folds it
  names (`VA.navSelectionPaths`), and the hover's "holds" marks read its paths.
  `VA.navRowPath` / `VA.navRevealPaths` in `model.js` are gone. They wrote the
  shape a second time, as fold keys, and that second copy was why a selection
  opened folds for rows the reader never picked.
- **`takeNavAnchor` / `restoreNavAnchor`** (`topology_app.js`) wrap every
  rebuild: `renderNav`, and `renderSceneSlot`, which redraws only the bodies.
  Before the rebuild they record one row's kind:id and its screen y. After
  it, the column's scroll is set back and nudged by the difference. The
  anchor row is the one under the pointer. A pointer on a feature's body
  anchors that feature's row. The pointer is tracked by `pointermove` /
  `pointerleave` on `#navtree` and read with `elementFromPoint`. With the
  pointer off the column, the anchor is the `--on` row on screen, else the
  top row on screen. `overflow-anchor` was not used: the browser's anchor
  node is destroyed by the rebuild.
- **The selection reveals only its own row** (`revealLitRows`). It opens only
  the path to that row and scrolls only when the row is off screen, by the
  least that shows it. **A selection no longer opens a feature's body.** The
  body (Correct, Add a face, Unbind, Remove; all still working) opens by its
  twisty. There is one exception: when the pane moves the selection after a
  Take, a body that was open follows to the partner (`followScenePick`).
- **The ease** is a `requestAnimationFrame` tween of the height of the
  `[data-nav-under]` element over `--tree-ease`. Close eases first and then
  writes the fold; open writes the fold and then eases. It is not a CSS
  transition or WAAPI, because `scripts/filmstrip.mjs` steps `rAF` and
  `performance.now`, and only a JS tween is on that clock. It is skipped
  under `prefers-reduced-motion`.
- **First open of the pane** starts at scroll 0. Without that, the anchor
  (the Studies row) held still while the whole tree appeared above it, and
  the first open landed at the bottom of the column. That was the first
  thing the click-around found.

## What the left column held, and where each thing went

Before (integration `fdeebeba`, every paint): the model picker. Then "Rigid
bodies": each body > a "Parts" group > parts > features, and an
"Interfaces" group > joints / interfaces > their two ends, each end a feature
listed again. Then "Parts", the assemblies in no body, listed whole with
every member that was already under a body. Then "Joints between bodies"
(ends listed again), Studies, the orphan-bindings foot and the kinematic
section. With the pane closed, all of it was still there. Only the feature
bodies and the show/hide boxes went away.

| thing | now |
|---|---|
| picker | unchanged, always |
| bodies > parts > features | the **By part** grouping, pane open only; the "Parts" group row is gone (a body holds only parts) |
| the in-body "Interfaces" groups, "Joints between bodies" | the **By joint** grouping (body > joints inside it; "Joints between bodies"; "At no joint" for features no interface ends — v1 has 16, v2 none), pane open only |
| "Parts" (assemblies in no body) | "Across bodies", by part only, each assembly once with only its no-body parts (v2: each link and its two bearings) |
| All / Unbound and its count | the tree's head, beside By part / By joint |
| orphan-bindings foot | the foot of the structure, pane open only |
| Studies, the kinematic section | unchanged, always, below the structure |

## The levels' numbers

`apps/viewer/style.css` `:root`: `--tree-indent: 22px`, `--tree-guide: 1px`,
`--tree-band-spine: 3px`, `--tree-band-wash: 16%`, `--tree-ease: 140ms`. The
rules are in `topology.css` ("The levels look different"):

- **Body:** `--t-body`, 600 weight. It is a band: a 3px inset spine in the
  body's ink plus a 16% wash of it, and it keeps its 9px colour square.
- **Part and joint:** `--t-dense`, 600 weight, with 4px above, and 8px when a
  feature row sits above.
- **Feature and interface:** `--t-dense`, 400 weight.
- **Section label:** unchanged (micro, uppercase, muted).
- **Each level** steps in 22px, with a 1px `--line` guide from under the
  parent's twisty.

**Marks:** a 9px ring with a 1.5px border. It is muted while open, blue
(`--mark-proposed`) when suggested, and filled green (`--mark-bound`) when
bound. Parts and joints show "n of m". A part counts over its whole subtree,
so an assembly reads its members. A joint counts its ends.

## Deliverable 6: the cause as I found it

The handoff's measurement held, with one correction about what the scene
lights. **The viewer's fold read an assembly dimension's end on the
assembly.** Python reads it on the member (`model_view.end_feature` →
`Topology.dimension_ends`), and so does the annotator. The JS
`endFeatureKey` (`identity_fold.js`) used `edge.part`. For v2's
`pitch_link_length` / `tan_link_length`, the key at each end was
`vpa_end_stop_v2:pitch_link@…`, a feature no model has. `model.bindingsAt`
at those four ends was empty, measured (probe in the session):

```
before  pitch_link_length from []   to []    tan_link_length from []   to []
after   pitch_link_length from [b221f5#104] to [b221f5#140]  tan_link_length from [8f519f#64] to [8f519f#0]
```

The outer races' own features read the binding as bound throughout, through
their `…_od_to_centre` end. The scene's green sphere is v1's binding of each
link centre, picked on the **link assembly's** mesh (`b221f5…`, `8f519f…`),
where the face is the ball's (`docs/ANNOTATION_SURFACE.md`, "A feature on a
member"). It belongs to the outer race's "bearing centre", and the tree shows
that feature bound. So, measured over every bound record whose faces are on a
mesh v2 opens: **all 34 belong to a feature the tree shows bound, and none
before or after the fix is orphaned.** What Jeff saw was the inner race's
"ball centre", unbound, beside a green sphere that is its concentric
partner's. Both rows of each of the four ball joints now say "shares a face"
(`model.sharesFaceWith`, `VA.CONCENTRIC_INTERFACE_KINDS`). So do two
features whose records hold the same face. That catches one real case:
Jeff's 0112 and 0114 bound the same four faces to an inner race's bore and an
outer race's OD (`ISSUE_20261123_the_mount_end_outer_race_od_holds_the_inner_race_bores_four_faces.md`,
`needs: jeff`). The fix writes no event. The tan link's mount-end ball centre
is bound since Jeff's 0113. The other three ball centres are still unbound,
which is honest.

## What the next link must know about where a feature's form will sit

- A feature's body is `div.navtree__scene[data-scene-feature][data-nav-under="f:<fid>"]`,
  the `li`'s second child, under its row. The form will replace the whole
  tree (the sketch). Reopening the tree must go through `renderNav`, so the
  anchor brings it back at the same row. Save `nodes.navtree.scrollTop` when
  the form opens and put it back the way `structScroll` does for the pane.
- `onNavToggle`'s `f:` fold and the twisty on every feature row exist only for
  that body. When the form replaces it, drop the feature twisty, and the
  plan's `fold` for features with it. The fast test pins `data-nav-fold="f:…"`.
- The pane's second mark vocabulary (seven circle states and three diamonds,
  `.navtree__scene [data-mark]`) is still drawn inside an opened body. The
  three-state rule covers the tree's own rows only.
- Every rebuild still replaces the row elements. A press whose release lands
  after a rebuild has no click (filed, below). A form with its own inputs
  must not be inside anything `renderNav` clears, or it loses focus and
  typed text.

## Gotchas

- **The pane redraws the column several times a second for ~10 s after it
  loads.** The new suite waits for 2 s with no `childList` mutation on
  `#navtree` before it presses anything. Without that wait, 1 run in 4
  dropped a twisty press.
- **A test that clicks a feature row and expects its body now has to click
  `[data-nav-twisty="f:<fid>"]` as well.** Three suites did. The map suite
  read the tree's interface row with the pane closed, so that read moved
  after the pane opens, under By joint.
- **`git archive <sha> | tar -x`** into `data/scratch/tb`, with a
  `node_modules` junction, ran the baseline suites. `TOLSTACK_NO_LEDGER=1`
  keeps a baseline run off the ledger.

## Looked at (`shots/the_tree_sits_beside_the_3d_canvas_and_holds_still/`)

Served with `tests/debug_walk_merged_page_20261114.mjs --port 8893` (this
tree's apps) and `--port 8894` (a `git archive fdeebeba` export for the
before shots). Both ran over `data/scratch/tree1123`: a copy of `walk1123`
with Jeff's feature-identity log copied in. Every shot was read before this
table was written.

| shot | what it shows |
|---|---|
| `z0_before_pane_closed_1536` | before: with the pane closed, the whole structure is still in the column |
| `z1_before_ground_gas_spring_mount_open_1536`, `z2_…_3840` | before, Jeff's case: flat 13px rows, "Parts" / "Interfaces" group rows, a 16px step, every row the same weight |
| `a1_pane_closed_1536` | after, pane closed: picker and Studies only |
| `a2_pane_open_1536` | the first open, before the scroll fix: landed at the bottom of the column (fixed) |
| `b2_ground_gas_spring_mount_open_rest_1536`, `b3_…_3840` | after, Jeff's case: bands, semibold parts with "8 of 8", eight regular feature rows with green dots, guide lines |
| `b1_…_1536` | the same with the pointer on the part: the hover tint on its own rows and the "holds" dots |
| `c1_before_unbind_1536` → `c2_after_unbind_1536` | a write from the pane: the feature row stays at y=461, its dot becomes an empty ring, its body becomes "not bound" with a mate line, and the part's count goes from 1 of 2 to 0 of 2; "shares a face" on the four centre rows |
| `d1_by_joint_1536`, `d2_by_joint_unbound_1536` | By joint: the joint rows with "6 of 6", the constraints with their kind word and "n of 2"; Unbound filters it |
| `f1_open.png/.json`, `f2_close.png/.json` | the filmed fold (stepped clock, 25 ms frames): the body row at 134 and the part row at 247.5 in every frame; the next part goes 296.5 → 536 and back over about 140 ms |

The bind in `c1`→`c2` is an Unbind, because it is the one write a feature's
body makes in a single press. It went to the scratch log (116 → 117) and
was removed again before the scratch projections were rebuilt.

**Jeff's log:** `C:\workspace\tolstack\data\inbox\feature-identity\` was
116 files before and after. The listing sha256 was `efe47ec6…` and the
contents sha256 was `39e9abba…`, the same both times.

## Suite record

All runs were from this worktree. The browser and witness runners went
through a temporary `node_modules` junction, removed at the end.

| tier | command | result |
|---|---|---|
| default | `C:/workspace/tolstack/venv-win/Scripts/python.exe -X utf8 -m pytest -q` at `62406ae2` | 1 failed, 2619 passed, 3 skipped, 4 deselected, 486 s (recorded, inside budget). The one red is `test_viewer_js_suite_is_green`: the worktree has no `data/projections`, so the `[real]` tier is missing there, which is by design. |
| viewer fast + `[real]` | `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack/data/scratch/tree1123` (all eight builders rerun into that root from this branch at `d64e3e00`; "projection paired with this tree") | 631/631 |
| annotate fast | `node apps/annotate/run_tests.cjs` | 335/335 |
| browser, the suites touched (`--only`, `--repo C:/workspace/tolstack`) | the tree holds still (new) 4/4, three runs in a row; 3D pane follows 31/31; the model drawn alone 22/22; the map 32/32; annotate rail holds still 17/17; topology file:// 106/106; topology http 152/152; no nav click wedges 16/16; a press that writes 2/2; a bound pattern 1/1; first end of a joint 2/2; kinematic study page 22/22; every study opens in 3D 11/11; annotate flyout 37/37; real render path 12/12; deep links file:// 6/6; Groups 11/11; suite file:// and http green | see the next row for the two reds |
| the two reds | **a pattern is bound …** 8/11 and **a suggestion names its face** 3/5 | Both fail the same checks on the `integration` export (`data/scratch/tb`, the same root). They are already filed: `ISSUE_20261122_two_annotate_browser_suites_assume_live_features_are_still_unbound.md` |
| witnesses | `node scripts/run_mutation_witness_tests.mjs --only …`. Three runs, because the first ran against the main checkout's `master`-built projections, so every fast entry was red before its mutation. Runs 2 and 3 used the scratch root (run 3 for the one entry run 2's budget left and one suite run 2 met red on its pane-seek check) | Every spec added or changed is **WITNESSED**: fast 15/15 entries (c240fe74 #3 by hand after the fixture gained a feature that ends two interfaces); browser 12/12 (27d459dc, 51ce40b7, 222294df, bcd453e9, ee555635, 7856c71b, 93a84446, 835a52f7, 86fafce7 ×2, 9de82bf4 ×2) |

Not run: the whole browser tier and the `--changed-since` gate, which are
the review's.

## Decisions the handoff left to me

- **A selection opens no body.** I read "opens the path to the selected row
  and nothing else" literally. The body is one twisty away. The one
  exception, after a Take, is described above.
- **Across bodies, not "Parts".** With bodies present, an assembly in no body
  is listed under "Across bodies". Under it go only those of its parts that
  are in no body either. Nothing is repeated as a reference.
- **The interface row keeps its kind word** ("contact", "pin in bore")
  before its "n of 2". Jeff's 11-17 rotary check reads that word in the tree.
- **The grouping is the page's state, like the filter**, and is not stored.
  The question of By part against By joint as the default goes to the
  chain's walk (link 4), as the handoff says.

## Filed

- `ISSUE_20261123_a_tree_rebuild_between_a_press_and_its_release_drops_the_click.md`
  (bug, med).
- `ISSUE_20261123_the_mount_end_outer_race_od_holds_the_inner_race_bores_four_faces.md`
  (`needs: jeff`).
- Addendum on `ISSUE_20261120_an_assembly_in_no_body_is_listed_twice_in_the_nav_and_posed_by_nothing_in_3d.md`:
  the nav half is done, the 3D half is still open.

`data/scratch/tree1123`, `tree1123*.log`, `tb`, `c.sh`, `c2.sh`, `ps.json`
and `nav.bak.js` are this session's scratch, safe to delete.
