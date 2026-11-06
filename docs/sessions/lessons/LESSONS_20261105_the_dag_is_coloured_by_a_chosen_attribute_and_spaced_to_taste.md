# LESSONS 2026-11-05 — the_dag_is_coloured_by_a_chosen_attribute_and_spaced_to_taste

Handoff: `docs/sessions/active/HANDOFF_20261105_the_dag_is_coloured_by_a_chosen_attribute_and_spaced_to_taste.md`.
Shots: `docs/sessions/lessons/shots/the_dag_is_coloured_by_a_chosen_attribute_and_spaced_to_taste/`,
taken with `node tests/debug_dag_colour_shots.mjs` on this tree's own
projection (bridged inputs, built here from a clean commit). The
measurements are in `measurements.json`, next to the shots.

## What landed

- **Groups are borders.** Each group is drawn as a 1 px border with no fill,
  in one bright hue per kind: body `--group-body`, part `--group-part`, chain
  study `--group-chain`, kinematic study `--group-kinematic` (the accent). A
  **part** is now a group: each run of a part's rows inside its body
  (`VA.partSpans`), sitting inside the body's field. It is also a new
  checkbox in the Groups popover, which now has four kinds. Fills are
  separate rects, all in one layer (`g.tv__fills`), drawn under every border,
  so a border is always on top of a fill.
- **View popover** (`#dag-view`) holds three pickers, and all three are
  remembered in one store entry (`VA.DAG_VIEW_KEY`):
  - "Colour by" (`VA.COLOUR_SCHEMES`)
  - "Group fill": off, parts or all (`VA.GROUP_FILLS`). Parts are filled
    solid, with the body's ink mixed 24 % into the page.
  - "Graph width": narrow, medium or wide (`VA.GRAPH_WIDTHS`), with a column
    pitch of 20, 30 or 42 px. Narrow is today's pitch.
- **Overlays.** A scheme maps an edge and a node to a token, and
  `topology.css` turns that token into `--ovl`. The bar's stroke, the dot's
  stroke and the glyph's ink all wear `--ovl`. Weight still means lit or
  unlit, and the dash, the dimming, hover and the selection outline are
  unchanged. A key strip of swatches and words (`#dag-overlay-legend`) sits
  under the toolbar. Adding a seventh scheme means one entry in the table
  plus its tokens.
- **The sourcing legend names every tint.** The grid legend's prose ("a red
  wash marks…") is gone. In its place each wash a row actually wears and each
  body's tint now has a swatch with its name beside it
  (`VA.gridLegendTints`). The two wash colours are now tokens
  (`--wash-untraced`, `--wash-nocite`), shared by the rows and the swatches.
- **The second block is named.** A body's other blocks carry a muted repeat
  of its name (`text.tv__bodyrepeat`). The repeat does not fold the body.
  Only the named block folds it.
- **Gaps** are drawn in `--edge-gap-ink`, a dimmer ink, with a long dash
  (`10 6`) instead of `4 3`. See "Gap stroke" below.
- **3D.** The viewer posts `model tint <part>=#rrggbb …` (`VA.sceneTintCommand`),
  using each part's body ink read off `--tv-body-ink-*`. The scene
  (`Scene.setPartTints`) mixes that ink into a neutral grey at 0.7 and keeps
  it per sha, so a part that loads later is tinted too. The pick and
  highlight tints still paint over it. The 3D change is to material colour
  only, as the handoff fenced it.

## The scheme table

| id | edges | nodes | palette | legend |
| --- | --- | --- | --- | --- |
| `none` | the one neutral ink | the one neutral ink | — | none |
| `body` | part → body → `--tv-body-ink-<tint>`; a gap is in no body and stays neutral | first part's body | 16 body inks | every body by name |
| `part` | its body's ink, in shade `i mod 3` of the part's place in `bodies[].parts` (`.ovl-s1` lighter, `.ovl-s2` darker) | first part | the same 16 inks × 3 shades | the bodies (hue = body) |
| `interface` | `edge.interface` → slot in `VA.NODE_GLYPH_PRECEDENCE` | the joint kind it is an end of (`VA.nodeJointKinds`) | `--ovl-if-0..5` | the kinds drawn |
| `sourcing` | confidence → the provenance hue; gap → gap ink; no value → muted | neutral (no node carries a confidence) | `--traced/--inferred/--untraced/--nocite` | the states drawn |
| `contribution` | \|sensitivity\| × band at the page's stop (`VA.kinematicContributions`), in 5 equal bins of the maximum | neutral | `--ovl-seq-0..4` | 5 steps, upper bound each, in the study's unit |

`contribution` is offered only on a kinematic page (`available`).

### Schemes considered and not built (Jeff: "any other color schemes that could be helpful?")

- **Lit vs unlit by study.** The group borders and the lit weight already say
  this.
- **Drawing / document**: colour by the source document an edge cites. It
  would be useful for "which drawing do I still need", but there are dozens
  of documents, far past any categorical palette. A legend-and-filter would
  serve this better than a colour.
- **Tolerance band width** (|band| alone, without the sensitivity). It
  works on a chain page where contribution is not offered. It is one table
  entry and a sequential ramp. Next in line if Jeff wants it.
- **Annotation state**: whether the edge's faces are bound in 3D, or proposed,
  or unbound. It is useful for the annotation backlog. It needs the
  feature-identity fold on the page, which the DAG does not load.
- **Variant** (which tagged variant a part belongs to). It is already shown
  as dimming (`--other-variant`), and adding colour would double-encode it.
- **Sign of the sensitivity** (diverging red/blue). It is interesting for
  cancellation. It is held back because a diverging pair would collide with
  the provenance red.

## The ramps and their contrast checks

Every set was run through the dataviz skill's `scripts/validate_palette.js`
in dark mode against the page's `--bg` `#16181d`.

- **Body inks** (`--tv-body-ink-0..15`). These are the same 16 hues as
  `--tv-body-*`, slot for slot. They were found by a search over OKLCH
  L ∈ {0.56, 0.61, 0.66} and C ∈ {0.115, 0.14, 0.165} per slot, with each
  slot's hue fixed. The search kept the best set that passed everything:
  - lightness band: all 16 inside 0.48–0.67
  - chroma: all ≥ 0.1
  - **adjacent CVD separation: worst ΔE 10.9** (deutan, #ba417b↔#04a4bc)
  - **normal-vision: worst 18.5**
  - **contrast: all ≥ 3:1**

  The first attempt had all slots at the same lightness, and it failed CVD
  (ΔE 2.3). Lightness is what carries the separation.

  Sixteen slots is twice the skill's eight-slot advice. They are kept because
  body identity also has the body's border, its name and its grid row. The
  palette is a second cue, and slots are assigned in a fixed order, never
  cycled.
- **Interface type** (`--ovl-if-*`). These are the reference palette's dark
  steps 1–5 and 7 (green and red are skipped so they cannot read as
  provenance). Adjacent pairs pass (CVD 8.4, normal 19.3). **All-pairs
  fails** (CVD 1.6, normal 9.8). On the DAG every node also has its glyph
  shape, which is the second encoding the skill asks for.
- **Contribution** (`--ovl-seq-0..4`): blue 600 → 200. The ordinal check
  passes: monotone, adjacent ΔL ≥ 0.06, the dark end at 2.19:1 against the
  surface, and a hue spread of 3°.
- **Sourcing** uses the app's provenance palette unchanged. As a set it
  **fails**: traced against inferred is CVD 3.0 (protan), and untraced
  against inferred is normal-vision 14.8. On the grid the chip's word is the
  second encoding, but on the overlay only the legend has it. I filed this
  for strategy instead of changing the app's subject palette:
  `docs/issues/ISSUE_20261105_traced_and_inferred_are_hard_to_tell_apart_under_protanopia.md`.

## Decisions not in the handoff

- **Group fill defaults to off.** The handoff says "No fill by default"; Jeff
  said parts "could potentially" stay filled. Parts is one click away.
- **Study kinds keep two hues**, chain and kinematic. Jeff asked for
  "different colors for each group type", and a chain study and a kinematic
  study are two types.
- **A part's fill uses its body's ink**, not the part border hue. That way a
  filled part shows which body it belongs to, and the grid's row tint, the
  DAG fill and the 3D colour all come from the same 16 hues.
- **The bridge** between a body's blocks used to be 4 px in the 0.07-alpha
  tint, which was invisible. It is now a 1 px dashed line in the body border
  hue.
- **The sourcing overlay colours no node**, because no node carries a
  confidence. Colouring a node by its edges' worst confidence would be
  inventing a fact about the node.
- **Contribution bins are equal fifths of the page's maximum**, recomputed
  for each stop. Two stops' colours are therefore not comparable, and each
  stop's legend states its own bounds.

## The widths, measured (kinematic study, blade pitch at the end stops)

Each width was measured on the live drawing at the page's landing zoom of
0.823, which every width shares (`measurements.json`). "Pane" is the rails
SVG, which includes the leader jog zone. "DAG" is the drawing at zoom 1. The
crossings were counted on the drawn geometry: each of the 83 links was
sampled to a 40-point polyline and tested against each of the 63 rails and
each other link. A hit within 1.5 px of either path's own end does not count.

| width | column pitch | DAG at zoom 1 | pane at 0.823 | link × rail | link × link |
| --- | ---: | ---: | ---: | ---: | ---: |
| narrow | 20 px | 420 px | 346 px | 66 | 252 |
| medium | 30 px | 550 px | 453 px | 64 | 248 |
| wide | 42 px | 706 px | 581 px | 65 | 249 |

**The crossings do not move with the width, and that is by construction.**
The width setting scales x and nothing else, and a scale keeps every
intersection. The ±2 spread is sampling noise: a 40-point chord of a curve
lands on either side of a rail it only grazes. The link × link figure is
inflated by close links that run collinear on one column, where every
sampled chord "crosses". It is useful only for comparing the widths with
each other, not as a count of crossings a reader sees. The width spreads the
clutter Jeff described but does not untangle it. Untangling belongs to the
layout, and `a_part_with_many_interfaces_is_drawn_as_a_component_with_pins`
owns that.

## Gap stroke, at the floor, fitted and at 1

Shots: `4_gap_floor.png` (zoom 0.12), `4_gap_fitted.png` (0.208, the whole
topology fitted at 1600 px) and `4_gap_zoom1.png` (1.06).

- **At zoom 1**, a lit gap is a broken line of 10 px dashes in the dimmer
  ink. It reads as "not a solid bar", and the 4 × 3 hashes are gone.
- **At 0.208 and at 0.12**, a dash is 1–2 px long, so a gap reads as a
  fainter line. The only thing separating it from a solid edge there is the
  ink, which is dimmer. At 0.12 the whole drawing is a thumbnail and nothing
  is legible at the mark level, the gap included.

If a gap has to read as a gap at the floor, the next lever is a dash in
screen pixels: `vector-effect: non-scaling-stroke` together with a dash
array divided by the zoom. That is not done here, and it is filed
(`ISSUE_20261105_a_gap_reads_as_a_gap_only_from_the_fitted_zoom_up.md`).

## What the click-around found

- The popover re-opens after each change, which is the intended behaviour so
  a reader can try settings in a row. In a screenshot it covers the key strip
  under the toolbar. The shot script closes it before each shot.
- The key strip's body names are the bodies' own names, and several of them
  are part numbers ("214699-002 lower…"). Each one is cut to 22 characters,
  and its hover shows the full name.
- The 3D pane (`5_scene_body_tints.png`) shows the base in its blue ink and
  the blade and pitch arm in green. Hovering and the sweep's colours still
  paint over them.
- With the body overlay on, a lit joint end's ring takes its body's ink, so
  the accent no longer marks the study's path on the DAG. The weight and the
  group border still mark it. That is the trade an overlay makes. With
  "None" it is the accent again.
