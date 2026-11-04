# LESSONS 2026-11-03 — the_kinematic_grid_is_a_stack_of_sub_stacks

## What landed

The kinematic page's **grid beside the DAG is now the study's stack**, drawn
by the same row builder and column set a chain study's grid uses. The
results pane's own contributor table (`kmtable`) is retired, so there is one
table on the page instead of two.

- **The model:** `VA.kinematicStack(study, topoProj, stopId, decimals,
  choices)` in `views/kinematic.js`. It returns one entry per row:
  - a `sub` header: "Linkage at this pose", "Stop position", and one nested
    header per sub-study at that stop;
  - a `term` row: the edge, its signed sensitivity, its ±contribution, its
    band's confidence and its curve;
  - the stop's fold and verdict, as the `result` the foot prints.

  `VA.visibleStackEntries` applies the folds. `VA.stackOpenMap` is the one
  open state that the DAG's dashed fields and the grid's headers both read.
- **The plan:** `VA.gridPlan` accepts `focus.stack`. Header rows are plan
  rows, so their seams count for the leaders. A folded term has no row, and
  its interfaces' leaders bind to the next row the grid keeps. A lit edge
  that is no term of this stop (a band's own edge, a joint, the other stop's
  chain) has no row.
- **The marks:** `VA.gridRowMarks` gives each row its body tint
  (`tvrow--body-t<n>`, the DAG container's index) and the divider above it
  (hairline, heavier between bodies, heavier at a sub-stack). The tokens are
  in `topology.css` `:root` (`--tv-body-*`, `--tv-divide-*`,
  `--tv-stack-rule*`), and the DAG's `.tv__bodyfield--t*` now reads the same
  tokens. `docs/DESIGN_TYPE_AND_COLOUR.md` gained one paragraph and its
  table row.
- **The stop picker:** "Grid at [−7 deg stop] [+72 deg stop]" in the results
  pane. It sets `state.kinematicStop`.
- **Folds are remembered per study** (`VA.readSubStackFolds` /
  `VA.writeSubStackFolds`, localStorage key `tolstack.viewer.subStackFolds`).
  By default the stack's own level (depth 0) is open, and a nested sub-stack
  with more than `VA.STACK_OPEN_MAX` (3) terms is folded.
- **SENSITIVITY** is a column of `VA.TOPO_COLUMNS`, placed before
  CONTRIBUTION. A chain row shows its signed ratio there, and a kinematic
  term shows its coefficient at the chosen stop. Hovering a term's
  sensitivity opens its curve card. A direct contributor with no band on file
  keeps its gap chip and gap card. `VA.CONFIDENCE_WORDS` (keyed by the
  generated `CONFIDENCES`) is the sourcing legend's words and every
  confidence chip's hover.

## The ordering rule (one paragraph)

`VA.kinematicStackOrder` is the one sort key. The linkage terms come first,
then each stop-position sub-study in `study_refs[]` order, each in its own
authored chain order. The linkage is a depth-first walk over its edges (the
contributors, the edges they borrow bands from, and the lit joints between
them). The walk starts at the node it shares with a stop-position chain (the
tan link mount's hub face) and is **read backwards**, so the stack runs from
the blade end (arm → pitch link → plate → tan link → mount) into the stop
chains that start at that same node. At a branch the shorter side is walked
first. The same order is handed to the DAG: `lit.order` →
`VA.bandSides` → `VA.orderBand`. The lit band is therefore drawn in stack
order, and the leaders keep the monotone premise `VA.leaderGeometry` rests on.
Mock-up C showed mount → arm. I read the linkage the other way so the
adjacency continues into the stop chains without a jump. Live, at −7:
`pitch_arm_radius, pitch_link_length, pitch_plate_attach_height,
pitch_plate_tan_link_attach_radius, tan_link_length, tan_link_mount_height`,
then the feather chain, the travel and the gap. This is pinned value by value
in the `[real]` fast tier and in the browser tier.

Band-only crossings: 7 under the walk order, **4** under the stack order. In
the whole dimmed walk around the band they rise from 168 to 188, because the
band sits differently among the unlit rows.

## Row tint: before and now

- **Before:** `edgeRow` gave every row `tvrow--band-a/b`, the jog-zone band's
  parity (`VA.rowBandParity`). That is two near-black greys alternating by
  leader band. Rows with `conf--untraced` and `conf--no_source_ref` also got
  a red or magenta background IMAGE (`.tvrow--edge.conf--untraced`). That is
  Jeff's "black, nearly black grey, and two nearly-black shades of red".
  Neither tint corresponded to a part or a body.
- **Now:** the row's background colour is its rigid body's tint
  (`VA.gridRowMarks` → `.tvrow--body-t*`), the same token as the DAG's body
  container. The untraced wash is kept as an image layered over it, as the
  handoff said ("the row tint stays"), and the legend under the grid names
  both. The jog-zone band polygons keep their parity; only the rows changed.
  Mock-up B/C dropped the red wash altogether ("a tint never means
  confidence"). If Jeff wants that, it is a one-rule deletion in
  `topology.css`.
- A kinematic term's chip and row class now use **its band's confidence**
  (the projection's per-row `confidence`), not the swept edge's own
  `null` / "no value". Before this change a borrowed-band contributor said
  "no value" on the grid, and the retired table said "UNTRACED".

## Deliverable 6: how far it got

All of it. There is one row builder (`edgeRow` / `subStackRow` in
`views/topology.js`) and one column set (`VA.TOPO_COLUMNS`) for both kinds of
study. The kinematic table, its DOM builders, its CSS and its edge handler
are deleted. `VA.kinematicTable` (the per-edge, per-stop model) stays,
because the Preview's "In this study" block reads it
(`element_record.js`). Nothing measured is left over. What I dropped:

- the per-row **3D** button (the Preview's attach does the same);
- the per-stop column groups, which show both stops at once. The grid shows
  one stop at a time, with a picker.

## Brief question 6 (moving rows through a respine): sizing

The rows are now in band order, and the band is the stack's order, so a row
has a well-defined position in both the outgoing and the incoming frame. To
move rows instead of cross-fading them, you would:

1. give each `<tr>` a key-stable `transform: translateY` tween, from the old
   `gridRow × rowHeight` (plus the old block offset) to the new one;
2. fade the rows that only one frame has;
3. tween the header rows as rows.

The tween state already exists (`ctx.tween.e`, `VA.lastTopoRender`). Size:
about one session, plus a browser check per density. The risk is the leader
seams mid-tween: they would read row positions that the transform has moved.

## Decisions not in the handoff

- **Units in words:** the header reads `±0.82 mm → ±1.417 deg at the −7 deg
  stop`, not `°`. The rest of the page says "deg" (the datum line, the stop
  words), and one surface with two spellings of the unit is the
  inconsistency the house rules ban.
- **The feather sub-stack's header prints its chain's own total**
  (nominal −31.81). The 11-03 lesson notes that this study's nominal is not
  a coordinate, because two pitch-system-era edges are authored about 0. It
  is printed because it is the chain study's honest output and its own page
  shows it. The `±0.375 mm` band is the number that enters the stack.
- **The reach sort** was not built, because it would cross every leader.
  It is filed as `docs/issues/ISSUE_20261104_the_kinematic_stack_has_no_by_reach_sort.md`
  (audience strategy, with three options).
- **Mock-up C's "traced · 4" summary chip** on a folded header was not
  built.

## Gotchas

- In a Python splice that cuts "from a test's start to the next
  `await test(`", the cut also takes the shared `var` declarations between
  tests (`HIDDEN_ROWS`, `LIVE_JOINTS`). Restore them from `git show HEAD:`.
  A substring search for `'          });\n'` also matches a deeper-indented
  `});`.
- A test declared before a later `var FEATHER_STUDY = …` line sees
  `undefined`, because the suite runs top to bottom inside one async
  function. Use the literal.
- The fast shim's `all(root, sel)` takes one `tag.class`, not a descendant
  selector.
- Running the base commit's viewer code against the same scratch projection
  is the quick way to tell a pre-existing `[real]` red from your own. Check
  out `apps/viewer` from the base, run, and `git checkout HEAD -- apps/viewer`
  (everything committed first). `git archive` into a folder under the main
  checkout does not work: git resolves the main checkout's tree.
- There is no `pytest-xdist` in `venv-win`, so `-n 16` is refused. The suite
  runs single-process.
- A bash heredoc holding Python with `'''` and `\"` broke the shell parser
  (`unexpected EOF`). Write the script with the Write tool instead.

## Found on arrival

Nothing: the worktree was clean. The main checkout was on master at
`1f2fce5d`, with projections built 2026-11-02 (older than master's
`each_stop_is_its_own_stack`). I did not rebuild them. Everything here ran
against a scratch root `C:\workspace\tolstack\data\scratch\kin_grid\root`.
Its `inbox/` and `meshes/` are read-only junctions to the main checkout's,
its `docs/` is a junction to this worktree's, and the four projection
families plus crops were rebuilt there from this branch. The worktree's
`node_modules` is a junction to the main checkout's (gitignored). The
scratch root is removed at hand-back.

## Pre-existing reds (not this branch's)

On the base commit `dde0ecd6`, with freshly built projections, six `[real]`
fast-tier checks fail. These are the pitch_system grouping, bands and forks
counts, README's spine numbers, `pitch_plate_pilot_in_piston_id`'s part,
and the topology fixture drift. They are already filed as
`ISSUE_20261103_the_slide_re_author_left_six_viewer_real_checks_red_on_integration.md`.
One of them is the pitch_system row-tint check, which I re-pointed at the
body rule. Its own assertions run only after the band pins that are red
upstream, so it carries no spec yet (`guard_enumeration.mjs` says so).

## Two late fixes the browser tier found

- **Width.** At first SENSITIVITY was +90px. That widened the grid, and a
  sticky rails SVG then covered row centres: "SVG intercepts pointer events"
  in three suites, and the jog-zone and respine width pins moved. Its 70px
  now comes out of component (150→120), element (220→210) and contribution
  (200→170), so the table is as wide as it was.
- **The legend widened the pane.** A wrapping flex strip in the pane's
  shrink-to-fit box lays out at its one-line width. Its width is now pinned
  to the table's. Before that, the respine's scroll clamp check went red,
  with pane content 1896 → 2106 px instead of → 1554.
- Grid-row pointer actions in the browser tier go through `clearPoint`, not
  `locator.hover()`/`.click()`. The seam trace reads `pitch_link_length` and
  `tan_link_length`. Jeff's two 10-29 rows have no grid row any more (a
  band's own edge, and a folded travel term).

## Screenshots

`shots_20261103_the_kinematic_grid_is_a_stack_of_sub_stacks/`, at
1600×1000 full page, against the scratch build:

- `1_folded`: −7 stop, travel folded;
- `2_travel_open`;
- `3_plus72`: the picker at +72, no travel;
- `6_chain_study`: `pitch_link_cotter_hole_clearance`, the same row builder.

`4_`/`5_` are viewport crops of the grid taken before the width and
band-confidence fixes. Their rows read the same, but the columns are 20px
off the final ones.

## Verification record

Run from this worktree on the committed tree, against the scratch root
`C:\workspace\tolstack\data\scratch\kin_grid\root`. Topology, viewer, part
names, contact suggestions, crops (drawing-checker's venv) and kinematic
projections were rebuilt there from this branch BEFORE the tiers.

- **pytest:** `C:/workspace/tolstack/venv-win/Scripts/python.exe -X utf8 -m pytest -q -p no:cacheprovider -rs`
  (single process; this venv has no xdist), worktree, **1722 passed, 2
  failed, 1 skipped, 2 deselected, 383 s**. Recorded with `suite-time
  record`, inside budget.
  - `test_viewer_js_suite_is_green` is the deliberate worktree red (no
    `data/`).
  - `test_real_the_live_projection_has_the_schema_and_a_row_per_gap_edge`
    reads the main checkout's stale contact-suggestions projection
    (`ISSUE_20261103_the_contact_suggestions_real_test_pairs_this_tree_with_a_projection_built_from_another.md`).
    This branch changes no Python.
  - The skip is the pitch-link bearing re-extraction not installed.
- **Fast tier:** `node apps/viewer/run_tests.cjs --repo <scratch>`:
  **623/629**, `[real]` tier included, projection paired with this tree. The
  6 reds are the same 6 that fail on the base commit `dde0ecd6` against the
  same projection (`ISSUE_20261103_the_slide_re_author_left_six_viewer_real_checks_red_on_integration.md`).
  Without `--repo`: 512/512, node-fs tier skipped.
- **Browser tier:** `node scripts/run_viewer_browser_tests.mjs --repo <scratch>`.
  The full run gave 32/40 suites, 25 min, and it predates the width and
  legend fixes. After the fixes I reran the six red suites on HEAD and on the
  base commit (base `apps/viewer` + runner checked out, then restored):
  - **kinematic study page:** 24/24 PASS. This is the suite this handoff
    rewrote.
  - **respine:** 44/44 PASS.
  - **topology file://:** 201/205. The same 4 fail on base: pitch_system's
    62-band pin, both leader styles, and the 61-leader zone. The re-pointed
    body-tint assertion reported no `bad` rows.
  - **DAG zoom:** 34/35. The same one fails on base.
  - **3D pane follows:** 28/32. The same 4 nav-body checks fail on base.
  - **leaders across the seam:** 20/22. The same two trace checks fail on
    base (no scene anchor).
  - **real render path** and **crop lightbox:** both ABORT on base with the
    same click timeout.

  Nothing red on HEAD is green on base.
- **Mutation witnesses:** `node scripts/run_mutation_witness_tests.mjs --repo <scratch> --changed-since integration`:
  **20/68 witnessed, 68/69 reached, 1 left to the sweep (budget), 30m09s.**
  - The 29 fast entries are all "red before the mutation", because of the 6
    pre-existing fast reds. So I witnessed this branch's 9 fast specs by hand
    instead: apply each mutation, run the fast tier, look for `FAIL <its
    guard>`. **12/12 mutations witnessed**, after the travel spec was
    re-pointed at the nested depth. Its first mutation reversed a sort the
    grid does not read, because the grid walks the band's order.
  - The new browser specs were witnessed in the gate's run: the live stack,
    the travel fold, the curve, the +72 stop, the clicked row, and the page
    shape.
  - `toggling Unused` stayed green under its first mutation. Re-pointed
    at the stop picker and re-run with `--only`: **WITNESSED**.
  - `the nav's kinematic row brings the page back` (a pre-existing spec)
    reddens the page-shape check instead of its own, also with `--only`.
    Filed as `docs/issues/ISSUE_20261104_the_nav_kinematic_row_witness_reddens_the_page_shape_check_not_its_own.md`.
- `node apps/annotate/run_tests.cjs`: not run. This branch does not touch
  `apps/annotate/`.

The scratch root and its junctions are removed at hand-back.

## Review rework (2026-11-04)

The review (`docs/sessions/reviews/REVIEW_20261104_the_kinematic_grid_is_a_stack_of_sub_stacks.md`,
REQUEST CHANGES, 1 blocker) found that on the merged tree the DAG's sub-stack
labels could not be clicked once the drawing was scrolled sideways.

- **Merged** integration `8d8baf7a` (it had moved past the review's
  `0816cccf`). The one conflict was `guard_enumeration.mjs`'s pins. I kept
  both sides' comments and re-derived the counts with `--json`: fast 633,
  browser 822/789, which is integration's 821/788 plus this branch's +1.
  Cherry-picked the review's inline fixes (`98010a83`: the gap card names its
  row; two stale band-parity comments; a comment indent).
- **Cause, measured** with a probe on the live page at 1400×900. It was two
  defects, and the first one is there at scroll 0 too:
  - Each label ran past the SVG's right edge, at 596–785 against an SVG
    ending at 684. `svg.tv__rails`'s `clip-path` clips there, so half of
    each label was neither drawn nor hit-testable, and the text was cut off
    on screen. The cause is this branch's band reorder: it puts the
    sub-stacks' bars in the right-hand columns, and a label 290 DAG units
    long starting at x = 285 cannot fit in a drawing 420 units wide.
  - The half that was drawn lay under `path.rail__leaderhit`, because the
    labels were drawn in `under`, below the leaders.
- **Fix:**
  - `VA.subStackLabelPlacement` puts a label just right of its bar when an
    estimate says it fits (`HOVER_LABEL_METRICS.charPx`, which runs about
    20% generous at this size). Otherwise it end-anchors the label
    (`text-anchor: end`) at the drawing's right edge, so the real text width
    decides where it starts.
  - The labels are drawn after the marks and under the hover label. A label
    is a visible button, so it takes the click wherever it is drawn. Once
    end-anchored it crosses another column's bar, and an intermediate
    version that drew it under the marks lost its centre to a
    `rail__barhit`.
  - The existing halo keeps it legible over the rails it crosses.
- **New guards:** the rule (fast), the label's layer and bounds on the live
  drawing (fast `[real]`), and a browser check in the DAG zoom suite: every
  label is whole inside the drawing and is the topmost hit at its centre,
  parked or not. The click check's count floor could also be met by a grid
  row, so it was not a direct witness. Each carries a spec.
- **The first-row zoom check is red on integration too.**
  `[real] at scroll 0 the DAG's first row is whole under the pinned bars …`
  aims its wheel at y = 200, but the drawing now starts at 269. Measured with
  integration's own viewer code and runner against the same projection: the
  same red. Filed as `ISSUE_20261104_the_first_row_zoom_check_wheels_above_the_drawing.md`.
