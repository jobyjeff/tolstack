---
type: chore
priority: med
status: deferred
area: design
reporter: agent
found_by: docs/sessions/HANDOFF_20261112_a_feature_is_bound_once_to_a_set_of_faces.md
defer_until: 2026-11-29
resolution: deferred 2026-11-15 (triage) -- med beyond budget; the 11-12 chain rule allows one viewer handoff at a time, and most of these are inputs to the strategy session's map handoff (REVIEW_20261112_the_merged_page.md)
class: internal_id_as_display_name
---

# Design: a disagreement's Keep rows name each face by its number alone

When old bindings disagree on a feature, the nav tree's feature body reads
"2 faces disagree", then `face 3460 · Keep` and `face 144 · Keep` (branch
shot `docs/sessions/lessons/shots/a_feature_is_bound_once_to_a_set_of_faces/01_hub_boss_two_faces_disagree.png`).

The Keep is a choice Jeff makes **between those two lines**, and the line
gives him a face number and nothing else. The handoff's own lesson needed
the everyday words to explain the choice: 3460 is the Ø95 bore, 144 is the
Ø215.9 boss. That information exists already. The pick bar prints
`face 53 · round · r 25.3873 mm` for a picked face, from the part's face
classification.

Named rule broken: a label that identifies a thing carries its everyday name
beside its number. Suggested: give each disagreement row the same
shape-and-size words the pick bar prints (`face 3460 · round · r 47.5 mm`).
Hovering already lights the face; the words are for the moment before the
hover.
