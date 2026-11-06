---
type: feature
priority: low
status: open
area: viewer/topology layout
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261105_the_grid_fits_the_screen_and_its_brackets_say_what_nests_in_what.md
---

# The whole walk opens at zoom 1, so at 1600 wide the grid starts 59px from the pane's edge until Fit

`the_grid_fits_the_screen_and_its_brackets_say_what_nests_in_what` made the
rails scroll with the grid, cut the grid to 1000px, and gave Fit (the control,
or `0`) a floor: `VA.dagFitWidth` shrinks the DAG so that PART, DESCRIPTION, #
and ELEMENT fit beside it, down to 35% of the pane. A study's arrival does
**not** apply that floor. It measures off the outgoing layout, and applying the
floor there ratcheted the zoom down on every study change (that handoff's
lesson). So an arrival still fits only the pane.

On the kinematic study at 1600×1000 with the Preview open, that is enough on
arrival: the DAG is 310 wide, PART, DESCRIPTION and # are on screen, and every
part cell takes the click. The whole walk with no study selected opens at
zoom 1, with no Fit. On the product graph that is a 678px DAG in a 737px pane,
which leaves 59px of PART column at rest. Those cells are clickable now, each
selecting its own row, and a sideways scroll or Fit brings the rest in. Fit
takes the rails to 131px there (`walk_1600_fit.png` in that lesson's shots).

The design question is whether the whole walk should open fitted the way a
study arrival is framed.

- **Option 1, recommended.** Run the floor once on a topology's first paint,
  scale-down only, and decide whether arrivals should get it too. That needs
  the landing to measure the incoming layout rather than the outgoing one.
  The browser tier's zoom checks assume zoom 1 at boot and would need
  re-measuring.
- **Option 2.** Leave it as it is: the whole walk is a map, and Fit is one key.
