---
type: feature
priority: med
status: open
area: viewer/grid
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261108_the_dag_and_grid_nest_coloured_bodies_and_compact_means_denser_rows.md
---

# The grid prints a part's number twice, and the brackets' label gutter costs 152px

The 2026-11-08 handoff asked for each part's bracket to be labelled with its number,
in a gutter left of the PART column, with the PART and DESCRIPTION cells keeping
their text. Both are now on screen, side by side: `214373-002 214373-002 propeller hub`.
The gutter (a body strip of 84px plus a part strip of 68px, `BRACE_STRIPS` in
`apps/viewer/views/topology.js`) widens the PART column from 112px to 264px, so at
1600 wide with the Preview open the grid shows only PART and DESCRIPTION until the
reader scrolls or presses Fit.

Options, for a strategy session to pick:
1. **(recommended)** Drop the number from the PART cell when the part's bracket is
   labelled, and narrow the column back by the part strip. One fact, said once, in the bracket.
2. Keep both and put the part label on the bracket's top cap, like a fieldset legend,
   so no part strip is needed.
3. Leave it as is.

Shots: `docs/sessions/lessons/shots/the_dag_and_grid_nest_coloured_bodies_and_compact_means_denser_rows/v2_default_2560.png`.
