---
type: chore
priority: low
status: open
area: viewer/topology
reporter: agent
found_by: docs/sessions/HANDOFF_20260915_respine_tween_fidelity.md
---

# The respine is unwitnessed with `.tv__hscroll` scrolled sideways

## What is unchecked

Every respine check in both tiers runs with the pane's horizontal scroll at
zero. The browser tier's in-flight probe asserts
`live.scrollLeft === 0` as a *precondition* for its box measurements
(`scripts/run_viewer_browser_tests.mjs`, `testRespine`'s `catchFrame`), so it
states the gap rather than covering it.

## Why it is worth a check now

Before 2026-09-15 the horizontal part of a respine was a CSS transform on a
block of constant width, so the pane's own **content width never changed during
a transition**. Since `VA.respineX` it does: the SVG is drawn at the interpolated
pane width, which grows 82 → 316px on the real `pitch_system` over a deselect
and shrinks over a select. Two things follow that nothing measures:

- a browser **clamps `scrollLeft`** when content shrinks, so a reader scrolled
  to the right end of the grid may see the pane jump horizontally partway
  through a select;
- `.tv__rails { position: sticky; left: 0 }` should keep the DAG pinned to the
  visible left edge throughout, which is what makes "nothing is drawn left of
  the pane" hold for a scrolled pane too — by construction, but unasserted.

## Repro shape

In `testRespine`, before the study click: scroll the pane to its right end
(`live.scrollLeft = live.scrollWidth`), then catch a frame and take the same
`dagLeft` / `dagPastGrid` boxes, plus `scrollLeft` before and after the
transition. Neither the fixture tier nor the DOM shim can do this — there is no
layout to scroll — so it belongs in the browser tier only.
