---
type: bug
priority: med
status: triaged
area: viewer/topology layout
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261104_the_browser_tier_reds_left_after_the_slide_re_author.md
strategy: docs/strategy/BRIEF_20261030_topology_layout_questions_the_redesign_left_open.md
resolution: strategy 2026-11-05: routed into HANDOFF_20261105_the_grid_fits_the_screen_and_its_brackets_say_what_nests_in_what (Jeff's note 20261105T164140_sm8hkc) | review 2026-11-06: routed link removed -- that handoff made every row clickable and the grid never slides under the rails, but the whole walk still opens with 59px of grid at rest (see the update below)
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

## Update 2026-11-06: what `the_grid_fits_the_screen_and_its_brackets_say_what_nests_in_what` changed, and what it left

Two of the three complaints above are gone. The question in the title is
still open.

- **Fixed: a grid row can be clicked.** The merged COMPONENT cell is now
  PART | DESCRIPTION, with a cell of each per row. Every part cell selects
  its own row, so the 59px at rest are 59px of clickable PART.
- **Fixed: columns no longer slide under the rails.** `.tv__rails` is no
  longer sticky. The drawing, its leaders and the grid are one horizontal
  scroll, so a sideways scroll brings ELEMENT and the numbers in and takes
  the DAG out, and nothing sits behind anything.
- **Left: the whole walk opens at zoom 1.** On the product graph at
  1600×1000 with the Preview open, the DAG is still 678px in a 737px pane.
  Fit (the control, or `0`) now leaves the grid a floor (`VA.dagFitWidth`:
  PART + DESCRIPTION + # + ELEMENT, down to 35% of the pane) and takes the
  rails to 131px (`walk_1600_fit.png`, in that handoff's lesson shots).
  Nothing applies that floor until the reader asks. A study's arrival
  doesn't apply it either: the arrival measures off the outgoing layout, and
  applying the floor there ratcheted the zoom down on every study change
  (that handoff's lesson).

The design question is now whether the whole walk should open fitted the
way a study arrival is framed:

- **Option 1, recommended.** Run the floor once on a topology's first
  paint, scale-down only, and decide whether arrivals should get it too.
  That needs the landing to measure the incoming layout, not the outgoing
  one. The browser tier's zoom checks assume zoom 1 at boot and would need
  re-measuring.
- **Option 2.** Leave it as it is: the whole walk is a map, and Fit is one
  key away.

## Update 2026-11-06: the blocks close the slit

Measured by
`a_part_with_many_interfaces_is_drawn_as_a_component_with_pins`'s round-1
rework. The projection was built from that branch merged with `integration`
(`94087400`), at 1600×1000 with the Preview open. The pane was 737px wide
both ways.

| page | drawing | `svg.tv__rails` | grid table's left edge | part cells in the pane |
| --- | --- | ---: | ---: | ---: |
| whole walk | rails | 678 | 979 | 0/99 |
| whole walk | blocks | 870 | 1171 | 0/99 |
| kinematic | rails | 310 | 611 | 6/6 |
| kinematic | blocks | 404 | 705 | 6/6 |
| cotter hole | rails | 336 | 637 | 7/7 |
| cotter hole | blocks | 528 | 829 | 7/7 |

The pane's right edge is at 1038:
- **On the rails**, the whole walk opens with 59 px of grid at rest.
- **With blocks** (the page's default since 2026-11-06), the strip beside the
  spine adds the widest block plus a gutter, 192 px on this walk. The grid
  then starts 133 px past the pane's edge, and the walk opens with no grid on
  screen at all.
- **The studies** keep every part cell in the pane on both drawings.

On the rails, the whole walk counts 0/99 although 59 px of each part cell
shows. The count asks for the whole cell inside the pane. The browser tier's "parts as
blocks" suite now holds the study pages' part cells at 1600, and holds no
number or part cell clipped on all three pages. It does not hold the whole
walk's part cells, because they are outside the pane on the rails too.

Option 1 above (fit the whole walk on its first paint) would fix both
drawings, and blocks make it more pressing.
