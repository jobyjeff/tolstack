---
type: chore
priority: low
status: resolved
area: design
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261103_the_kinematic_grid_is_a_stack_of_sub_stacks.md
class: design_polish
handoff: docs/sessions/HANDOFF_20261105_the_grid_fits_the_screen_and_its_brackets_say_what_nests_in_what.md
resolution: strategy 2026-11-05: routed into HANDOFF_20261105_the_grid_fits_the_screen_and_its_brackets_say_what_nests_in_what (Jeff's note 20261105T164140_sm8hkc) -- handoff completed 2026-11-06 -- closed automatically by dispatch when handoff `the_grid_fits_the_screen_and_its_brackets_say_what_nests_in_what` moved to completed/; not independently verified.
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
