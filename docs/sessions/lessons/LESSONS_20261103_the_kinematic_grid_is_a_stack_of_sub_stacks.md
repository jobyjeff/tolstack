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
