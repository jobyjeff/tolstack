# LESSONS 2026-10-26 — the kinematic page keeps the DAG and says each contributor once

Handoff `HANDOFF_20261026_the_kinematic_page_keeps_the_dag_and_says_each_contributor_once.md`.
The kinematic study page now draws its topology's model between its verdicts
and its chart, with the study's lit set on and the rest dimmed or hidden; says
each contributor once, with a column group per stop; draws a coefficient's
curve across the sweep on hover; selects a clicked contributor in place; and
says what would resolve a gap row. What the diff does not say is below.

## The layout decision, and what it cost at 1600 and 1920

- **Head, model, body.** `views/kinematic.js` renders two blocks:
  `VA.renderKinematicHead` (name and verdicts) into a new `#kinematichead`
  above the toolbar, and `VA.renderKinematic` (driver line, chart, table,
  provenance) into `#kinematicview` below the DAG. The DAG is the same
  `#topopane` a chain study uses, with `ctx.lit` in place of a chain.
- **The DAG is a bounded box** on this page (`.tv__scroll--bounded`,
  `max-height: 50vh`, its own vertical scroll). It is set through
  `ctx.bounded`, not by toggling the class from the app: `renderTopoPane`
  writes `root.className` on every paint, so a class added from outside is
  gone on the next one (my first try; the box was 2.8k px tall).
  `paneBudget` reads the cap back so a scaled length mode fits the box.
- **The box opens on the grid of lit rows**, not on the walk's first row: the
  grid is centred against the whole walk, so on the 106-row model it starts
  ~1300 px down. `ctx.scrollToGrid` is set on arrival (a serialisation change)
  and by `rewind()` (the Unused toggle). **Every other repaint keeps the box's
  vertical scroll**: emptying the pane clamps `scrollTop` to 0, so
  `renderTopoPane` reads it before `VA.clear` and writes it back — without that,
  a row click threw the reader to the top of the walk.
- Measured on real data, deep link, no 3D pane:

  | | 1600×1000 | 1920×1080 |
  | --- | --- | --- |
  | verdicts' bottom | 277 px | 277 px |
  | model box | 335–835 | 335–875 |
  | chart's top | 877 (on the first screen) | 917 |
  | contributor table width / room beside the preview pane | 785 / ~700: confidence and 3D are a sideways scroll, names pinned | 1022, fits |
  | hidden walk | 23 rows on 8 columns, 598 px — fits the box with a short scroll | same |

  The first table was 1114 px wide at 1600 and wrapped every name a word per
  line. What bought the room: the Zone column folded into the name cell (a
  muted word after the name, its meaning on hover), column labels allowed to
  wrap, the stop summaries allowed to wrap, and the name column `position:
  sticky; left: 0` so a sideways scroll never loses the row.
- **With the 3D pane open at 1600** the page column is ~180 px (the flyout
  clamp keeps the rails' width; the preview pane keeps its own). The page is
  usable for clicking rows but the table is a sideways scroll from its second
  column. Chain pages have the same squeeze; filed, see below.

## The handoff's premise about the right-hand rail

The handoff says the chain-study page "respines so the selected chain is the
rightmost rail" via `VA.spineRight`. It does not: `spineRight` mirrors the
whole walk once (mainline rightmost) whatever is selected, and a study changes
emphasis, the grid's rows and the leaders (`viewer_respine_whole_walk`). "The
part being included aligned on the right side" is the GRID — the lit edges'
rows, at the right of the rails, leaders running to them. That is what the
kinematic page does now, exactly as a chain study does. With the unlit part
hidden the lit rows ARE the walk, and the mainline column stays the right-hand
rail whenever any of it is lit.

## Hiding the unlit model: re-derive, don't slice

`VA.walkRailsAndLinks(rows)` re-derives a walk's rails and links from its rows
alone (an edge runs down its column from the node it entered at — a `branch`
link when that node is on another column — and on to the node it leaves at,
or `close`s back up to it; touching runs on one column merge). On all five
committed topologies it reproduces the projection's `rails` and `links`
**exactly**, pinned in the fast and `[real]` tiers. That is what made
`VA.hideUnlit` small: filter the rows, renumber, compact the columns (order
kept), re-derive. Slicing the projection's rails was the alternative and does
not work — a fork rail starts on another column's row, and a rail spanning a
hidden edge would draw a line where nothing is.

## The by-point projection

`contributors[].by_point[]` (index, sign, coefficient, magnitude at every
point, unrounded) is 46.3 kB of the live projection's 95.2 kB, compact
(6 contributors × 80 points); the pretty-printed file on disk is 159 kB. The
page computes nothing from it but `sign × coefficient` to place a point above
or below the curve's axis. The tangential-link mount height's sign flips
between points 44 and 45 (actuator 30.505 → 29.613 mm); pinned value-level in
`tests/test_kinematic.py::test_real_the_projection_carries_every_coefficient_across_p2`.

The curve opens as a hover card of kind `curve` in the page's one popover.
My first version positioned it inside the cell; the table's
`overflow-x: auto` box clips in both directions, so the bottom of the chart
was cut. A `position: fixed` card has no such ancestor.

## Things that were not what they looked like

- **Every valueless edge is `value_source: "derived"`** in the projection
  (`build_topology_projection.py::value_source`), not only the "quantity a
  study computes" gaps. My first `VA.needsAnnotation(confidence, edge)`
  excluded `derived` and so switched the annotator link off for exactly the
  edges it was for. It reads `!edge.dimension && kind !== "gap"` now. The
  detail pane still calls those edges "DERIVED — the quantity a study
  computes" (that label is the 2026-09-30 issue's; addendum appended).
- **Three of the six contributors have no value of their own**
  (`pitch_plate_attach_height`, `pitch_arm_radius`, `tan_link_mount_height`):
  their band is another edge's (`band_source.kind == "dimension_ref"`). A row
  click on one showed "no value". The preview pane now names the band edge on
  a kinematic page ("band in this study: …", `VA.kinematicBandEdges`), one
  click from the citation and crop. The lit set includes those three band
  edges, hence 9 lit edges for 6 contributors.
- **There are no live gap rows** since `the_tangential_link_cites_its_drawing`.
  Deliverable 4 (the gap card) is exercised on the fixture only; the live
  builder output carries `gap_rows: []`.
- **The live 3D pane suite had been skipping itself since that same handoff**:
  it required a gap row and, finding none, pushed its "(skipped: the
  projections are not built …)" line as a pass. Every real check in it —
  sweep mode, bind mode, reload, hover — had not run on any tree since. It
  now hovers any contributor but the bound one, and runs (14/14).
- **`onNavStudy` switched topology only when the id differed.** The kinematic
  page now holds its topology id, so a chain-study click from it stayed in
  kinematic mode. Caught by that newly-running pane suite. The guard is
  `state.mode !== "topology" || id differs`.
- `selectKinematic` repeating `selectTopology`'s three reset lines verbatim
  made three existing mutation anchors ambiguous (they match "exactly one"
  place); reordering the copy fixed it without touching their specs.

## What the rail handoff needs to mirror

`the_rail_and_the_scene_point_at_each_other` owns `apps/annotate/`, whose
sweep rail lists the same contributors under "contributors at the −7° stop"
(nearest-stop group; the handoff kept it). If it wants to say each contributor
once too, the projection's `contributors[].by_point[]` is the per-frame field:
the rail can read the coefficient at the frame it is on instead of the
nearest stop's table. The page posts `highlight <topology> <edge>` for a
selected edge whenever the pointer rests on nothing, so a selection made on
the page stays tinted in the scene. `VA.kinematicLitSet` is the set the rail
would light if it ever dims the rest.

## Guards and witnesses

25 specs added (fast 17, browser 8; the renamed gap-row guard's spec also
carries the retired one's console-not-banner mutation), 8 retired with
`git rm` (renamed or retired guards), 8 re-anchored onto the code their
mutation now means. Census pins: fast 551 -> 564, browser 605 -> 609, every new
guard enrolled. Two traps worth knowing:

- One mutation would not have bitten as first written: for the pane-click
  guard, a kinematic page that asks for NO params posts nothing, so the scene
  stays swept and the check passes. It mutates the real failure shape
  instead: a selected edge becoming a `goto`.
- `test_no_viewer_vocabulary_is_spelled_as_a_comparison_chain` caught
  `state.mode === "topology" || state.mode === "kinematic"` -- the
  witness run reported it as "tier red before the mutation", which is how I
  found it. Run the python tier before the witnesses.

The four new pytest tests have no specs; the python tier enrolls by spec and
its census did not move.

## Filed / found elsewhere

- `ISSUE_20261026_with_the_3d_pane_open_at_1600_the_page_column_is_too_narrow_to_read.md` (audience strategy).
- Addendum on `ISSUE_20260930_a_valueless_structural_edge_is_invisible_to_the_gap_list.md`.
- Already filed on integration: `ISSUE_20261026_the_rail_gap_badge_browser_checks_read_gap_rows_integration_no_longer_has.md`
  (the only red suite in the browser tier, `annotate rail and scene` 20/22).

## Verification, as recorded

Projections built from the committed tree (`a95571c6`) into
`C:/workspace/tolstack/data/scratch/kmdag/root` (data/inbox, data/meshes,
venv-win and node_modules junctioned to the main checkout for the runs, docs to
this worktree; the worktree's own node_modules junctioned likewise). Every
junction is removed again, so the scratch root holds only the built
projections; re-junction those five to re-arm it. The shared
`data/projections/` was not touched. Delete the scratch root after review.

- `node apps/viewer/run_tests.cjs --repo <scratch root>`: 563/563, plus the
  documented per-document qualifier SKIP.
- `node apps/annotate/run_tests.cjs --repo <scratch root>`: 225/225.
- `node scripts/run_viewer_browser_tests.mjs --repo <scratch root>`: 30/31
  suites, 272 s; the red one is `annotate rail and scene` (20/22), the
  already-filed gap-badge issue above. The kinematic page suite 14/14, the 3D
  pane suite 14/14 (running on live data again).
- Mutation witnesses, `--only` for each of the 33 specs this branch added or
  changed: 33/33 witnessed.
- `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -p no:cacheprovider -rs`
  (worktree): 1566 passed, 1 failed, 1 skipped, 360 s. The failure is the
  documented worktree red (`test_viewer_js_suite`, no projection in a
  worktree -- its tier ran above with `--repo`); the skip is
  `test_fit_bound_features.py:424`. Suite times recorded, inside budget.
- Not run: `scripts/rebuild_projections.ps1` (refuses from a worktree by design).
