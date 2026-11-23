---
type: bug
priority: high
status: open
area: annotate/binding
reporter: agent
found_by: docs/sessions/HANDOFF_20261122_the_walk_reads_the_v2_study_and_the_map_on_the_merged_page.md
---

# A Take under an armed Add a face replaces the set and ends the add

Jeff's 11-22 note: "if I click 'add a face' to add the second shoulder, the
new selection replaces the old one." His log has the trace. Event 0103 holds
the other shoulder's nine faces, supersedes 0102 and was written by the
replace path. The walk reproduced it face for face on a scratch copy of his
log (`data/scratch/walk1123`, events 0118–0120). The writer is the same code
he ran: `addArmedFace` and `cmdTake` have not changed since master
`e7df6649`, the tip when he wrote 0102–0104.

## The sequences, measured

All on `215175-002 › pilot bore` (the edge `hub_boss_in_tan_link_mount_pilot`,
end `to`), starting from one shoulder bound (9 faces, z 57.85: the same
shape as 0102).

| Sequence | Armed state before → after | Writer | Result |
|---|---|---|---|
| Add a face, then click a face of the other shoulder (face 784) | `adding a face to the feature` → disarmed | `addArmedFace` → `writeFeatureSet` (`…-add`, `_face_added`) | **adds**: 18 faces, both shoulders (scratch 0116) |
| Add a face, then Shift-click a face | adding → `added face 263 · 18 faces`, still armed | `addArmedFace` | **adds** (scratch 0120) |
| **Add a face, then Take on a suggestion line of an unheld face (face 784)** | adding → disarmed | `cmdTake` → `writeAnswer` (edge-slug id, no add marker) | **replaces**: the other shoulder's 9 faces, superseding the first (scratch 0119 = Jeff's 0103) |
| Add a face, then Take on a line of a face already held | adding → still adding | `cmdTake` returns `sameFace` | nothing written and **nothing on screen** |
| Correct, then click a face already held whose surface is all held | armed → `already bound to face 263` | none | nothing written |

## Why a hand takes the replacing route

Pressing Add a face swaps the feature's body for the armed list. The
"bound · 9 faces" line and its face list disappear, and in their place come
eight single-face lines, each with a Take (shot
`docs/sessions/lessons/shots/the_walk_reads_the_v2_study_and_the_map_on_the_merged_page/25_adding_list_before_take.png`).
They mix the held shoulder's faces (459, 263, 264, 1231, 395) with the other
shoulder's (784, 788, 789), and nothing says which is which. The nearest
thing to "add the other shoulder" under an Add a face is one of those Takes,
and it replaces.

The pane already ranks the right answer before Add a face is pressed: one
row, "18 faces · round · r 107.9754 mm · fits the mating pin", holding both
shoulders (`__embedTree.mates`). It is not offered while a set is bound.

## Fix shape

The staged binding-pane chain (`the_tree_sits_beside_the_3d_canvas_and_holds_still`
onward) removes these buttons. Until then, or in its form:

- While adding, a Take adds: it goes through `addArmedFace`'s union, not
  `cmdTake`'s supersede.
- A line for a face already held says "held" and has no Take.
- The bound set stays visible while adding.

Each needs a guard and a witness spec.
