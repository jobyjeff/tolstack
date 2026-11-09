# LESSONS 2026-11-08 — the DAG and grid nest coloured bodies, and Compact means denser rows

Handoff: `docs/sessions/active/HANDOFF_20261108_the_dag_and_grid_nest_coloured_bodies_and_compact_means_denser_rows.md`.

## What landed

- **Zebra bands deleted.** `VA.leaderBands`, `VA.rowBandParity`, the `bands`
  output of `VA.leaderGeometry` with its polygon helpers, `.rail__band*`,
  `--tv-band-a/b` and their comment block are gone. Five tests and three browser
  checks that asserted bands now assert there are none. The three of those with
  specs were re-keyed under their new names.
- **One ink per body, by default.** `Colour by` defaults to Body, `Group fill`
  to Parts, and `Palette` is a new setting with two values, Bold and
  Colour-blind. The store key moved to `tolstack.viewer.dagView.2`: the entry
  stores every setting whenever any one changes, so an old "None" would otherwise
  have outlived the new default. A body's ink (`.tv__fill--tN` → `--fill-ink`)
  colours its DAG field, bridge and name, its parts' fields, blocks and names (a
  62% mix with white), its grid brackets and labels, and its rows under Colour by
  Body. The rows use a 7% cell *image*, so the hover tint, a cell *colour*, layers
  under it.
- **Two nested layers, always.** Every part is an inner labelled container, and
  so is a block. Parts off now hides blocks too; the old rule drew them
  regardless. The grid brackets every body and every part, a one-part body
  included. The old part rules are gone. Labels sit in a gutter at the PART
  column's left: the body's name wraps down its rows, and the part's number sits
  on its first row.
- **Compact = 18px rows, nothing else.** `VA.RAIL_METRICS.drawPitch` (26, never
  moved) sizes the joint ring (`VA.jointNodeTargetR`, in
  `apps/viewer/interface_glyphs.js`), the joint glyph and a block's width. Before
  this change, all three were read off `rowHeight`. Those three are what Compact
  decoupled. The fork curves, block heights and bar floors stay row-relative,
  because they are vertical.

## The decision not in the handoff: a label band above each body

"A label never sits on a glyph" could not be met by placement alone: at 18px rows,
the first row's glyph reaches the field's top edge. So `VA.rowPositions` now
leaves a **gap** before the slot of each body field's first row. The gap is
`VA.CONTAINER_LABEL.room` = 14px, and `VA.containerLabelRoom` computes it. A
block's first pin gets a top-up only where the pitch is short. The gap goes
*before* the slot, so bar lengths in the scaled modes are untouched. Body fields
reach up over their band through `field(…, band)` in `railGeometry`, and a study
group reaches over the body's band too.

**Part fields got bands too at first, and that was a mistake.** The product walk
grew so much that the grid, centred against it, moved away from its dots. At
1600×1000 a centred row's two dots sat 35–263px above the viewport, so the seam
leaders had nothing to draw from. The browser tier's seam suite caught it. So a
part field now names itself *beside* its first mark (`CONTAINER_LABEL.beside`).
A part field is one or two columns of its body, at least 80px wide, so the label
fits there without a band.

Costs, measured:

- The product walk is taller. `VA.DAG_ZOOM.min` went from 0.12 to 0.08: at 0.1,
  Fit under tolerance width was clamped below the page's pinned bars.
- README's re-derived numbers moved:
  - max jog: 2041 → 1014 became 2321 → 1147;
  - walk `gridOffset`: 1027 → 715 became 1174 → 743.
- Every rowPositions test now adds the bands, through one test helper,
  `labelBands`.

## Things the browser tier made me change

- **The grid's label strips take no pointer.** They lie over the PART cells, and
  with `pointer-events: auto`, meant for their tooltip, 0 of 6 part cells took a
  click. A clipped part label is read in full on the PART cell's own title.
- **No overlay key under Colour by Body or Part.** With Body as the default, the
  key showed up on every page. It added a toolbar line that pushed the pinned
  header down, and that was enough to break the pinned-header and 3D-reserve
  checks. Every container already names its body in its ink, so the key only
  repeated those names. Schemes whose colours carry words (interface,
  sourcing, contribution) keep their key.
- **The browser runner seeded the old store key**
  (`tolstack.viewer.dagView`). Its "start on the rails" setup silently stopped
  applying, and the rails suites drew blocks.
- **Zoom-1 assumptions in the checks.** The PART column is now 152px wider, and
  Fit leaves the grid its PART..ELEMENT floor, so pages land below zoom 1. Two
  in-page measurements now divide by `lastTopoRender.zoom`. Hovers aim at a
  PART cell's visible start, not at a NOMINAL cell that is now off-screen. A
  locator hover of a cell that does not wholly fit beside the 3D pane scrolls
  the strip sideways and takes the lit dots out of the DAG's view.

## Palettes and the contrast each ink holds (against `--bg` #16181d)

Bold, slots 0–15: #636efa 4.3, #00cc96 8.5, #ffa15a 8.9, #ab63fa 5.0, #19d3f3 9.9,
#ff6692 6.4, #b6e880 12.6, #fecb52 11.7, #ef553b 5.1, #ff97ff 9.4, #bcbd22 8.8,
#c49c94 7.2, #9edae5 11.5, #f7b6d2 10.6, #dbdb8d 12.3, #c5b0d5 8.9.

Colour-blind, slots 0–7, with Bold's 8–15 after them: #e69f00 7.9, #56b4e9 7.7,
#009e73 5.2, #f0e442 13.4, #0072b2 3.4, #d55e00 4.6, #cc79a7 5.8, and #bbbbbb 9.3.
The grey stands in for Okabe–Ito's black, which is invisible on this page.

Every ink clears 3:1. The part tint is 16% (`--tv-part-tint`) and the body fill
under "All groups" is 7%; both were judged on the page.

The 3D tint is not this handoff's (M2). It reads the same tokens, so it picks up
the new Bold values, but it does not follow a palette switch. That is filed as
`ISSUE_20261108_the_3d_body_tint_does_not_follow_the_palette_switch.md`.

## The shots (`shots/the_dag_and_grid_nest_coloured_bodies_and_compact_means_denser_rows/`)

Each shot was taken through the page's own controls from an empty store, from
projections built from this tree (below).

- `before_v2_default_1600` — baseline: near-white containers, 24 bands, blocks unlabelled.
- `v2_default_1600/2560` — five bodies in five inks. Body names sit in their bands, part numbers inside their containers, and the grid brackets and labels match the DAG.
- `v2_compact_1600/2560` — rows packed to 18px. Glyphs, block widths, labels and the 20px column pitch are unchanged; the grid text is at `--t-dense`.
- `v2_colourblind_1600/2560` — the same page in Okabe–Ito orange, sky, green, yellow and blue.
- `v2_parts_off_1600/2560` — no part field, block, part name or part bracket. The pins and bars stay, and so do the body outlines.
- `v2_bodies_off_1600/2560` — no body field, bridge, name or bracket. The parts keep their inks.
- `v2_both_off_1600/2560` — only rails, nodes and bars, and no bracket in the grid.
- `v1_default_1600/2560` — 13 bodies in 13 inks. Its chain-study names still overprint each other; that was already true before this change and is filed.

Counts printed by `tests/debug_nested_bodies_shots.mjs`:

| | bands | DAG body | DAG part | grid brackets body / part |
| --- | ---: | ---: | ---: | ---: |
| v2 | 0 | 5 | 12 | 10 / 36 |
| v1 | 0 | 19 | 38 | 38 / 122 |

In every Groups-off state the count of that kind is 0. Pitch is 20 at both
densities, dot r is 7 at both, and rows are 26 and 18.

## What the click-around found that the handoff did not ask about

- The grid prints a part's number twice: in the bracket's label, then again in the
  PART cell. The gutter also costs 152px, so at 1600 only PART and DESCRIPTION
  show. Filed for strategy, with a recommendation:
  `ISSUE_20261108_the_grid_prints_a_parts_number_twice_and_its_label_gutter_costs_152px.md`.
- v1's chain-study names overprint each other. This was already true before the
  change: `ISSUE_20261108_v1_chain_study_names_overprint_each_other_on_the_dag.md`.
- With Bodies off, a part's bracket moves left to its level's inset, and the empty
  body strip disappears with it. That reads correctly.
- A one-column part field was too narrow to name itself ("214…"). Part fields are
  now at least `minWidth` (80px), and their body widens to hold them. Blocks have
  the same floor.

## Gotchas

- **The main checkout is on `master`, which lacks the v2 end-stop changes
  `integration` has.** Its projections (rebuilt this session with
  `scripts/rebuild_projections.ps1`, every stamp `master @ c0ae9b7f`) do not
  pair with this tree: they still show v2 with eight bodies. Every `[real]` run
  and every shot here read a scratch root instead:
  `data/scratch/nested_bodies/repo`. That root is a copy of the projections, with
  `inbox` and `meshes` junctioned in, the worktree's `docs` junctioned, and all
  seven builders run with `--data-root … --allow-older-tree` **from a committed
  tree**. A dirty tree's stamp is refused.
- `getAttribute("open")` on an open `<details>` is `""`, which is falsy. Compare
  it with `null`.
- A guard name built with `${…}` cannot be enrolled. The per-model checks run in
  a loop and push four literal names afterwards.

## Verification record

See "Re-run" below for the final numbers; this section is filled in by the
final run.
