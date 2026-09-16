---
type: bug
priority: med
status: triaged
area: viewer/topology
reporter: agent
found_by: docs/sessions/HANDOFF_20260915_respine_tween_fidelity_round2.md
handoff: docs/sessions/HANDOFF_20260916_topology_grid_scroll_and_grips.md
---

# Every render of the topology pane throws away the reader's sideways scroll

## Measured

Browser tier, real `pitch_system`, viewport 1600×1000, the new scrolled arm in
`scripts/run_viewer_browser_tests.mjs`'s `testRespine`:

```
scrolled respine: scrollLeft 605 -> 0 -> 0 (pane content 1474 -> 1240px)
```

The reader scrolls `.tv__hscroll` to its right-hand end (605 of a possible
605), clicks a study, and is at the left edge again on the **first frame** of
the respine — and still there when it settles.

## Why

`VA.renderTopoPane` opens with `VA.clear(root)` and builds a fresh
`.tv__hscroll` every call. A brand-new element's `scrollLeft` is 0, so the
reader's horizontal position is not clamped, it is discarded.

**This is not the respine's doing.** Every render of this pane goes through the
same function, so the density toggle, the length-mode toggle, the leader-style
toggle and both drag widths all do it too — each of them a control whose whole
point is that it changes how the *same* rows are drawn. The respine only makes
it conspicuous, because it renders the pane sixteen times in 260ms.

It also falsifies, for this pane, the thing
`ISSUE_20260915_the_respine_is_unwitnessed_with_the_pane_scrolled_sideways`
went looking for: the browser's `scrollLeft` **clamp** cannot be felt as a
sideways jump when the DAG shrinks 316 → 82px, because there is no scroll left
for it to clamp by the time the width changes.

## What would close it

Carry `.tv__hscroll`'s `scrollLeft` across the rebuild — read it off the
outgoing pane before `VA.clear`, write it back after the new one is appended
(the browser clamps it to the new content width for free, which is the
behaviour the reader wants).

Two decisions that are not obvious and are why this is filed rather than fixed
inside `respine_tween_fidelity_round2`:

1. **which renders should keep it.** A render of a *different topology* is a
   different mechanism and plausibly starts at 0;
   `VA.lastTopoRender.topologyId` already carries what that test needs.
2. **the ghost.** Mid-respine the outgoing paint is re-parented into
   `.tv__ghost`, whose own `.tv__hscroll` is `overflow: hidden`. If the live
   pane is restored to a scrolled position and the ghost is not, the
   cross-fade shows two different horizontal windows of the same table on top
   of each other.

Pinned meanwhile: `testRespine`'s scrolled arm asserts `scrollLeft === 0` on
the in-flight frame and on the settled one, naming this issue, so fixing it
turns those two sub-checks red rather than leaving a stale claim standing.
