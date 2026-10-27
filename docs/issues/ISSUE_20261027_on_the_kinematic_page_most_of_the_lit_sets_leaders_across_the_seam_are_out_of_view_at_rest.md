---
type: feature
priority: med
status: open
area: viewer/leaders across the seam
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261026_leaders_follow_the_active_study_across_the_seam.md
---

# On the kinematic page most of the lit set's leaders across the seam are out of view at rest

The handoff's definition of done expected six to ten DAG↔3D leaders on P2's
kinematic study at 1600×1000 with the rest of the model dimmed. Measured by the
browser tier's `leaders across the seam (…)` suite on run
`vpa-pitch-p2-20261016-235852`:

| state | lit nodes | anchor `null` | dot out of the DAG box's view | anchor below the window | leaders drawn |
|---|---:|---:|---:|---:|---:|
| dimmed, at rest | 19 | 3 | 13 | 0 | **3** |
| hidden | 19 | 3 | 5 | 2 | **9** |

> **Correction, 2026-10-27.** The hidden row depends on where the box was
> left scrolled: the review read 11. Read with the page and the box both at
> their top (the browser check's pinned state), it is 3 `null`, 7 out of the
> box's view, 0 below the window, **9 drawn**.

Both causes are layout, not the leaders:

1. **The DAG box is bounded and opens on the grid.** The kinematic page's DAG
   is a 500 px scroll box (`.tv__scroll--bounded`) over a walk about 2,800 px
   tall, scrolled so the grid of lit rows is at its top (`scrollToGrid`). The
   lit set's nodes are spread across the whole walk, so most of their dots are
   scrolled out of the box. A dot out of view gets no leader, by rule (a leader
   to a point the reader cannot see is a line to nowhere). With the rest hidden
   the walk re-lays to the lit part, and nine fit.
2. **The scene's frame runs past the window's bottom at rest.** With the page
   scrolled to the top, the kinematic head pushes the sticky scene column down
   (its frame was at y 233 to 1136 in a 1000 px window), so anchors in the
   lowest ~140 px of the frame are off screen. Two pitch-arm anchors were.

## Options

- (a) **Leave it.** The leaders follow what is on screen; scrolling the box
  brings the rest. The hide toggle is the "show me the whole study" gesture.
- (b) **Open the box on the lit set's DAG span**, not on the grid, when the
  scene is open — the leaders' DAG ends then come first.
- (c) **Draw an off-view dot's leader to the box's edge** with an arrowhead
  that says "above" or "below". Breaks the "no stub" rule's spirit.
- (d) **Default the unlit style to hide while the scene is open.**

Recommendation: (d) or (b). (d) is one line and already measured (nine
leaders, inside the expected range); (b) keeps the dimmed context but needs a
scroll rule that competes with `scrollToGrid`.
