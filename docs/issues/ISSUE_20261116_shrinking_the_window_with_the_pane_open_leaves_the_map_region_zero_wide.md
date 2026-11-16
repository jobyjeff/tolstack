---
type: bug
priority: med
status: open
area: viewer/layout
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261115_the_walk_reads_the_map_and_the_binding_flow_on_the_merged_page.md
---

# Shrinking the window with the 3D pane open leaves the map's region 0 px wide

**Seen on the merged page** (`integration` `61f78e19`, served by
`tests/debug_walk_merged_page_20261114.mjs`, 2026-11-16 walk).

1. Open v2 at 5120×2160 in **Side by side** (the pane's 3D view takes
   1190 px, the region 2481 px).
2. Resize the window to 1920×1080 without reloading.
3. `#topopane` measures **x 1490, width 0**: the 3D view keeps its pixel width,
   the map is gone, and the grid runs off the right edge ("Expand…" and the
   dimension columns are cut).

Reloading at 1920 gives the expected layout (region 485 px, the map as a
thumbnail). So the stored or live pane width is not re-clamped when the window
shrinks. This is what a person sees when they drag the browser from the wide
monitor to the laptop screen.

Shots: `docs/sessions/lessons/shots/the_walk_reads_the_map_and_the_binding_flow_on_the_merged_page/06_side_by_side_1920.png`
(after the shrink) and `06b_side_by_side_1920_reloaded.png` (after a reload).

Expected: on a window resize, the pane, the region and the grid column are
re-clamped as they are on load, so no region drops below its minimum.
