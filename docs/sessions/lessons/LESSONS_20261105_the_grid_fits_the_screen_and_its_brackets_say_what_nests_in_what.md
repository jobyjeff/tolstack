# LESSONS 2026-11-05: the_grid_fits_the_screen_and_its_brackets_say_what_nests_in_what

## What landed

- **Brackets.** `VA.gridBraces(plan, {study, foot})` in `apps/viewer/topology.js`
  is the model, and `VA.braceGeometry` in `views/topology.js` turns it into
  pixels. Each group is a pair of thin rounded caps: one over its first row,
  one under its last. The kinds are the study (kinematic or chain), each
  sub-stack (a depth-0 one is kinematic, a nested one is chain), and a rigid
  body that spans more than one part. A part boundary inside a group is a
  plain rule. The caps sit in an inert overlay (`div.tvbraces`) placed by row
  count. Every row is exactly `rowHeight` tall, so the overlay moves no
  leader seam. Row tints, dividers, the sub-stack rule and the red/magenta
  washes are gone, along with `VA.gridRowMarks` and the `--tv-divide-*` and
  `--tv-stack-rule*` tokens. The DAG still uses `--tv-body-*`.
- **PART | DESCRIPTION.** `VA.partColumns(part)` takes these from the part
  record. The number is the part-number token in its display name
  (`213668-002`, `215735-001/-002`, `NAS6403U11D`), falling back to its
  `drawing`. The description is the rest of the name. Each row has its own
  pair of cells, with the words on a part's first row only. So every row's
  part cell is clickable and selects that row. The old merged cell
  deliberately selected nothing.
- **One sourcing mark.** `VA.rowSourcingMark` → `VA.SOURCING_MARKS`, in
  precedence order: untraced, no citation, no value, inferred, no tolerance.
  The mark is the nav's own triangle (`VA.warningIcon`) in the state's
  colour, and a traced row has none. Its hover gives the state in one
  phrase. A term with no band is `no_value` whatever its edge's citation
  says. The kinematic gap card now opens from the mark. The legend lists
  every mark and "no mark: …", which also closes the routed legend issue.
  The criterion's BUDGET chip moved into the criterion cell.
- **No crop column.** The crop is the Preview's, as it already was.
- **One horizontal scroll.** `.tv__rails` is no longer `position: sticky`.
  The drawing, its leaders and the grid are one strip, so a sideways drag on
  the DAG moves all three together and nothing sits behind anything. The jog
  grip is now a plain content coordinate (`VA.jogGripInset` has no clamp). A
  study arrival never puts space to the drawing's left (`bandPad.left` is
  always 0). It scrolls sideways only when the band is off-screen.
- **Fit leaves the grid a floor.** `VA.dagFitWidth(pane)` = max(pane −
  (PART + DESCRIPTION + # + ELEMENT), 35% of pane).

## Decision not in the handoff's words: deliverable 6

The handoff reads "Dragging the DAG horizontally scrolls the grid with it,
and the grid may run behind the DAG canvas". Jeff's note reports the second
half as the bug: "it can even move behind the dag canvas". I built one
scroll that moves both together, with the grid **never** behind the DAG.
The browser checks assert that no DAG mark is past the grid's left edge at
any scroll (`dagPastGrid <= 1`).

## Brace geometry (`VA.GRID_BRACE`)

- inset 7px a side per level, so an outer bracket is 14px wider than the
  next one in;
- the curl (cap height) is `clamp(2, (rowHeight − 14)/2, 6)`: 6px at
  comfortable (26px rows) and 2px at compact. It stays in the space above
  and below a row's text, so a cap never runs through a word;
- caps from several groups on one edge step 2px apart, outermost outside;
- a row's first words start at `4 + cover × 7` px, where `cover` is how many
  brackets hold it (`model.cover`);
- hue per kind: `--group-kinematic/chain/body/part`, the DAG branch's token
  names. Until that branch lands they fall back to `--accent`, `--ink`,
  `--muted` and `--line`. No values are copied
  (`ISSUE_20261105_the_grid_and_dag_colour_branches_both_rewrite_…`).

## Width budget (px)

| column | before | now | why |
| --- | ---: | ---: | --- |
| component → part | 120 | 100 | `213668-002` inside four brackets' indent |
| description | — | 140 | `gas-spring piston body` |
| # | 38 | 30 | two digits |
| element | 210 | 220 | resizable, as before |
| nominal / min / max | 80 ×3 | 68 ×3 | `−32.185` at the meta size |
| sensitivity | 70 | 76 | `2.609375` |
| contribution | 170 | 200 | `+ 1.67 × −0.0835 … 0.0835 mm`; `±2.355 deg · RSS ±1.034` |
| sourcing | 260 | 30 | one 16px mark |
| crop | 110 | — | in the Preview |
| **total** | **1218** | **1000** | |

## What gives at narrow widths

Measured with the nav at 300 and the Preview at its 560 default.

- **3840 with the 3D pane (560) and the Preview open:** the pane is 2417px,
  the DAG 420 and the grid 1000. Everything is visible with no horizontal
  scroll, and every part, element and contribution cell is clickable (15/15
  with the folds open).
- **1600 with the Preview open, kinematic study:** the pane is 737. Fit
  takes the DAG to 246, so PART, DESCRIPTION, # and ELEMENT (490) are fully
  on screen and every part cell takes the click (6/6, browser-checked). The
  numbers and CONTRIBUTION are one sideways scroll away, and the DAG moves
  out of view with that scroll rather than covering anything.
- **Order of what gives:** first the DAG's fitted scale (down to 35% of the
  pane), then the strip scrolls sideways. No column hides and the Preview is
  not collapsed.
- **Whole walk at 1600:** it still opens at zoom 1 (a 678px DAG), leaving
  59px of PART at rest. Those cells are clickable, and Fit brings the rest
  in. Filed as `ISSUE_20261105_the_whole_walk_opens_at_zoom_1_…`
  (audience strategy).

## Shots

In `shots/the_grid_fits_the_screen_and_its_brackets_say_what_nests_in_what/`:
`before_kin_1600.png` (the grid as it was), `kin_1600_preview.png`,
`kin_1600_scrolled_sideways.png`, `kin_3840_3d.png`, `kin_3840_grid_crop.png`
(the brackets up close, folds open), `grip_1600.png`, `grip_3840_grid.png`,
`chain_3840_grid.png` and `walk_1600_fit.png`.

## Gotchas

- **The main-checkout edit guard blocks junctions into `data/inbox`**,
  because the target holds a tracked README, even when the junction lives in
  gitignored scratch. I copied `data/inbox`, `data/meshes` and
  `data/projections` (≈350 MB) into the worktree's
  `data/scratch/root/data/` instead, plus `docs/` (the worksheets are read
  from `--repo`). I rebuilt the six projections there from the **committed**
  tree: a dirty tree's stamp fails the `[real]` gate.
- **The DOM shim has no `firstChild`.** `sourcingCell` hangs the mark on
  `cell.mark` for the callers that wire a card to it.
- This repo's pytest has no xdist, so `-n 16` fails at argument parsing. Run
  it serially.
- Renaming a guard orphans its spec, and the spec's file name is derived
  from the guard's name. Delete the old spec and write the new name that
  `--unenrolled` prints. `scripts/guard_enumeration.mjs` pins the count and
  the name-set hash for each source.
