# LESSONS 2026-11-06 — a_part_with_many_interfaces_is_drawn_as_a_component_with_pins

Handoff: `docs/sessions/active/HANDOFF_20261105_a_part_with_many_interfaces_is_drawn_as_a_component_with_pins.md`.
Shots: `docs/sessions/lessons/shots/a_part_with_many_interfaces_is_drawn_as_a_component_with_pins/`,
taken with `node tests/debug_block_shots.mjs` on this tree's own projection
(inputs bridged, built here from `e4ee54e8`, a clean commit). The drawn
measurements are in `measurements.json` beside them.

## What landed

A part with two or more interfaces is drawn as one block, with its
interfaces as pins on its sides. It is display only. The projection's walk,
its columns and the README's `layout_crossings` claim are untouched. The
page re-arranges what it draws (`apps/viewer/topology.js`), and
`docs/DAG_TOPOLOGY.md` ("A part with many interfaces is a block with pins")
is the statement of the rule.

- `VA.partPins`: which part each node is a pin of, which parts are blocks,
  and which edges are chords.
- `VA.gatherParts`: the projection's walk with each block part's pins and
  chords moved up to where the part first appears. It is re-laid with
  `VA.layWalk` without the chords, then column-searched.
- `VA.blockLayout`: marks every run of one block's rows, cuts a run at any
  chord whose other pin is elsewhere, and re-derives rails and links without
  the chords.
- `VA.blockColumns`: the same column search on a study's band, which
  `VA.bandLayout` re-lays out of the gathered walk.
- `VA.railGeometry` draws `blocks`, chords (pin to pin, as curves), `stubs`
  and pins at their side's x. `VA.rowPositions` gives a pin a row and a
  chord no height (uniform). `VA.leaderGeometry` starts a pin's leader at the
  pin, and the jog zone starts past the strip.
- A fourth View setting, **Parts: Blocks | On the rails**
  (`VA.PART_DRAWINGS`). Blocks is the app's default. A caller that names
  neither, which includes every fixture-tier render, draws the rails. That
  keeps the whole rail machinery tested where it is still reachable.

## The pin-placement rule

1. **Owner.** A node on one part is that part's pin. A contact face on two
   parts is a pin of the part with more faces, the first listed on a tie. So
   a washer's face against the pitch plate is the plate's pin, and the
   one-face washer stays a glyph whose thickness edge lands on the plate's
   pin.
2. **Side.** A pin that anything other than its own chords meets is on the
   **rail side** (left, facing the rails). It is joined level, by a stub, to
   the column its rails reach it on. A pin that only its own chords meet is
   on the **far side** (right). Nothing has to be routed to a far-side pin,
   and it has no leader, because a node whose every edge is on one part is
   internal and the grid gives it none.
3. **Height.** Every pin has its own height, in walk order. This is the one
   premise `VA.leaderGeometry`'s crossing-free lanes rest on, so it is kept
   over a more compact two-pins-per-level packing. The first attempt used a
   half-row pitch, and the joint glyphs (a row tall) overlapped. The pitch is
   one row.
4. **Where.** Blocks sit in a strip one gutter right of the spine. Every
   block's left side is at the same x, so a stub runs from its column to the
   strip, which is the same set of rails the node's leader used to cross.

## The aspect band

`VA.BLOCK_ASPECT`: width over height between 0.5 and 2 (1:2 to 2:1). The
target is 0.55: the width is 0.55 × (pins + 1) rows, and the height is
(pins + 1) rows, which is one row per pin and a row of margin in all.

Measured on the live walk, uniform, every block (16 of them, the scratch
re-derivation of the shots' geometry):

| pins | blocks | width : height |
| ---: | ---: | ---: |
| 2 | 7 | 0.57 |
| 3 | 1 | 0.56 |
| 4 | 3 | 0.56 |
| 5 | 3 | 0.56 |
| 11 (hub, pitch plate) | 2 | 0.55 |

The `[real]` fast check "drawn as blocks, every committed topology's whole
walk is one block per part, each inside the aspect band…" holds this on the
live model.

Two defects found by the shots and fixed:

- A run that ended in a loop-closing chord after its last pin had no bottom
  margin, and its rect read the chord's slot. One block came out at 0.48.
  Margins now key on "no further pin in this block", and the rect on the
  pins alone.
- In a band, a chord whose other pin the band put elsewhere kept a full-row
  bar inside the block (0.21). Such a chord now cuts the run, keeps its bar
  and rail outside, and each piece with two pins or more is a block.

## Crossing counts (brief Q1)

`VA.layoutCrossings`, branch / close / leader = total. This is the
builder's own definition, ported. The one change: a far-side pin draws
nothing across a rail, so it adds no leader term. "Before" is the page as
it was (the builder's walk, or `VA.bandLayout` of it). "After" is blocks.

| page | before | after | columns |
| --- | --- | --- | --- |
| whole walk | 16/70/50 = **136** | 17/29/74 = **120** | 14 → 14 |
| kinematic: blade pitch at the end stops | 29/126/33 = **188** | 16/64/33 = **113** | 14 → 14 |
| chain: grip budget, NAS6403U10H | 16/70/50 = **136** | 24/58/80 = **162** | 14 → 14 |
| chain: pitch-link shank out | 16/72/48 = **136** | 28/36/63 = **127** | 14 → 14 |
| chain: pitch-link cotter hole clearance | 16/74/50 = **140** | 24/38/62 = **124** | 14 → 14 |

The 11-03 figure the handoff quotes (20/97/50 on 14 columns) is two walks
old. The README's live claim is 16/70/50, and that is what this table
compares against. Every page drops except the U10H grip budget, which goes
up by 26. Filed:
`docs/issues/ISSUE_20261106_the_u10h_grip_budget_crosses_itself_more_as_blocks_than_on_the_rails.md`.

What moved the whole walk from worse to better, in order:

| step | whole walk |
| --- | ---: |
| gathered, re-laid preferring the builder's columns, chords still laid as rails | 314 |
| + chords drawn in the block, so no rail (`VA.blockLayout`) | 205 |
| + swap search on the drawn count | 190 |
| + far-side pins out of the leader term | 164 |
| + laid out without the chords (they held a column through the block for nothing) | 141 |
| + the trunk's column searched too | **120** |

Laying out with no column preference was worse (158). Holding the trunk at
column 0 cost 21 crossings. The leader term already prefers the rails most
leaders leave from nearest the grid, which is all "the spine on the right"
was for. On the walk the mainline is no longer guaranteed to be the
rightmost rail.

The drawn geometry, from the browser (`measurements.json`, 40-point
polylines, a hit within 1.5 px of an end not counted):

| page | drawing | SVG width | rails | links | link × rail | stub × rail | leader × chord |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| walk | rails | 678 | 59 | 79 | 51 | — | — |
| walk | blocks | 870 | 34 | 41 | 34 | 48 | 11 |
| kinematic | rails | 370 | 63 | 83 | 66 | — | — |
| kinematic | blocks | 451 | 55 | 70 | 32 | 7 | 3 |
| grip U10H | rails | 324 | 59 | 79 | 47 | — | — |
| grip U10H | blocks | 516 | 44 | 69 | 48 | 39 | 0 |
| cotter | rails | 336 | 61 | 81 | 53 | — | — |
| cotter | blocks | 528 | 39 | 58 | 32 | 25 | 0 |

A stub crossing a rail is the crossing the node's leader made before. It is
the leader term, drawn by a different line. **Leader × chord** is new: a
rail-side pin's leader runs flat through its own block to the grid, and it
crosses that block's chords. The strip widens the DAG by the widest block
plus a gutter (about 190 px at the narrow width, for the 11-pin blocks).

## Brief Q1, Q3, Q5

- **Q5 (part runs repeat): dissolved on the whole walk and on chain
  studies.** A part is one run of the drawn walk, and the grid is built off
  the drawn walk, so each block part also has one merged component cell
  there. The `[real]` check holds "one block per part" on the live walk. It
  **stays open on a kinematic page**: the band is in the stack's own order
  (`lit.order`), the handoff fenced that order, and a part the stack visits
  twice is two blocks in the band. Example: the pitch plate's lit pins in
  the band, and its unlit ones in the rest.
- **Q1 (the whole walk crosses itself): answered for this layout**, by the
  table above: 136 → 120 on the walk, by a local column search on the drawn
  count (a local minimum, and declared as one). What gives is the trunk's
  fixed column. The brief's open choice of a heuristic column order is now
  this search, for the blocks drawing. The rails drawing keeps the builder's
  order.
- **Q3 (the travel sub-stack crosses four bodies): stays open.** Blocks are
  per part. A sub-stack is a chain across parts in four bodies, so it is
  still four dashed fields. Nothing in this layout makes it one bar, and no
  option the issue lists was chosen here.
- **When two constraints fight (deliverable 4).** In a scaled length mode a
  chord's drawn length is the value. The two pins it joins are exactly that
  far apart (a pin gives up its half row beside a chord). The block
  stretches, and **the aspect gives**: on the kinematic page under
  tolerance, blocks run from 0.57 down to 0.06. The length is the claim, and
  the shape is a convenience. In uniform mode the aspect holds and lengths
  mean nothing, as before. A chord between two pins that are not
  consecutive (a fork inside a part) spans the slots between them, so its
  length is honoured only when its pins are adjacent in the walk.

## Decisions not in the handoff

- **A View setting, not a replacement.** The fixture tier pinned the rail
  drawing in about 20 places (hover along a rail, row order, bar counts).
  Rewriting those to blocks would have tested blocks through fixtures built
  for rails. As a setting, both drawings are reachable and both are tested.
  Blocks is the page's default, so Jeff sees blocks.
- **Pins on two sides, not four.** The rails come from the left and the
  grid is on the right, so a top or bottom pin's leader would run along the
  block's own border, and two pins on one edge would share a height, which
  the leaders' premise forbids. With two sides, every edge leaves toward its
  other end: rails left, nothing right.
- **Chords are curves.** A chord bows into the block by up to 0.8 of its
  width. Nested same-side chords nest rather than overlap, and an opposite-
  side chord is an S.
- **A body widens to wrap its blocks, and a study group does not.** Widened
  study groups striped every block they partly covered (the first shots).
- **The column search costs about 0.35–0.5 s** on a study's first paint
  (the walk's is cached once). It is memoised per study, so a repaint or a
  respine frame does not repeat it. Filed as a follow-up:
  `docs/issues/ISSUE_20261106_the_block_column_search_costs_half_a_second_on_a_studys_first_paint.md`.

## What the click-around found

`pitch_plate_block.png` and `pitch_plate_block_hover_pin.png` are on the
kinematic page. The tangential link, pitch link and both bearings read as
two-pin boxes. Each pin's stub meets its rail, and the leaders leave from
the pins. **The hover shot does not show a hover.** The script hovered the
first pin in the DOM, an unlit one above the crop, so
`pitch_plate_block_hover_pin.png` shows the unlit pitch-plate block (its
pins hollow and dimmed) and no lit state. The stub is registered on its
node's rail (`hot.railOf`), so hovering along that rail should light it, but
no shot here shows that. In the walk shot (`walk_blocks_dag.png`) the hub
and the pitch plate are the two big blocks, with their inner pins on the
right. The labels of study groups pile up where several groups start on
adjacent rows. The 11-05 shots show the same pile-up. With "On the rails"
the page draws the builder's walk (`*_rails*.png`); I did not diff those
shots against the 11-05 ones.

## Sites this reaches, and the ones it does not

- **Reached:** the whole walk, chain studies and the kinematic page; a
  study's band; a collapsed body (its rows are folded before blocks are
  marked, so a folded block simply is not drawn); hidden unlit rows (the band
  alone); every length mode; the leaders and the leaders across the seam
  (`VA.seamDots` reads the marks, so a pin's dot is where it is drawn).
- **Not reached:**
  - The grid itself. It was not re-laid; it follows the drawn walk, as ever.
  - The tween. It was not touched. A pin's x comes from the interpolated
    spine column, so it rides the respine like everything else.
  - The annotator. It was not touched.
  - The fixture-tier renders, which name no drawing and so draw the rails.
  - The builder's `layout_crossings` claim, which still describes the
    builder's walk, the one "On the rails" draws.

## Gotchas

- **`python - <<'EOF' </dev/null` is wrong.** The trailing redirect replaces
  the heredoc as stdin, so the script never arrives and the command hangs
  until the 2-minute timeout. Write the script to the scratchpad and run the
  file.
- **A renamed guard needs its spec moved too**: `git rm` the old-name spec
  and write the new one. `--unenrolled` prints the new file name. The
  name-set hash in `scripts/guard_enumeration.mjs` changes with any rename.
- **Changing how a line is built rots every spec anchored on it.** Here the
  bar's hit path became `barShape(...)`, which rotted
  `browser__hovering-the-dag-s-own-bar-previews-the-edge-s-record`.
  `tests/test_mutation_witnesses.py::test_every_anchor_resolves_to_exactly_one_place`
  catches it in two minutes. Run it before the full suite.

## Found on arrival

Nothing. The worktree was clean. Nothing was written to the main checkout.
`node_modules` was junctioned in from the main checkout for the browser
runs and removed afterwards (`cmd /c rmdir node_modules`).

## Follow-ups filed

- `docs/issues/ISSUE_20261106_the_u10h_grip_budget_crosses_itself_more_as_blocks_than_on_the_rails.md`
- `docs/issues/ISSUE_20261106_the_block_column_search_costs_half_a_second_on_a_studys_first_paint.md`
- `docs/issues/ISSUE_20261106_a_part_the_kinematic_stack_visits_twice_is_two_blocks.md`
  (Q5's remainder, strategy)
