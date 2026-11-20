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
   and two facing pins closer than two stubs split the gap (`route`). A child
   joined to its parent sits `VA.MAP.child.joined` (64) under it, room for the
   40-unit symbol. This is the U-turn fix.
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
5. **A pin-side repair**: where a defect is left, the two pins of the defective
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

## Witness specs re-pointed

Three existing specs anchored on lines this rewrote (the column flank, the row
flank, the stub). Each was re-pointed at the new line with the same contract.
Four new fast guards, each with a spec; census pin 607 → 611.

## Shots

`docs/sessions/lessons/shots/a_map_pin_faces_each_partner_and_no_two_routes_share_a_run/`,
from `tests/debug_map_pins_per_partner_20261119.mjs` against the main
checkout's projection (this handoff changes no projection input). `before_*`
are integration at `1a0c6707`; `after_*` this branch. Each set: the whole map
and the pitch plate region at 3840 Side by side and at 1536, and each of the
five two-interface features hovered at 3840.
