# Lessons — a_window_resize_reclamps_the_pane_and_the_map

## Where the clamp lives

The page has two widths that can starve the map's region (`#topopane`):

- **The 3D view** (`#annotate-flyout`, `state.flyoutWidth`): clamped by
  `VA.clampFlyoutWidth` against `roomBesideFlyout()` / `graphNeed()` at boot,
  on every open (`launchAnnotateNow`) and on a page change (`refitPane`) —
  **never on a window resize.** That was the bug: it kept its 5120-wide pixel
  width at 1920 and the region went 0 px wide.
- **The grid's column** (`#topomain`, `state.sideWidth`, `applyPaneWidth`): the
  resize handler already re-applied it.

Fix: the handler in `topology_app.js` (the debounced `resize` listener) now
calls `refitPane()` after `applyPaneWidth()` while the 3D view is open. Order
matters — `roomBesideFlyout()` reads the grid column's width.
`refitPane` re-clamps from the width the reader *chose* (`flyoutWanted`), so a
window that grows again gives the width back, and nothing is remembered.

## Modes covered

- Side by side (`both`): checked, 5120 -> 1920 gives region 485 / 3D 473, equal
  to a fresh load (before: region 0, 3D 1829).
- DAG and 3D views: not separately driven in the browser. Both go through the
  same `refitPane` (DAG hides the flyout's share, 3D hides the region); a 3D-only
  view has no region to starve. Not browser-checked.
- Nav width (`applyNavWidth`) and the grid column's own width have their clamp
  against `window.innerWidth` already (the handler re-applies the latter; the
  nav's is applied at boot only and capped by CSS) — not touched.
- Pane closed: untouched; the next open clamps as before.

## Shots

`shots/a_window_resize_reclamps_the_pane_and_the_map/before_1920_after_shrink.png`
(fix reverted) and `after_1920_after_shrink.png`.

## Notes

- The check lives in its **own suite**, not `the map (...)`: that suite aborts
  at the hub hover sub-check on the current tree (owned by
  `the_model_drawn_alone_and_led_hub_hover_check_goes_green`), so a check
  appended there would never run.
- Guard enrollment: one spec (the shrink check). The other two guards in the
  suite (the 5120 precondition, nothing-threw) and the skipped-branch guard are
  unenrolled; the browser pin was raised 898 -> 902 / 867 -> 871 for them.
