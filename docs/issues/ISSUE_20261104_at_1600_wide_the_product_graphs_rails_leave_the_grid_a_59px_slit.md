---
type: bug
priority: med
status: triaged
area: viewer/topology layout
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261104_the_browser_tier_reds_left_after_the_slide_re_author.md
strategy: docs/strategy/BRIEF_20261030_topology_layout_questions_the_redesign_left_open.md
resolution: triage 2026-11-05: folded into the layout brief as an addendum (Q7/Q8) rather than a new brief
---

# At 1600×1000 the product graph's rails leave the grid a 59px slit, and no grid row can be clicked

Measured 2026-11-04 on a projection built from `integration` (`297e0525`), at
`apps/viewer/topology.html` with the default Preview pane open, viewport
1600×1000 (the browser tier's own size):

- `.tv__hscroll` is 737px wide. `svg.tv__rails` is 678px of it: the DAG plus
  its jog zone. The rails were 606px on 2026-11-02. `6d23015d`
  (each_stop_is_its_own_stack) took them to 672px and the slide merge
  `682a89b6` took them to 678px.
- That leaves **59px** of grid beside the rails. The only cell there is the
  merged COMPONENT cell, and its click deliberately selects nothing
  (`componentCell`, `views/topology.js`).
- Scrolling the grid sideways doesn't help much. The rails are
  `position: sticky; left: 0` (by design, `topology.css` `.tv__rails`), so the
  columns slide *under* them and the reader sees a 59px window moving along
  the row.

Shots: `docs/sessions/lessons/shots/browser_tier_reds_1104/grid_slit_at_rest.png`
(at rest) and `grid_under_rails_scrolled.png` (scrolled to the ELEMENT column).

So at that size a reader can't read the ELEMENT or NOMINAL columns, and
can't select a row from the grid at all. They have to use the DAG's marks or
first drag the Preview pane narrower. `VA.jogGripInset`'s comment already
covers the "DAG wider than the pane shows" case, but as something a reader
reaches by dragging, not as the page's resting layout.

**Why this is strategy, not a fix.** The choice is about layout: how much of
the pane the rails may take before something gives. The options:

1. A floor on the grid's share. The jog zone shrinks, or the Preview starts
   narrower, until the grid shows at least COMPONENT + # + ELEMENT. This is
   the recommendation, because it keeps the sticky-rails rule intact.
2. The rails stop being sticky when they're wider than some fraction of the
   pane.
3. Accept it, and treat 1600px as below the supported width.

The browser tier no longer trips on this: `clearPoint` scrolls the grid the
way a reader would (`the_browser_tier_reds_left_after_the_slide_re_author`).
So nothing red will bring it back.
