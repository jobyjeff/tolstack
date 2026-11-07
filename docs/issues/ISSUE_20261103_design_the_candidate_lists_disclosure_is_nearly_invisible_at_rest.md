---
type: chore
priority: low
status: resolved
area: design
reporter: agent
found_by: docs/sessions/HANDOFF_20261103_a_joint_end_lists_its_candidate_faces_and_says_why_each_is_there.md
class: design_polish
handoff: docs/sessions/HANDOFF_20261105_the_rail_reads_as_a_tree_of_bodies_joints_and_faces.md
resolution: strategy 2026-11-05: routed into HANDOFF_20261105_the_rail_reads_as_a_tree_of_bodies_joints_and_faces (Jeff's note 20261105T164140_sm8hkc) -- handoff completed 2026-11-06 -- closed automatically by dispatch when handoff `the_rail_reads_as_a_tree_of_bodies_joints_and_faces` moved to completed/; not independently verified.
---

# Design: the candidate list's disclosure is nearly invisible at rest, and every reason line is in the accent colour

Found in the review of `a_joint_end_lists_its_candidate_faces_and_says_why_each_is_there`
by reading its screenshot
`docs/sessions/lessons/LESSONS_20261103_a_joint_end_lists_its_candidate_faces_and_says_why_each_is_there_2_open_hover.png`.

- **The ▸/▾ in front of a joint end's row is hard to find.** The pane's
  `.tree-row__twisty` (`apps/annotate/style.css`) is 10 px wide and muted
  gray. At the rail's type size it reads as a dot, not a disclosure, so the
  feature this handoff exists for is hard to discover. The joint rows above
  it use a full-size ▸/▼. Matching their glyph size would make it findable.
  So would making the whole closed summary line ("candidates · 26") the
  toggle.
- **Every candidate's reason line is in the suggestion colour.** On an open
  list of eight, that is eight accent-coloured lines, plus the end row's own
  "candidates · 26" above them. The suggestion colour is the view's one
  accent and marks state. Inside a list that is all suggestions, the reason
  is secondary text and could be muted gray, which leaves the accent for the
  row being hovered or taken.

Judgement-call aesthetics; non-blocking.
