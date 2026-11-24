---
type: bug
priority: med
status: open
area: viewer/nav
reporter: agent
found_by: docs/sessions/HANDOFF_20261122_the_tree_sits_beside_the_3d_canvas_and_holds_still.md
---

# A tree rebuild between a press and its release drops the click

The shell's structure tree is rebuilt whole on every paint, write and pane
message (`apps/viewer/topology_app.js`, `renderNav`). Since 2026-11-22 the
rebuild keeps the row under the pointer where it was, so nothing *moves* --
but the row is a new element. A press on a twisty or a row whose release
lands after a rebuild has no `click`: the press is on the old node, the
release on the new one.

Measured while writing the browser suite "the tree holds still": in the
first ~10 s after the 3D pane opens, the pane redraws the column several
times a second (its bodies anchoring), and 1 run in 4 lost the second of
two twisty presses 450 ms apart. The suite now waits for two quiet seconds
before it presses anything; a reader does not.

Repro: open v2 with the 3D pane, and in the first seconds after it loads
open and close a part's twisty quickly; now and then a press does nothing.

Fix shapes, for whoever takes it: patch the rows in place instead of
rebuilding (the plan, `VA.navPlan`, already says which rows exist), or skip a
rebuild while a pointer button is down over the column and run it on
release.

## Addendum 2026-11-23 (review) -- the ease has the same cause

Read from the code, not measured: `easeHeight` (`topology_app.js`) tweens the
`[data-nav-under]` element it found when the fold was pressed. A rebuild that lands
during the 140 ms ease replaces that element; the tween goes on driving the detached
one, and the new one is drawn at its full height until the close's `done()` repaints.
In the pane's first ~10 s, when it redraws the column several times a second, a close
can show as open-snap-closed. Patching rows in place (the fix shape above) fixes both.
