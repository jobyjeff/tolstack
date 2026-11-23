# LESSONS 2026-11-22 — the_lug_stacks_line_up_and_each_link_is_a_row_on_the_map

Tactical session, run 2026-11-23. v2's map re-arranged: each link five boxes
in one line, each lug stack a column, no crossing; the page counts crossings;
a link's length drawn as a dimension; boxes wear their body's colour from the
first paint. Shots: `docs/sessions/lessons/shots/the_lug_stacks_line_up_and_each_link_is_a_row_on_the_map/`.

## Before and after

Both scored by `tests/debug_map_arrangement.mjs` on v2 built from this branch
(scratch root `data/scratch/lug1123`). "Before" is trunk's layout with trunk's
`map.js` plus only the new crossing rule, so the crossing count is comparable.

| | before (11-21 layout) | after |
|---|---:|---:|
| routes | 50 | 50 |
| crossings | 1 (hub ↔ mount fastener clocking × hub face) | 0 |
| routes with a diagonal leg | 10 | 3 |
| notes | 1 (the crossing) | 0 |
| bounds (world units) | 3034 × 3394 | 3034 × 3394 |
| bounds (cells) | 7.22 × 9.98 | 7.22 × 9.98 |
| closest parallel legs, plate district | 31 | 44 (the map's pin pitch) |

The three diagonals left: the slide (gas-spring mount to piston body, as
before), and each lug's one second-load-path route (the tangential inner
race's clamp seat, the pitch bolt to its straight bushing).

## What the one crossing was

Not the arrangement: an engine defect. A bundle that detours round a part
between (the hub ↔ mount 3-bundle, round the mount-end inner race in the base
column) leaves both parts from one flank, its earlier constraints on the outer
lanes -- and both ends ordered their pins the same way, so the lanes must cross
at the far end. The far end now takes the order reversed (`detourOrder`), and
trunk's own layout scores zero crossings with it. Any future layout with a
column/row detour bundle would have hit it.

## Engine changes (apps/viewer/map.js), each forced by a measured case

- `VA.mapRouteNotes`: a note per pair of routes that **cross**, or where one
  **turns on** the other (a corner on its run), and per **symbol on another's
  route**. All three feed the pin-side repair as defects. The touch rule came
  from the "TB" candidate: a straight bushing's stub ended exactly on the lane
  past it -- zero crossings by the strict test, a junction to the eye.
- Pins tied on the partner's cell along a side: the nearer partner at the end
  toward them (`nearerOutside`). The fast-tier fixture "two interfaces of one
  feature toward one side" pinned a real crossing under id order; the test was
  right, the order was wrong.
- A detour takes the flank with fewer parts beside the span (tie: the old
  nearer-edge rule), and its lane follows its pins' side (so a repair that
  turns the pins also turns the lane).
- A side's pins are centred on a partner straight across (same row for a
  flank, same column for top/bottom), the box growing to hold the rest. This
  took the diagonals from 10 to 3: a line of parts with a second pin on one
  side used to jog a half pitch at every joint.
- An assembly's own dimension (a link's length) is drawn as a dimension:
  hairline extension lines, a dimension line, open arrowheads (one path, so it
  keeps `fill: none`). Geometry unchanged, still inside the outline (the fast
  tier pins that).
- `views/map.js` `register()` writes the base class: the box tint issue, and
  -- same defect, unreported -- connectors' between-bodies and bundled weight
  appeared only after a hover too.

v1's computed map now carries 138 notes (crossings counted); it was never
held at zero and its layout still finishes inside the browser suite.

## The arrangements tried, and why the final one

1. **Strict search** (every lug race–bolt–bushing–plate straight, both links
   straight, piston column straight, base reached by straight clear hops),
   scripted: **zero** arrangements at 7 × 10, 8 × 10, 8 × 9. At 70 cells the
   only shapes with the lugs and links straight are an "arch" -- lug row through
   the plate, links as pillars -- with the end stop routed through the plate.
   Why (filed, `audience: strategy`:
   `ISSUE_20261122_a_lug_stack_cannot_be_one_straight_line_while_each_body_is_one_rectangle.md`):
   the plate's inner races are in the plate's district, a rectangle, so each
   link leaves it from a corner; the gas-spring mount must meet the piston,
   which pins that rectangle to the base's side, while the tangential link's
   far race is in the base's rectangle; and the plate has four sides for five
   parts. This is the handoff's "say which rule": **bodies' rectangles do not
   overlap**.
2. **One bend allowed at the flanged bushing**: none at 7 × 10 with the base's
   routes straight; 120 at 8 × 10 (both lugs bent, a large empty middle); 288
   at 9 × 9 (landscape).
3. **Soft constraints, engine-scored** (12 860 candidates at 7 × 10, top 300
   scored): best 11 notes -- the arch family again.
4. **By hand**, from the shape the searches pointed at (tangential link a
   row from the base, each lug a column under the plate's row, pitch line down
   the seventh column): nine-row versions (two-row piston top, 10 % smaller)
   always kept one crossing -- the feather stop's diagonal over the end-stop
   line, because the mount meets both the lower head and the piston body from
   one row. The ten-row version with the tangential straight bushing under
   the plate ("TA") reached zero notes once the engine changes above went in;
   its mirror ("TB") kept two touches. TA shipped.

The search scripts were scratch; the scorer stays:
`node tests/debug_map_arrangement.mjs [--layout <map_*.json>] [--topologies <built topologies.json>] [--json]`.
Score against a projection built from the tree you are on: the main
checkout's was built from master and lacked this branch's model edges.

## Jeff's sentences, against the page

1. "2d graph view looks pretty good... couldn't see any errors in the
   topology" -- nothing to do; the topology is untouched (ids, nodes, edges).
2. "another small pass at re-arranging/redrawing the boundaries" -- met: new
   arrangement, same bounds.
3. "the area around the pitch plate and link attachments is a little cramped"
   -- partly: the plate district's routes are a pin pitch apart (were 31 apart)
   and the two lugs read as two columns either side of the plate; the region
   has the same number of cells.
4. "The radial stack ... would be more intuitive if those elements were lined
   up" -- partly: inner race, bolt and flanged bushing are one column; the
   plate sits beside the flanged bushing (one corner), the straight bushing
   beside the bolt. Fully straight needs a district that is not one rectangle
   (the strategy issue above).
5. "the tangential link ... lined up in a row ... forces the entire map to have
   a lot of empty space in the middle" -- the link is met: five boxes in one row,
   its length a dimension along it. The empty space is only partly met: the Z
   is gone, but the ring the links make (mount → link → plate → pitch link →
   blade → hub) still encloses an empty block of about 5 × 3 cells under the
   tangential row; nothing can move into it while each body is one rectangle.
6. "Minimizing line crossings" -- met: zero, and the page counts them.

## What still looks untidy (my eyes, on the shots)

- The pitch link's straight bushing box is tall: centring its clamp-seat pin
  on the inner race beside it pushes its two other pins up, and the box grows.
- The pitch bolt → straight bushing diagonal crosses the "213862-002 pitch
  link" outline's name, its symbol on the text (already filed:
  `ISSUE_20261120_an_outlines_name_crossed_by_a_route_raises_no_map_note.md`).
- The base column is long: gas-spring mount → mount runs four empty cells
  (a detour round the mount-end inner race, on the far left), mount → hub
  three.
- The extension lines of a link's dimension are faint at 3840 fit (hairline at
  0.28); the arrowheads carry it.
- With v2's end-stop study selected the map lights no route (the map does not
  draw a study yet: `ISSUE_20261116_what_the_map_does_not_draw_yet`); the
  end-stop routes themselves are unchanged and still run straight across the top.

Filed besides: `ISSUE_20261122_two_joints_detouring_past_one_part_share_a_lane.md`
(the engine gap that ruled out putting a straight bushing in its lug's column).

## Gotchas

- **The scratch root must be built while the tree is clean.** Every builder
  stamps `dirty: true` if any tracked file is modified at that moment, and the
  fast tier then refuses the projection. Writing a tracked file during a
  10-minute build cost two rebuilds. Commit, then build, then edit.
- The node-fs tier reads worksheets under `<root>/docs/`: copy the tree's
  `docs/` into the scratch root or five `[real]` worksheet checks fail.
- `run_viewer_browser_tests.mjs` honours one `--only`; the witness runner
  repeats it. The witness runner's `--repo` must be the scratch root too, or
  the shadow's fast tier is "red before the mutation" on the stale main
  projection.
- The browser runner needs `node_modules` in the worktree: a junction to the
  main checkout's (gitignored, goes with the worktree).

## Witness anchors this branch moved

Four specs pointed at map code this branch rewrote, re-pointed with the same
meaning: the detour flank's two (`detourFlank` now one line for both), the pin
order's loop (now `a.order.length`), and the jumper's register line (now with
the dimension class). The pin-order spec then stopped biting -- the new
nearer-partner key separates its fixture's two pins before the interface id is
reached -- so its guard also shuffles two joints to one partner, whose pins
tie on all but the id. All re-witnessed.

## Test record

Scratch root `data/scratch/lug1123`, built from this branch with every builder
and `--data-root` (copied from `walk1119`, the tree's `docs/` copied in).

- `venv-win/Scripts/python.exe -m pytest -q -p no:cacheprovider`, in the
  worktree, at `07ed8459`: 2 failed, 2618 passed, 3 skipped, 4 deselected,
  520 s (recorded, inside budget). The failures:
  `test_viewer_js_suite_is_green` (the deliberate worktree red: no projection
  here) and `test_every_anchor_resolves_to_exactly_one_place` (the four
  anchors above). After the re-point: `tests/test_mutation_witnesses.py` and
  `tests/test_topology_map.py`, 68 passed.
- `node apps/viewer/run_tests.cjs --repo <scratch root>`: 630/630, the
  `[real]` tier armed and paired.
- `node apps/annotate/run_tests.cjs`: 335/335.
- `node scripts/run_viewer_browser_tests.mjs --repo <scratch root> --only "the map (the counts"`:
  32/32 sub-checks, v2 drawn at the model's counts, "notes none".
  `--only "the Groups switches"`: 11 checks passed. No browser suite was
  added or changed; these two were run because the map changed.
- `node scripts/run_mutation_witness_tests.mjs --repo <scratch root>` with an
  `--only` for each spec added or re-pointed: the two new specs 4/4
  witnessed; the four re-pointed 4/4 witnessed (the pin-order one after its
  guard was extended).
- The walk, `node tests/debug_lug_stacks_20261122.mjs --root <scratch root>`:
  v2 notes `[]`; the plate's box `map__box tv__fill--t2` and stroke orange
  before any hover, at both widths; a ball joint's connector
  `map__connector--between` on first paint; each link's length lights
  `map__jumper--lead` on hover; each Groups switch off in turn set and read
  back in-page. The page logged one 404 per load (a probe of a path the
  scratch server does not mount).

Not run, the review's: the whole browser tier and the witness gate.
