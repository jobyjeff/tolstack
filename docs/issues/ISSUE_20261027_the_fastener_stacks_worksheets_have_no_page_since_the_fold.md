---
type: bug
priority: med
status: triaged
area: viewer/worksheets
reporter: agent
audience: strategy
found_by: docs/sessions/active/HANDOFF_20261026_the_fastener_stacks_join_the_model.md
handoff: docs/sessions/HANDOFF_20261027_a_study_shows_the_worksheet_and_joint_of_the_stack_it_folds.md
class: fold_left_stale_reference
---

# The fastener stacks' worksheets and joint blocks have no page since the fold

Before 2026-10-27 each of the four fastener topologies was a page, and the
viewer reached a topology's worksheet through the stack it re-expresses
(`VA.worksheetSubject`: a topology's own sheet wins, otherwise a covered
stack's) and rendered its `joint` block (assembly drawing, sheet, view, zone).
The product model declares its own worksheet (the end-stop graft), so that
sheet always wins, and the model has no `joint` block of its own. Result: the
three authored sheets (`WORKSHEET_pitch_link_to_pitch_plate.md`,
`WORKSHEET_rotor_fastener_length.md`, `WORKSHEET_vpa_output_to_pitch_plate.md`)
are no longer offered by any page, and the four joint blocks live only in
`provenance.grip_stack_joints` of the model.

The `[real]` check that pinned "the three converted stacks' sheets are
reachable" now asserts zero reached and names this issue. Fix shape (app work,
outside the fold's scope): a study carries or resolves its stack's worksheet
and joint block, and the page shows them when that study is selected.
