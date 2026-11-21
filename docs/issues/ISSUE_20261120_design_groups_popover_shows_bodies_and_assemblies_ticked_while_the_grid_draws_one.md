---
type: chore
priority: low
status: open
area: design
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261119_the_groups_switches_reach_the_map_and_the_grid_brackets_an_assembly_in_two_bodies.md
---

# Design: the Groups popover shows Bodies and Assemblies both ticked while the grid draws only one of them

Found reviewing `the_groups_switches_reach_the_map_and_the_grid_brackets_an_assembly_in_two_bodies`
(2026-11-20). The grid's outermost bracket is a body **or** an assembly
(Jeff's fallback). Which one it draws with both switched on is "the one switched on
last", stored apart from the switches (`VA.GRID_OUTER_KEY`, `apps/viewer/topology.js`
`VA.gridGroupKinds`), and the popover ticks both, because the map draws both.

What a reader sees on a fresh page: "Groups (3 of 3)", all three ticked, and no
assembly bracket in the grid. Assemblies is already ticked, so it cannot be ticked.
To get the assemblies into the grid the reader has to untick Assemblies and tick it
again. Nothing on the page shows which of the two the grid is using, or that ticking
one again would change it. The lesson says the author read Jeff's "switching one on
switches the other off there" as "in the grid" and chose not to untick the switch.

Options:

- (a) Keep it. It is cheap and the map stays honest.
- (b) A small marker beside whichever of Bodies or Assemblies the grid is using
  (a radio-like dot in the popover row). There are no words to add.
- (c) Untick the other switch in the popover, as Jeff's sentence literally says, and
  let the map follow the switches too. That loses "the map still shows both".

Recommend (b). It needs no sentence, and it makes the stored state something the
reader can see. Judge it once link 4's real bearings put assemblies in two bodies
on v2, where the choice starts to matter.
