---
type: bug
priority: med
status: triaged
area: viewer/topology
reporter: agent
found_by: docs/sessions/HANDOFF_20260915_respine_tween_fidelity_round2.md
handoff: docs/sessions/HANDOFF_20260916_topology_grid_scroll_and_grips.md
---

# The sticky rails stop sticking once the grid is scrolled past the DAG's own width

## The claim, and where it is written

`apps/viewer/topology.css`:

```css
/* The rails stay put when the grid is scrolled sideways: a six-column grid is
   wider than the pane, and rails that scrolled off the left would leave the
   rows they align with pointing at nothing. */
.tv__rails {
  flex: none; display: block; position: sticky; left: 0; z-index: 1;
```

## Measured

Browser tier, real `pitch_system`, viewport 1600×1000, the new scrolled arm in
`scripts/run_viewer_browser_tests.mjs`'s `testRespine`:

```
sticky holds to scrollLeft 553 of 605; at the far end the DAG is -41.5px
from the pane's left edge
```

The pane is 869px wide, the walk's DAG 316px. The rails hold against the
pane's visible left edge for the first 553px of scroll and then slide off it,
41.5px at the far end. At that point the leftmost rail and the grid rows it
aligns with are the two things the comment above says must never come apart.

## Why

A sticky box is bounded by its **containing block**, which here is `.tv__body`
— and `.tv__body` is the pane's own width, not its content's. The grid table
overflows out of `.tv__rows` (`flex: 1 1 auto; min-width: 0`) rather than
widening the flex row, so `.tv__body` measures 869px while the pane's
`scrollWidth` is 1474px. The SVG can therefore be pushed right by at most
`paneWidth − dagWidth` = 553px; the remaining 52px of scroll drags it away.

The gap scales with how much wider the grid is than the pane, so it is worse
on a narrow window and worse on a topology with more grid columns — and
invisible in every check the repo had, all of which measure at `scrollLeft` 0.

## What would close it

Give the sticky a containing block as wide as the content it is sticking
across: `.tv__body { width: max-content }` (with `.tv__rows` sized to the table
rather than to the flex line) is the shape, but it is a change to how the whole
pane lays out — the grid's own overflow, the header's `padding-left` seam and
the `.tv__ghost` overlay all read off that box — so it wants measuring, not a
one-line patch. Out of scope for `respine_tween_fidelity_round2`, whose fence
is the respine and whose file list does not include `topology.css`.

Pinned meanwhile: `testRespine` asserts **both** halves — that the DAG is
pinned at a scroll within `paneWidth − dagWidth`, and that it is *not* past
that — so a fix turns the second sub-check red and the claim gets rewritten
rather than quietly outliving the behaviour.
