---
type: bug
priority: low
status: resolved
area: viewer/preview
reporter: agent
found_by: docs/sessions/HANDOFF_20261105_the_grid_fits_the_screen_and_its_brackets_say_what_nests_in_what.md
class: reading_surface_copy
resolution: handoff a_kinematic_row_shows_the_numbers_the_fold_uses_or_refuses (2026-11-08) -- the grid row prints the lender's band in its own cells and names the lender on the element cell hover; the Preview pane's wording was not re-checked there
---

# A borrowed-band term says "no value" in its Preview and "untraced" on its row

On the kinematic page, a contributor with no value of its own borrows its
band from another edge (`VA.kinematicBandEdges`). For example, `pitch_arm_radius`
borrows from the arm's hole-to-hole edge. Its grid row shows that band's
sourcing: since 2026-11-05 that is a red untraced mark, and before that it
was the UNTRACED chip. Its Preview's first chip shows the swept edge's own
confidence instead (`no value`, from `renderEdgeDetail`'s
`record.confidenceLabel`). So the same row reads two different ways on two
surfaces one hover apart.

Repro: `topology.html?kinematic=vpa_pitch_linkage_blade_pitch_at_the_stops`,
then click the `pitch arm` row. Shot:
`docs/sessions/lessons/shots/the_grid_fits_the_screen_and_its_brackets_say_what_nests_in_what/kin_1600_preview.png`.

The row's choice predates this handoff, from
`the_kinematic_grid_is_a_stack_of_sub_stacks`. The likely fix is for the
Preview's chip to show the band edge's confidence when `record.bandEdge` is
set, with the swept edge's own state beside it.

> **Note, 2026-11-06 (review round 2).** The shot cited above was deleted from
> the tree when round 2 retook the shots. It survives in history:
> `git show 047f9d9e:docs/sessions/lessons/shots/the_grid_fits_the_screen_and_its_brackets_say_what_nests_in_what/kin_1600_preview.png`.
