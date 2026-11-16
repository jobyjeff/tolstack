---
priority: med
depends_on: []
model: sonnet
hitl: false
---

# HANDOFF 2026-11-16 — a_window_resize_reclamps_the_pane_and_the_map: shrinking the window never leaves the map 0 px wide

Source: `docs/issues/ISSUE_20261116_shrinking_the_window_with_the_pane_open_leaves_the_map_region_zero_wide.md`
(med; seen on the 2026-11-16 walk of the merged page), staged by the
2026-11-16 triage sweep. Baseline: tolstack master `d8085ece`. Scope: the
viewer's pane/region layout code under `apps/viewer/` and its browser suite.
Do NOT touch the map's drawing (`VA.mapLayout`), the
`the_model_drawn_alone_and_led_hub_hover_check_goes_green` handoff's suite, or
anything in `docs/topologies/`.

## Deliverables

1. **Re-clamp on resize exactly as on load.** Reproduction: open v2 at
   5120×2160 in **Side by side** (3D view 1190 px, region 2481 px), resize to
   1920×1080 without reloading → `#topopane` measures **x 1490, width 0**: the
   3D view keeps its pixel width, the map is gone, and the grid runs off the
   right edge ("Expand…" and the dimension columns cut). Reloading at 1920
   gives the expected layout (region 485 px, the map as a thumbnail). So the
   stored or live pane width is not re-clamped on a window resize. On `resize`,
   run the same clamp the load path runs, for the pane, the region and the grid
   column, so no region drops below its minimum. Sites this reaches: every
   layout mode that has a stored pane width (Side by side and any other that
   persists a width) — name each in the lesson and which you checked.
   Shots of the bug: `docs/sessions/lessons/shots/the_walk_reads_the_map_and_the_binding_flow_on_the_merged_page/06_side_by_side_1920.png`
   and `06b_side_by_side_1920_reloaded.png`.

## Definition of done

- A browser-suite check (run with the browser runner's `--only "<suite>"`)
  that opens at 5120×2160 Side by side, resizes to 1920×1080, and asserts the
  region's width equals the width a fresh load at 1920 gives (±2 px) and the
  map is visible.
- tolstack default tier green (`venv-win/Scripts/python.exe -m pytest -q`).
- A before/after shot pair at 1920 after the shrink, in the lesson's shots dir.
- Lesson (`docs/sessions/lessons/LESSONS_20261116_a_window_resize_reclamps_the_pane_and_the_map.md`):
  where the clamp lives and which modes it covers.
