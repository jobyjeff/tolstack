---
type: bug
priority: med
status: open
area: viewer/browser tier (the DAG zoom suite)
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261103_the_kinematic_grid_is_a_stack_of_sub_stacks.md
---

# The first-row zoom check wheels above the drawing, so it never zooms

**Where:** `scripts/run_viewer_browser_tests.mjs`, suite "the DAG zoom, Fit
and the grid header", sub-check `[real] at scroll 0 the DAG's first row is
whole under the pinned bars -- nothing of it is cut off by the drawing's own
edge or sits under the bars -- at Fit, at the wheel's maximum and back`.

**What happens:** the check aims its 14 wheel steps at
`y = max(pinnedBottom + 60, 200)`. On a projection built from integration
`8d8baf7a`, the kinematic page's drawing starts at y = 269 (pinned bars end
at 139), so the aim is 69px above the drawing. The wheel reaches no DAG, and
the zoom stays at Fit:

    first row at scroll 0: fit 0.55 22.5px, max 0.55 22.5px, pinned bars end at 139, drawing starts at 269

Its first conjunct, `maxTop.zoom > fitTop.zoom + 0.5`, is false, so the check
is red. This was measured on integration's own viewer code and runner
(`git checkout integration -- apps/viewer scripts/run_viewer_browser_tests.mjs`)
against that projection, and the same is red on the kinematic-grid branch's
rework. The review of that branch saw it green on `0816cccf`. The drawing's
top has moved down since then, which this check reads but does not aim by.

**Fix shape:** aim from the drawing's own box, for example
`y = Math.max(pinnedBottom, svg.top) + 60`, not from a fixed 200. Then
re-witness the check's spec, if it has one.
