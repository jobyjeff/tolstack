---
type: bug
priority: low
status: resolved
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

## Resolved 2026-11-14 (the_page_is_a_fixed_layout_and_nothing_scrolls_the_document)

The shell now sizes the pane's region: with no width the reader dragged, the
pane opens at half of the middle (the window less the tree's column and the
grid's), so at 3840x2160 on v2 it measures 1200x2160 CSS px beside a
1211-px DAG region, and it starts at the window's top. The settings bar and
the grid moved to the column right of the DAG, so nothing is drawn over the
pane's top bar from the page. The measurements and shots are in the lesson,
`docs/sessions/lessons/LESSONS_20261112_the_page_is_a_fixed_layout_and_nothing_scrolls_the_document.md`.
