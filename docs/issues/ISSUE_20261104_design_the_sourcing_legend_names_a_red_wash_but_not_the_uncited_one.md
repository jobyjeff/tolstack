---
type: chore
priority: low
status: open
area: design
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261103_the_kinematic_grid_is_a_stack_of_sub_stacks.md
---

# Design: the sourcing legend names a red wash, but not the uncited one

The grid's sourcing legend (`sourcingLegend`, `apps/viewer/views/topology.js`)
ends with "a row's tint is its rigid body; a red wash marks an untraced value".
`topology.css` gives uncited rows (`conf--no_source_ref`) a magenta wash too, and
the legend's own NO CITATION chip is magenta. So the one sentence that explains
row washes leaves one of the two unexplained.

The smallest fix is to name both washes in the sentence. The other option is the
one the lesson raises: mock-ups B/C drop the row wash altogether ("a tint never
means confidence"), and the chips already carry sourcing.
