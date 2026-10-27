# LESSONS 2026-10-26 — the DAG draws bodies as containers and joints as symbols

Handoff `HANDOFF_20261026_the_dag_draws_bodies_as_containers_and_joints_as_symbols.md`.
Every gap edge now carries an `interface`, and the form rule is in the SOP and
the constructor. The layout walks one body at a time and draws each as a
collapsible container. A kinematic page's sub-stack is a dashed field that
opens with its table row. Each joint draws the glyph for its contact kind.
What the diff does not say is below.

## The crossing numbers (merged model, `vpa_pitch_linkage`)

| | before | after |
| --- | --- | --- |
| columns | 18 | 11 |
| `layout_crossings` branch / close / leader | 5 / 115 / 2 = **122** | 16 / 43 / 50 = **109** |
| leader-vs-rail crossings after the right-justify mirror (README) | 2 | 25 |
| all topologies, before → after the mirror (README) | 440 → 2 | 174 → 25 |
| max jog, top-aligned / centred | 1157 / 572 px | 1209 / 598 px |
| rail allocations over columns | 23 over 18 | 37 over 11 |
| bodies drawn as one block | — | 13 of 13 |

How it got there, in the order I measured it:

1. **Body-major walking, deferred joints first-in-first-out: 364.** Every
   body becomes one block. But a joint deferred from early in `base` (rows
   0-33) runs its rail all the way down to the body it reaches, and ten
   such rails stack up.
2. **Deferred joints last-in-first-out: 170** (shortest-first order). The
   most recently deferred joint forks nearest, so its rail is shortest. The
   body just started still goes first, so it closes up. I also tried LIFO
   for that case: 179, worse.
3. **Single-column moves past the exact width: 109.** This is `_improved` in
   `build_topology_projection.py`. Take the first column whose move lowers
   the count, move it, and repeat. It takes 0.01 s. It is still a local
   minimum, so `column_order` still says `shortest_first`.

**The trade, stated plainly:** the total went down because the close curves
fell (115 → 43), while leaders crossing a rail rose (2 → 50 counted, 25 drawn
after the mirror). The leader is the line a reader follows to the grid. The
objective weights the three terms equally, as `order_columns` documents, so
this is the trade that objective makes. I appended it to
`ISSUE_20261026_the_product_graph_is_past_the_exact_column_search_and_crosses_itself.md`
along with the obvious next lever (weight the terms).

The four bodiless topologies walk exactly as before. Nothing is deferred
without `bodies[]`, and `test_a_topology_with_no_bodies_walks_exactly_as_before`
pins their counts.

## The `interface` values that were not obvious, and why

All 13 gap edges of the product model and the four `shank_out` / `protrusion`
edges of the other topologies now carry one. Where the choice was not
obvious, the edge's `note` gained an `Interface …:` sentence:

- **The four bearing-centre identities** (`*_centre_is_this_bearing`) are
  `pin_in_bore`. The handoff said "not contacts — decide and record". They
  are not joints of the mechanism: the two centres are one point. But they
  are gap edges between two parts, and the contact that makes the centres one
  point is the bearing race pressed into the link's housing bore. Leaving
  them unstated would have put four permanent "contact kind not stated" rows
  on the gap list, and those are not gaps anyone can close.
- **`gas_spring_rod_to_pitch_plate` is `pin_in_bore`.** It joins two bores
  with a pin through both. If a drawing shows a spherical rod end, it becomes
  `spherical`.
- **`gas_spring_bushing_coaxiality` is `cylindrical_slide`.** The piston
  slides in that bore, so the coaxiality is measured across a slide, not a
  seat.
- **`travel_between_end_stops` is `clearance`.** It is free space that only
  the far stop closes.
- **No edge is `planar`, and none can be.** The handoff expected "the
  hub-face seats" to be planar gap edges. A face-to-face seat is one
  `mating_surface` node in this model, so there is no gap edge to wear the
  glyph. I filed this as
  `ISSUE_20261027_a_flat_seat_is_a_node_so_the_planar_glyph_has_no_edge_to_wear_it.md`
  (audience strategy). No edge is `thread` either.
- The sweep agreement test covers the five gap edges at swept joints. The four
  ball joints are at linkage `distance` joints, which give `spherical`, and the
  plate's spindle coaxiality is at `plate_slide`, a `cylindrical` joint, which
  gives `cylindrical_slide`. The test reads each joint's type off the sweep's
  own residual rows, so the only thing written down in the test is which edge
  is at which joint (`SWEPT_JOINT_EDGES`).

## The form rule, as implemented

`dimension.form = {kind: element | modifier, zone, node?, source_ref, note}`:

- **`element`**: a structural edge, nominal 0, min and max at ∓ zone/2.
  Jeff said "± the form band". I read the band as the callout's zone, the
  full width the surface may wander, so the element's range is that width.
  If he meant ± the whole zone, the constructor check is one line.
- **`modifier`**: a zone wider than the size band is refused, and `node`
  must be one of the edge's two ends. v0 does not fold it. It is listed as
  `form_not_folded` on the gap list.
- No committed edge carries a form yet, so the two new gap kinds have no live
  row. The `[real]` coverage check names both as exemptions, and it fails the
  day either gets a live row.

## What the leaders handoff needs from the container geometry

`leaders_follow_the_active_study_across_the_seam` will want a stable anchor per
body. Everything below is in `VA.railGeometry`'s output, after the mirror, in
the SVG's own pixel space:

- **An open body**: `geometry.bodies[i]` = `{body, start, end, lo, hi, x1,
  x2, y1, y2}`. That is the field's rectangle (columns padded by 0.45 gutter,
  slot tops and bottoms inset by 1 px). Use the top-left `(x1, y1)` for the
  name, or the centre.
- **A collapsed body**: the pill is a node row with id `body:<body id>` and a
  `collapsed` block `{body, name, lo, hi, joints}`. Its mark carries `x`
  (the left column), `x2` (the right column) and `y`. The anchor is
  `((x + x2) / 2, y)`. Edges that left the body attach at
  `rim_column` / `rim_left_column`, which is the column their own node was
  on. A leader to a node that folded into a pill should land on that rim
  point, not on the pill's centre.
- Lit nodes on the body's boundary stay drawn, so a lit study never loses a
  leader's end to a collapse.

## Decisions the handoff did not make

- **The sub-stack cannot be "a dashed field inside its body".** The travel
  chain is four edges on four bodies (rows 9, 98, 100 and 104). What shipped
  is a dashed field around each bar, labelled once with the title and the
  folded interval. Closed, the four bars draw as one muted fold. It opens
  with the table's group row through one map, `state.openSubStacks`. The
  options for folding it geometrically are in
  `ISSUE_20261027_the_travel_sub_stack_crosses_four_bodies_so_it_cannot_fold_into_one_bar_inside_one.md`.
- **A body's container is a region tint**, like the leader bands, so it
  claims nothing under the fill rule. There are six low-chroma tints at alpha
  ≤ 0.075, picked by the body's place in `bodies[]`. They are never the
  accent and never a provenance hue.
- **The collapsed state is the first per-topology preference in
  localStorage** (`tolstack.viewer.collapsedBodies`, a map from topology to
  body ids). The handoff asked for it ("per body per reader"). It reuses the
  pane width's discipline: the store is injected, every access is wrapped,
  and an unreadable value reads as nothing collapsed.
- **Order of the pane's transforms: hide, then collapse, then mirror.** A body
  the study does not reach is simply gone, and a pill stands only for what is
  drawn.
- **The glyph size is a JS pixel constant** (`VA.INTERFACE_GLYPH_PX`). It is
  not a type step: `docs/DESIGN_TYPE_AND_COLOUR.md` says an icon is a picture,
  and that doc now has a row for it.
- **The fixture closed the already-filed drift** (`variant_axis`, study
  `tags`) in the same pass as its own new fields. The issue is now
  `status: resolved`.

## Things that cost time

- **A class name I picked was already the pane's own.** I named the
  container rect `tv__body`. `renderTopoPane` already wraps the rails and the
  grid in `<div class="tv__body">`, so my `.tv__body { pointer-events: none }`
  switched off every click and hover on the DAG and the grid. Every fast and
  `[real]` check stayed green, because the DOM shim has no CSS. The browser
  tier caught it in ten suites at once ("`line.rail__hit` intercepts pointer
  events", and that the dot's computed `pointer-events` was `none`). The
  class is now `tv__bodyfield`. Before naming a class, grep the stylesheet
  *and* the views for it.

- **The Bash tool's heredocs broke three times.** Two failed with
  `unexpected EOF while looking for matching '` on content full of
  apostrophes and quotes. One ate a `\n` inside a Python string. Earlier
  lessons say the same. Write the edit script to the scratchpad with the
  Write tool and run it.
- **My first body-span guard did not bite.** Its "interrupted" case swapped
  two rows to the other body, which left both runs contiguous. Only the
  witness run (`--changed-since integration`) showed it. I fixed the case so
  it is really interrupted.
- **Editing `groupRows` broke two existing specs' anchors.** The specs are
  `fast__the-group-row-is-collapsed-until-opened…` and its browser twin. I
  re-anchored both onto `kid.hidden = !startOpen;`. The contract is
  unchanged.
- **The browser tier reads RED when the worktree has no `node_modules`**, and
  the witness runner then skips every browser entry as "tier already red". A
  junction to the main checkout's `node_modules` fixes it. Remove it before
  finishing.

## Verification

Recorded in the completion report from each run's own output. Projections were
rebuilt from this branch's committed tree into the worktree's own `data/`
(`dispatch bridge-test-inputs`, then the main checkout's projections copied
in, then `scripts/rebuild_projections.ps1`). The shared `data/projections/`
was not touched.
