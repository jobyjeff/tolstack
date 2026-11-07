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
- **The browser tier starts every page on the rails, and the blocks have a
  suite of their own.** The first full browser run with blocks as the
  default was red in seven suites. The checks there assert facts about the
  rail model: uniform height equals rows × row height, a bar is a `line`,
  and the DAG leaves room beside it at 1600 px (the strip takes it). One
  check was a real defect, found by the topology suite's hover abort: a
  chord's 14 px hit path covered the pin it lands on. Chords now draw in
  their own layer under every dot (`g.tv__chords`).

  The runner's `newPage` wrapper now seeds `partDrawing: "rails"` unless the
  page already has a choice. So every existing check keeps its value
  unchanged; none was re-pinned. The new **"parts as blocks"** suite picks
  blocks and holds the same contracts on the real model:
  - the kinematic page, the cotter-hole study and the whole walk;
  - every grid row has its mark and every leader starts on its dot
    (`CORRESPONDENCE_IN_PAGE`, the oracle the 11-03 handoff measured with);
  - every joint end wears its glyph;
  - the lit set is drawn one-for-one with the grid and is on screen at
    landing;
  - every block is inside the band;
  - a part is one block on the walk;
  - a pin is what the pointer finds at its centre.

  The cost: the legacy suites no longer see the default drawing. What they
  hold about the blocks page is whatever the blocks suite re-asserts, and
  nothing else. The 1600 px room check is the one to watch (brief Q7's slit):
  with blocks, the DAG is wider by the strip.
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

## Verification record (2026-11-06)

Everything ran in **this worktree**. The declared inputs were bridged
(`dispatch bridge-test-inputs`). The projections were built here by
`scripts/rebuild_projections.ps1` from `e4ee54e8`, a clean commit. Every
input the builders read is unchanged since then, and the tiers' own
provenance gates agreed. `node_modules` was junctioned in from the main
checkout for the browser runs and removed afterwards.

- `node apps/viewer/run_tests.cjs`: **651/651**, `[real]` armed. This
  includes 9 new block checks and the new `[real]` live-model check.
- `node apps/annotate/run_tests.cjs`: **291/291**.
- `venv-win/Scripts/python.exe -m pytest -q -p no:cacheprovider`
  (single-process; this venv has no xdist):
  - **1 failed, 1729 passed, 1 skipped, 2 deselected, in 590 s**, recorded
    inside the default budget.
  - The one failure was
    `test_every_anchor_resolves_to_exactly_one_place`: the hidden-band spec's
    anchor rotted when the band began to be laid out of the gathered walk. It
    was fixed in `15dfc458`.
  - After the fix, `tests/test_mutation_witnesses.py` alone passed
    **44/44**. The full suite was not re-run after that fix.
- `node scripts/run_viewer_browser_tests.mjs --repo <this worktree>`:
  - **41/43 suites, in 1482 s**, recorded inside the merge budget.
  - The two reds were already red on integration, and both are filed:
    - "the DAG zoom, Fit and the grid header" →
      `ISSUE_20261104_the_first_row_zoom_check_wheels_above_the_drawing.md`.
      It printed the same "fit 0.55, max 0.55, drawing starts at 269".
    - "kinematic study page", two checks →
      `ISSUE_20261106_two_kinematic_page_browser_checks_still_match_the_old_edge_names.md`.
  - Two sub-sections skip for want of live data, each naming its existing
    issue: no live gap row, and no declared-region crop.
  - That full run had the blocks suite as 15 checks. It was consolidated to
    6 afterwards, and `--only "parts as blocks"` then gave **6/6**.
- `node scripts/run_mutation_witness_tests.mjs --changed-since integration --repo <this worktree>`:
  - "43/46 witnessed, 46/48 reached in 28m50s; 2 left to the sweep", and
    42m39s of wall time, the rest spent waiting for the browser slot. Filed
    as over budget:
    `ISSUE_20261106_the_witness_gate_ran_43_minutes_wall_with_the_browser_slot_contended.md`.
  - All 15 specs this branch added were witnessed, and so was the re-pointed
    hover spec.
  - The three not witnessed were "the tier was red before the mutation",
    all in the two suites above with pre-existing reds.
  - The re-pointed hidden-band spec was left to the sweep by the cap, then
    witnessed with `--only`, in 2m55s.

## Review round 1 (REQUEST CHANGES): what changed

The review (`REVIEW_20261106_a_part_with_many_interfaces_is_drawn_as_a_component_with_pins.md`,
on the review branch) had one blocker, three should-fixes and two nits.
`integration` was re-merged first (at `ad4bae87`). The one conflict was the
guard pins again; both sides' comments were kept, and the pins were
re-measured on the merged tree, not taken from either side.

- **Blocker: a block wore its first row's body.** Fixed in `VA.blockLayout`:
  a block's body is now `VA.bodyOfPart(topoProj)[part]`. `VA.railGeometry`
  puts a block's rows on that body for the fields only (`bodyRows`), so its
  own body's field is the one widened round it. The rows themselves keep
  their body, so the grid, which is fenced, sees nothing change.
- **The new `[real]` check found a second defect.** "Every block wears its
  part's body and that body's field wraps it", run on the whole walk and on
  every study's band. On the cotter-hole band the pitch plate's block sits
  directly above another block:
  - `rowPositions`'s `pinBeyond` took the next block's first pin for one of
    its own, so the last pin gave up its bottom margin;
  - the block's rect then ran 13 px past its body's field (y2 2131 against
    2118).
  - `pinBeyond` now walks only its own block's rows. The check's spec
    witnesses both mutations.
  - The check lays each band without the column search
    (`VA.blockColumns`). The rows alone decide the body and the margins, and
    with the search the check took the fast tier from 29 s to 85 s.
- **Should-fix 2: the blocks suite grew to eight checks.**
  - **Every block inside its own body's field**, on the kinematic page, the
    chain study and the whole walk. The expected body is computed in Node
    from the projection's `bodies`. A first version compared against the
    page's own `data-block-body` and was NOT WITNESSED: with the old defect
    back, the page widens the wrong body's field round the block and agrees
    with itself.
  - **The grid's room at 1600 beside the strip.** This is held to the rails'
    own contract (the grid suite's part-cell check):
    - on both studies, every row's part cell is in the pane and is what the
      pointer finds;
    - on no page is a number or part cell clipped.
    - Sideways scroll and the whole walk's part cells are not asked about:
      both fail on the rails too (table below).
  - **The pin check now tests every pin on screen**, not the first (the
    nit): 13/13 on the kinematic page.
- **Should-fix 3: the hover shot shows a hover.**
  - The kinematic band draws the pitch plate as two blocks (the Q5 case), and
    the script had taken the first, which is unlit.
  - It now hovers a lit rail-side pin, `pitch_plate_link_attach_bore`, at its
    centre and records what lit: 2 rails, 2 stubs, 1 leader, 1 bar, 1 grid
    row.
  - `pitch_plate_block_hover_pin.png` shows the stub, rail and leader lit,
    with the "pitch plate and gas-spring piston" field round the block.
- **Should-fix 4: filed**,
  `ISSUE_20261106_a_rail_side_pins_leader_crosses_its_own_blocks_chords.md`,
  with the two ways out.
- **Nit: `rail__dot--pin`** now carries a comment saying it is a test hook,
  not a style.

### The grid's room at 1600, rails against blocks

Measured with a 1600×1000 viewport and the Preview open. The pane is 737 px
wide, and its right edge is at 1038.

| page | drawing | DAG width | grid's left edge | part cells in the pane |
| --- | --- | ---: | ---: | ---: |
| whole walk | rails | 678 | 979 | 0/99 |
| whole walk | blocks | 870 | 1171 | 0/99 |
| kinematic | rails | 310 | 611 | 6/6 |
| kinematic | blocks | 404 | 705 | 6/6 |
| cotter hole | rails | 336 | 637 | 7/7 |
| cotter hole | blocks | 528 | 829 | 7/7 |

The blocks close the whole walk's 59 px slit entirely: at rest the grid
starts 133 px past the pane's edge. That is appended to
`ISSUE_20261104_at_1600_wide_the_product_graphs_rails_leave_the_grid_a_59px_slit.md`,
whose option 1 (fit the whole walk on its first paint) fixes both drawings.

### Shots retaken

Every shot was retaken on the merged tree with both fixes in
(`tests/debug_block_shots.mjs`). The aspect band holds: 0.55–0.57 on every
page. The drawn crossings moved by one or two:

| page | link × rail before | after |
| --- | ---: | ---: |
| walk (blocks) | 34 | 33 |
| kinematic (blocks) | 32 | 30 |
| grip U10H (blocks) | 48 | 50 |
| cotter (blocks) | 32 | 33 |

Stub × rail and leader × chord are unchanged: 48/11 on the walk and 7/3 on
the kinematic page. The whole-walk shot is the one the review read the
blocker from. In it the pitch plate block now sits inside "pitch plate and
gas-spring piston", and the hydraulic-brake field above it stays narrow.

### Gotchas (round 1)

- **`tests/test_mutation_witness_shadow_concurrency.py` is a timing budget
  on the fast tier.**
  - Its tests run `--only fast__a-ready-banner` (a clean run and a mutated
    run of the whole fast tier) under a 120 s timeout.
  - A `[real]` check costing 55 s took that entry to 185 s, and four tests
    went red as timeouts, with nothing pointing at the check.
  - Time the fast tier after adding a `[real]` check that loops over every
    study.
- **A check that compares a page with itself witnesses nothing.** Compare
  against a value derived in Node from the projection.
- **`sed -i` over `scripts/mutation_witnesses/*.json` rewrites every file's
  line endings**, including the ones it changes nothing in, and git then
  shows ~300 modified specs. Restrict the glob to the files you mean, or
  restore the rest with `git checkout --`.

## Verification record, review round 1 (2026-11-06)

All runs were in this worktree, on the branch merged with `integration`
(`ad4bae87`).
- The inputs were bridged with `dispatch bridge-test-inputs`, and all six
  were already present.
- The projections were rebuilt here by `scripts/rebuild_projections.ps1`
  from the clean merge commit `94087400`. The commits after it change only
  the viewer, tests, docs and specs, none of which the builders read.
- `node_modules` was junctioned in from the main checkout for the browser
  runs and removed afterwards.

Results:
- **`node apps/viewer/run_tests.cjs`: 656/656** in 29 s, `[real]` armed.
- **`node apps/annotate/run_tests.cjs`: 292/292.**
- **Full `pytest -q -p no:cacheprovider`: 1733 passed, 1 skipped,
  2 deselected, in 750 s**, recorded over budget and added to the budget
  issue.
  - An earlier full run in the rework was 3 failed / 1730 passed in 1109 s,
    all three fixed or explained before the final run:
    - the round-1 specs cited the review report, which is not in this tree;
      they now cite this lesson;
    - two shadow-concurrency tests timed out on the slow `[real]` check
      (gotchas above);
    - the long-path test that failed when re-run alone is
      `ISSUE_20261104_a_lesson_screenshot_name_overflows_max_path_in_the_shadow_concurrency_test.md`.
      It passed in the final run.
- **`node scripts/run_viewer_browser_tests.mjs --repo <this worktree>`:
  42/43 suites in 1544 s**, recorded over budget.
  - The one red is "kinematic study page", two checks, the pre-existing and
    filed
    `ISSUE_20261106_two_kinematic_page_browser_checks_still_match_the_old_edge_names.md`.
  - The served-mode, annotate, 3D-pane and typography suites the review saw
    red (13 suites, unattributed) were green here, so there was nothing to
    file. "parts as blocks" is 8/8.
- **`node scripts/run_mutation_witness_tests.mjs --changed-since integration`:
  46/48 witnessed, 48/52 reached in 30m35s, 4 left to the sweep (budget)**,
  in 1868 s of wall time.
  - The two not witnessed are one fast entry's two mutations, red before the
    mutation. That entry was then WITNESSED alone with `--only`.
  - Every spec this round added was witnessed with `--only`:
    - the block-body `[real]` check, both mutations (after the check was
      made cheaper);
    - the body-field browser check;
    - the room browser check.

## Second merge before hand-back (2026-11-06)

`integration` moved while the rework was being verified: it landed
`the_rail_reads_as_a_tree_of_bodies_joints_and_faces` and
`the_grid_and_the_dag_move_with_the_mechanism` (91 files). It was merged
again at `3aa74f0f`, which is a fresh, measured re-merge, as the review
asked.
- **`apps/viewer/views/topology.js`:** this branch's chords layer and
  integration's `posed` flag were added on the same line. Both were kept.
- **Guard pins:** re-measured on the merged tree.
  - fast: integration's 656 plus this branch's 10 = **666**;
  - browser: integration's 846 plus this branch's 9 = **855** (822
    enrollable);
  - annotate: integration's own **295**.

**One check needed changing after the merge.** Since the pose landed, the
kinematic page opens in the contribution mode
(`VA.edgeLengthModeFor`). That mode is scaled, so a chord's length wins and
a block stretches past the aspect band by design. "...every block is inside
the aspect band" now:
- cycles the length toggle to uniform by its label, the same way
  integration's own kinematic check does;
- holds the band there, where the aspects are 0.56–0.57;
- was WITNESSED again with `--only`.

On a fresh load, the room at 1600 is as the round-1 table says, except that
the kinematic page's DAG is now narrower (273 px on the rails, 354 px as
blocks), and its part cells stay in the pane. The suite reports the whole
walk at 98/99 part cells because it reaches the walk from a study, after the
study's arrival framing. On a fresh load the walk still opens with no part
cell in the pane.

### Verification record on the second merge

This tree is `bfb9eb80` plus the band-check commit. The projections were
rebuilt from `bfb9eb80` (clean), and `node_modules` was junctioned in and
removed afterwards.

- **`node apps/viewer/run_tests.cjs`: 666/666**, `[real]` armed.
- **`node apps/annotate/run_tests.cjs`: 295/295.**
- **Full `pytest -q -p no:cacheprovider`: 1738 passed, 1 skipped,
  2 deselected, in 712 s**, recorded over budget by 1m52s.
- **Browser tier: 41/43 in 1587 s**, recorded inside budget.
  - "parts as blocks" was red on the kinematic band check, fixed as above;
    `--only "parts as blocks"` then gave **8/8**.
  - "kinematic study page" is the same two pre-existing, filed reds.
- **Witness gate, `--changed-since integration`: 46/48 witnessed, 48/52
  reached in 29m19s, 4 left to the sweep (budget)**, in 1790 s of wall time,
  recorded inside budget.
  - Every fast entry was witnessed, this branch's included.
  - The two not witnessed are in the "kinematic study page" suite, red
    before the mutation. That is integration's known gap
    (`ISSUE_20261106_two_kinematic_page_browser_checks_still_match_the_old_edge_names.md`
    and its round-2 addendum: that suite's red leaves its witness entries
    unproved).
