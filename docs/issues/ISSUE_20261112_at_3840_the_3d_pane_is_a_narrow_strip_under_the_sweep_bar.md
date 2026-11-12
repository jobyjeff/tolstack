---
type: bug
priority: low
status: open
area: viewer/layout
reporter: agent
audience: strategy
found_by: docs/sessions/active/HANDOFF_20261111_the_pane_follows_the_one_selection_both_ways.md
---

# At 3840×2160 the 3D pane is a narrow strip, its top under the sweep bar

The end-stop model v2 was opened at 3840×2160 with the pane open on the P2
sweep. In every shot of
`docs/sessions/lessons/shots/the_pane_follows_the_one_selection_both_ways/`
the 3D pane sits between the nav (≈300px) and the DAG, and it is only about
560 device px wide (≈290 CSS px in the 2000px-wide downscale). The sweep bar
(run picker, transport, readout) covers the top ~230px of the pane, and the
DAG and grid leave half the window empty to their right.

This is the page's fixed layout, which the handoff fenced off as F1c (the
next step on the strategy thread's tolstack chain, not yet staged). It is
filed here so F1c has a measured case. Related but not the same issue:
`ISSUE_20261026_with_the_3d_pane_open_at_1600_the_page_column_is_too_narrow_to_read.md`
(the page column, at 1600).

Repro: `node tests/debug_one_selection_both_ways_20261112.mjs --phase topology`,
then look at `c2_grid_row_selected_after.png`.
