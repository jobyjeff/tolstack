---
handoff: viewer_leader_line_grid
date: 2026-09-10
---

# Lessons — viewer_leader_line_grid

## The leader/jog geometry rules, as shipped

`VA.leaderGeometry(layout, plan, metrics)` (topology.js, pure) draws each
leader as three orthogonal segments: `M x1 y1 H laneX V y2 H width`, where

- **`y1` (node end)** = `VA.railY(node's layout row)` — the exact number the
  dot was drawn from; `x1` is the dot's x plus its own radius (branch dots are
  bigger) plus 1.5px, so the line starts at the dot's rim, not its centre.
- **`y2` (grid end)** = `boundary × RAIL_METRICS.rowHeight`, where `boundary`
  is a **grid** row index (see the keying section below). The SVG's right edge
  IS the grid table's left edge, so the final `H width` hands off with no seam
  to align.
- **Lanes are strictly monotone in walk order, one lane per leader, never
  reused** (`leaderPad`/`leaderLane` in `VA.RAIL_METRICS` — horizontal
  constants, so density never moves them). I proved to myself before writing
  it that monotone lanes cannot cross given both endpoint sequences are
  monotone in y, and that lane *reuse* CAN cross whenever intervals overlap —
  and in this page's regime (the DAG runs ~2× the grid's height, so almost
  every leader's vertical interval overlaps its neighbours') reuse would buy
  almost no width anyway. The jog zone is `(leaders − 1) × 6px + 16px`; the
  real pitch system's 16 leaders cost ~106px, which the already-horizontally-
  scrolling pane absorbs.
- Leaders always **rise** left-to-right (`y2 < y1` structurally: a node's
  boundary counts only the edges emitted before it, and the DAG interleaves
  nodes between them). The browser tier's `CORRESPONDENCE_IN_PAGE` leans on
  that: a path's `getBBox()` bottom is the node end and its top is the grid
  end, measured geometry rather than the numbers that drew it.

## The internal-node predicate, as implemented

`VA.internalNodes(topoProj)`: a node is internal iff the DISTINCT `part`
values over its **adjacent edges in the whole document** (not the current
serialisation — an off-chain edge still counts) number ≤ 1. Three points that
were decisions, not transcription:

1. **`null` (a gap edge's non-part) is a value.** A node between a structural
   edge and a clearance is a component boundary and draws a leader — the real
   end-stop gap's two flanking nodes are the motivating case.
2. **Degree-1 nodes are internal** (trivially one part): a chain-end datum is
   *inside* its component, not a boundary. So the very top of a topology often
   has no leader, which is correct — the merged component cell still opens the
   group.
3. **A branch node can be internal**: `hub_top_deck` has FOUR adjacent edges,
   all `hub`, and gets no leader. Branchness is marked on the dot (accent
   ring); leaders are strictly about part membership.

## Grouping is per contiguous RUN, not literally one row per part

The DoD says "one merged row per part"; the depth-first walk makes that
unattainable without reordering: **the real pitch system has 12 parts but 18
contiguous runs**, four parts splitting — hub as 2 runs (the spine's first
three dimensions and the four loop-closing edges at the tail),
`pitch_plate_215177_001` as 3 (one per branch that leaves it), and
`gas_spring` and `blade_root` as 2 each (blade_root's two runs are
*consecutive*: a boundary node between two same-part edges, the miniTopo(true)
case, live). `VA.gridPlan` breaks a group where the part
changes between consecutive edge rows **or** where the node row between them
is non-internal (so a leader can never point inside a merged cell), and each
run gets its own merged cell. Reordering the grid to force one row per part
would cross the leaders and break the walk-order correspondence that
deliverable 3 makes the page's contract — and the walk order being the
author's steering wheel is a standing decision (README, "The rails"). Pinned
as such in the real-data fixture tier ("a part revisited on a later branch
gets a merged row per visit"). If Jeff wants revisited runs visually tied
together (e.g. a shared tint per part), that is new design — say so rather
than assume.

## How row↔node correspondence is keyed (for viewer_edge_length_scaling)

Everything is keyed by **document id + role**, never by pixel or row index:

- grid rows: `tr.tvrow[data-id=<edge id>][data-row-kind="edge"]`, one per
  edge, walk order, inline height `RAIL_METRICS.rowHeight`;
- DAG marks: unchanged (`[data-id][data-row-kind]` on dots and bar-hit
  lines);
- leaders: `path.rail__leaderhit[data-leader-id=<node id>]
  [data-boundary-edge=<edge id | "">]` — the boundary edge id is what lets a
  test (or a future layout) find the seam as a ROW BOX rather than
  re-deriving arithmetic; `""` means "below the whole grid" (a chain layout's
  final node exercises it).

**What the scaling handoff has to change and what it must not:** the node-side
y currently comes from `VA.railY(leader.layoutRow)` inside `leaderGeometry`.
When node positions stop being `row × rowHeight`, feed the keyed positions in
there (and in `railGeometry`) — the grid-side y (`boundary × rowHeight`) and
the whole `gridPlan` are functions of the walk order and the parts only, and
should not move at all. The monotone-lane no-crossing proof holds for ANY
node-y assignment that preserves walk order; if a scaling mode can reorder
nodes vertically, lanes need rethinking. `CORRESPONDENCE_IN_PAGE` measures
ends against boxes, not against the layout arithmetic, so it survives the
scaling change unedited — extend it, don't fork it. For the future
animated-rearrange: dots, bars and leaders are already addressable by id, so
keyed transitions have their hooks; what does not exist yet is any notion of
a position *store* separate from render (every render recomputes geometry
from scratch), which is the seam that feature will need.

## Gotchas that cost time or would have

- **A `<tr>`'s height is a floor, not a cap — again.** The crop trigger
  button, moved out of the chips cell's clamping wrapper into its own column,
  rendered 17px tall at compact density (16px pitch) and silently walked every
  seam below it off its leader by 1–2px. Only the browser tier caught it
  (`leaders stay on their dots and seams at compact density`); the fix is the
  same `height: var(--tv-row); overflow: hidden` wrapper the chips cell
  already uses (`.tvcell__cropwrap`). Any future cell content needs the same
  clamp — this is the third incarnation of the same table-sizing trap the
  files already document twice.
- **Group separators must not be borders.** `.tvrow--group-start` uses an
  inset `box-shadow`, because a cell border participates in table row-height
  sizing (topology.css's own collapsed-border lesson) and a shadow never does.
- **The demo mechanism has no multi-edge group and only a trivial internal
  node**, so merged-cell rowspans and the merge-across-internal-node case are
  covered by a hand-built mini fixture inside tests.js (pure-function input,
  no folded numbers — the fixture-regeneration rule is about builder numbers,
  which the mini carries none of) plus the real pitch_system pins.
- **Thumbnails load through a cache the render reads synchronously**
  (`ctx.cropImages` = topology_app's `imageCache`); `ensureThumbImages` is
  fired from `paint()` and re-renders once when new PNGs land. It cannot loop:
  the second pass finds everything cached or in flight and schedules nothing.
