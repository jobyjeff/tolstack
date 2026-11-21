# LESSONS 2026-11-19 — a_map_pin_faces_each_partner_and_no_two_routes_share_a_run

Jeff's note `20261119T142516_ci28ci` (three screenshots of the merged page):
edges that leave one pin and fork, a U-turn at the pitch link's flanged
bushing with its symbol inside the part, runs shared and then diverging. Fixed
in the drawing rules (`apps/viewer/map.js`); v2's `places` and topology are
untouched.

## The rule a pin's side now follows

A feature gets **one pin per interface it ends**, each on the side of its box
that faces *that interface's* partner (a part between in one column or row
sends it to that line's outer flank; a child with no place meets its parent on
the parent's bottom and its own top, and never puts another pin on its top).
Pins along a side are ordered by the partner's position, the constraint's
place in its joint, then the feature and interface ids — so the order of
`edges[]` moves nothing, and the 11-18 workaround of ordering edges to keep a
pin on the left is no longer load-bearing.

## Five features, not four

The handoff named four two-interface features. There are five: the piston
body's `piston_body_head_locating_boss` meets both piston heads (the lower one
above it, the upper one past it up the column's flank). It was the "branch
with no node" between the piston body and the lower head in Jeff's first
screenshot. All five now have two pins (`after_probe_log.txt`: "2 dot(s)" on
each hover).

## What the layout gained, and why each piece was needed

Measured, not guessed — a node harness ran `VA.mapLayout` on the real v2
projection after each change and counted notes.

1. **Per-interface pins** fixed the shared stubs and the plate's back-crossing
   at once. They left one defect: the pitch link's flanged bushing (a child
   under the plate) has a partner up and to the right (its straight bushing at
   [4,1]), and every plain route out of the child crosses the plate or the
   tangential link's flanged bushing at [3,3].
2. **A parent's pin toward its own child sits straight over the child's pin**,
   and a child joined to its parent sits `VA.MAP.child.joined` (64) under it.
   That leaves room for the 40-unit symbol, and it is more than two stubs, so
   the drop never doubles back. This is the U-turn fix. I first also wrote a
   "facing pins closer than two stubs share the gap" rule. Its witness came
   back NOT WITNESSED because at 64 the rule never fires, so I removed it as
   dead code.
3. **`crosses` is now exact** (`segmentHitsRect` on the box inset by 1). The
   old 20-sample test missed a long diagonal clipping a box's corner — it
   reported a route clean that drew through [3,3]'s corner.
4. **A route that crosses a box tries its bend the other way round**, then
   **`viaCorners`**: one or two stops at the cell grid's corners or a symbol's
   width beside one, shortest first, accepted only if it crosses no box, shares
   no run, passes no drawn symbol and keeps a stub's length from every other
   pin. The "beside" offsets matter: a symbol between two neighbours sits
   exactly on the grid line, so a route through a bare corner ran through it.
   The pin clearance came from the after shot: without it the route ran up
   through the plate's right-pin stub and read as a junction.
   I tried tightening that to two stubs, and to half a pin pitch from where
   another pin's route turns. Neither leaves v2 any clean route: the corridor
   between the plate and [3,3] holds the plate-to-bushing route's two stub ends
   and its symbol, and nothing else.
5. **A jumper measures from a feature's nearest pin.** On a child box, whose
   name the layout does not place, a jumper between two different sides runs
   inside the border through the corners. The browser tier's `[real] no jumper
   crosses a part's number or name` caught this: the pitch link flanged
   bushing's wall jumper ran from its bottom pin to its new top pin, straight
   through "flanged bushing, pitch link". The fast tier has no guard for this
   yet; the browser check is what holds it.
6. **A pin-side repair**: where a defect is left, the two pins of the defective
   interface try every pair of sides, kept only if the notes fall.
   It did not end up deciding v2 (step 4 did), but it is cheap and bounded.

**Cost, and the budgets.** v1's computed map (one column per body) was already
dirty — 21 notes on the base, 47 now that the new notes count more — and an
unbounded corner search plus a repair that re-ran it took >2 minutes on it,
which hung the fast tier. Now: the repair's tries route plainly, the corner
search runs once on the settled layout, stops are capped to the 60 least out
of the way, and evaluations to 2000 (`VA.MAP.budget`; v2 needs more than 1000
— with 1000 it stays at one note). v2 lays out in ~100 ms, v1 in ~370 ms in
node. Fixed counts, not timers, so it lays out the same on every machine.

## The notes

`VA.mapRouteNotes(connectors, boxes, M)` is now the one place route notes are
made: routed through a box; **crosses a box it ends on past its stub**; **a
symbol inside a box**; **two routes on one collinear run** (within 2 units,
overlapping by more than a pin radius). v2 has none, and the browser tier's
existing `[real]` check holds them at zero. v1 is not held at zero (it was not
before either).

## Witness specs

Two existing specs anchored on lines this rewrote: the column flank and the
row flank. I re-pointed each at the new `sideFor` line with the same contract.
The stub spec went back to its original line when the half-gap rule went.
There are four new fast guards, each with a spec, and the census pin moved
607 → 611.

The first witness run hit the runner's default 30-minute cap, which left 8 of
12 entries "to the sweep". Pass `--budget-min` to an `--only` run when it has
more than ~5 fast entries; each fast mutation is a full fast tier, 5–10 min.

## What v2 still draws imperfectly (no note fires)

- **The pitch link straight bushing's bolt route takes the long way round**
  (`pitch_link_straight_bushing_bore_to_flanged_bushing_bore`). It runs right
  from the child under the plate, up the gap beside the tangential link's
  flanged bushing, then diagonally to the straight bushing at [4,1], with a
  kink. It crosses two other routes on the way. Clean by every rule, but it is
  the drawing a re-placing of that region (link 5) should shorten. Shot:
  `after_3840_pitch_plate.png`.
- **Lit pin labels** can land on a part's number (the plate's new right-hand
  pin) or on the drop's symbol (the child's top pin). Filed as
  `ISSUE_20261119_a_lit_map_pin_label_can_land_on_a_part_number_or_a_symbol.md`.
  Shots: `after_3840_hover_1_*`, `after_3840_hover_2_*`.
- At 1536 Side by side the map region is narrow and the map is tiny, as it was
  before. The probe's zoom did not take there, so `*_1536_pitch_plate.png`
  shows the whole map; `*_1536_map.png` is the record.

## Shots

`docs/sessions/lessons/shots/a_map_pin_faces_each_partner_and_no_two_routes_share_a_run/`,
from `tests/debug_map_pins_per_partner_20261119.mjs` against the main
checkout's projection (this handoff changes no projection input). `before_*`
are integration at `1a0c6707`; `after_*` this branch's final code. Each set
has the whole map and the pitch plate region at 3840 Side by side and at 1536,
plus each of the five two-interface features hovered at 3840. I read every
shot. Against Jeff's three:
- the U-turn at the pitch link's flanged bushing is gone: a straight drop, with
  the press-fit symbol in the gap (`after_3840_hover_1`);
- the tangential link's flanged bushing has a pin toward each partner, top and
  left (`after_3840_hover_2`, his red question marks);
- the piston body's boss has a top pin and a right pin, and the fork at
  y≈460 in his first shot is gone (`after_3840_hover_3`).

## Test record (this worktree, data from the main checkout)

- `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`: 611/611.
- `node apps/annotate/run_tests.cjs`: 334/334.
- `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack --only "the map (the counts"`: 30/30. v2 drawn
  `{bodies 5, parts 20, features 67, dimensions 49, interfaces 36}`, equal to `model.counts`, notes none.
  Its first run failed `[real] no jumper crosses a part's number or name` (step 5 above).
- Witness, `--only` over the 4 new and 2 re-pointed guards: 9/9 WITNESSED over two runs. The second run's
  shadow was built before the jumper commit, which touches no anchor.
- `pytest -q` (default tier): 2374 passed, 2 failed, 1 skipped, 508 s, which is inside budget.
  - `test_viewer_js_suite`: the documented worktree red; the tier itself ran green above with `--repo`.
  - `test_every_established_export_lists_exactly_the_runs_the_log_records_for_its_sha`: a new
    drawing-checker run in the shared log, already filed as
    `ISSUE_20261119_the_gas_spring_mount_export_has_a_sixth_run_the_pitch_linkage_topology_does_not_list.md`.
