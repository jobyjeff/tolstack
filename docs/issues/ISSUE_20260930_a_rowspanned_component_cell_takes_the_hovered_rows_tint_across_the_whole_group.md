---
type: chore
priority: low
status: deferred
area: design
reporter: agent
found_by: docs/sessions/reviews/REVIEW_20260930_nav_tooltip_once_and_rail_hover_emphasis.md
class: unreviewed_design_debt
defer_until: 2026-10-31
---

# Design: the merged component cell wears a hovered row's tint across the whole group, so one hot row lights four rows of that column

`nav_tooltip_once_and_rail_hover_emphasis` (2026-09-30) paints the grid's hover
tint on the CELLS rather than on the row, for a good reason — a row already
carries the alternating band colour and an untraced row's provenance image, and
an opaque colour on the `<tr>` replaced one of them.

The rule is `topology.css`:

```
.tvrow--hot  > .tvcell { background-color: var(--tv-hot); }
.tvrow--lead > .tvcell { background-color: var(--tv-lead); }
```

A component group's merged cell (`componentCell`, `views/topology.js`) is a
`<td class="tvcell tvcell--component" rowspan="N">` and is a direct child of the
group's **first** `<tr>`. So it is a `.tvcell` of exactly one row and is drawn
over all N.

## Measured

Live `pitch_system`, hovering the first row of the four-row `thread_region`
group (Chrome, 1600x1000, the review's scratch projection):

| | |
|---|---|
| component cell at rest | `rgba(0, 0, 0, 0)` |
| component cell with that row `--lead` | `rgba(255, 255, 255, 0.125)` |
| the hovered row's own height | 26 px |
| the component cell's height | **104 px** (4 rows) |
| the three sibling rows' cells | `rgba(255, 255, 255, 0.055)` (`--hot`, from the shared rail) |

So the strong tint spills over four rows in one column, and the group's other
three rows carry the weak one — the column disagrees with the rows beside it
about which row the pointer is on. Hovering row 3 of the same group is the
mirror image: the component column takes whatever level row 1 has, never row 3's.

## Not a correctness defect

Nothing is wrong, nothing is lost, and the DAG beside it is unambiguous about
which edge is hovered. This is the "emphasis is a budget" rule
(`docs/DESIGN_TYPE_AND_COLOUR.md`) reading one notch louder than intended on one
cell: the hovered edge is supposed to be the loudest thing on the grid, and a
104 px block is louder than its own 26 px row.

## Shapes worth weighing

* Exclude the merged cell from the row tint
  (`.tvrow--hot > .tvcell:not(.tvcell--component)`), so the component column
  stays neutral and the group reads off its own rows. Cheapest; costs the
  hovered row a tinted first column.
* Tint the group's merged cell at `--tv-hot` whenever **any** row of the group
  is lit, never at `--tv-lead` — the cell is a statement about the group, so it
  takes the group's level.
* Leave it. It is visible in
  `docs/sessions/lessons/shots_20260930_nav_tooltip_and_rail_hover/3_grid_row_lights_its_bar.png`
  and reads as "this component's block" rather than as a defect.

Whatever is chosen needs a browser-tier assertion: no tier reads a
`.tvcell--component` background today, so any of the three ships silently.
