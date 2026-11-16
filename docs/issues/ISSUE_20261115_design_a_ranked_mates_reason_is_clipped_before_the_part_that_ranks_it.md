---
type: chore
priority: low
status: open
area: design
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261115_a_suggestion_names_its_face_and_the_mating_side_ranks_the_candidates.md
---

# Design: a ranked mate's reason is clipped before the part that ranks it

Under a feature in the shell's tree, each ranked mate is drawn as two lines
(`VA.renderFeatureBody`, `.navtree__featuresub`). The first line is
"face 2356 · round · r 41.2750 mm". The second is the reason,
"coaxial with blade bonded assembly, Ø82.55 vs Ø82.51". At the nav's rest
width the reason is cut off after "coaxial with blade bonded a…"
(`docs/sessions/lessons/shots/a_suggestion_names_its_face_and_the_mating_side_ranks_the_candidates/03_hub_bore_unbound_opens_to_ranked_list.png`).

- **The part that ranks the faces is the part that gets cut.** All eight rows
  read the same up to that point. What tells them apart is the diameter pair,
  and that is the clipped part. A hover shows the whole reason, so the text can
  still be found. But the list's order cannot be read at a glance.
- **One quantity, two notations.** The first line gives a radius in mm
  ("r 41.2750 mm"). The second gives diameters with no unit ("Ø82.55 vs
  Ø82.51").

Options, for whoever takes this: put the comparison first ("Ø82.55 vs Ø82.51,
coaxial with …"), or drop the repeated part name from rows after the first.
Pick one notation for the size on both lines. Judgement call, not a defect.
