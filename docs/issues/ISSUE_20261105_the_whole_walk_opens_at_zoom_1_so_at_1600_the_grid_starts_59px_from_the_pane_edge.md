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
rails scroll with the grid, cut the grid to 1000px, and gave Fit a floor:
`VA.dagFitWidth` shrinks the DAG so that PART, DESCRIPTION, # and ELEMENT fit
beside it, down to 35% of the pane. A study or kinematic arrival frames
through that rule, so at 1600×1000 with the Preview open every part and
element cell is on screen. Shot: `kin_1600_preview.png` in that lesson's
shots folder.

The whole walk with no study selected is the exception. It still opens at
zoom 1, with no Fit. On the product graph that is a 678px DAG in a 737px
pane, which leaves 59px of PART column at rest. Those cells are clickable
now, each selecting its own row, and a sideways scroll or Fit (`0`) brings
the rest in. Fit takes the rails to 131px there (`walk_1600_fit.png`).

The design question is whether the whole walk should open fitted the way a
study arrival is framed.

- **Option 1, recommended.** Run `fitDag` once on a topology's first paint,
  scale-down only. This matches arrivals, but the browser tier's zoom checks
  assume zoom 1 at boot and would need re-measuring.
- **Option 2.** Leave it as it is: the whole walk is a map, and Fit is one key.
