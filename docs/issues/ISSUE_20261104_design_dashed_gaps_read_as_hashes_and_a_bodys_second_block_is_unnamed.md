---
type: chore
priority: low
status: open
area: design
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261103_the_joint_is_the_node_and_an_edge_says_only_lit_or_unlit.md
---

# Design: dashed gaps read as hashes at the fitted zoom, and a body's second block is unnamed

Two follow-ups named in
`docs/sessions/lessons/LESSONS_20261103_the_joint_is_the_node_and_an_edge_says_only_lit_or_unlit.md`
("What the click-around found"). No issue carried either one, so the review
files them here. Neither blocks anything.

1. **The dashed gaps look like hashes.** The handoff thinned every bar to one
   ink at two weights. At 4px, the lit band's dashed gap segments
   (`.rail__bar--gap`, `stroke-dasharray: 4 3`) carry most of the visual
   weight, and at the fitted zoom they look like the band hashes Jeff asked to
   remove (`shots/the_joint_is_the_node_and_an_edge_says_only_lit_or_unlit/1b_kinematic_minus7_dag.png`).
   The lesson suggests a lighter gap ink (`--edge-gap-ink`), not a second
   channel. A longer dash is another option. Wait for Jeff's reading before
   changing it.
2. **A body's second block is unnamed.** Since "named once", the second block
   of `base` and of `pitch_plate` in the topology view carries no name. Its
   bridge leads up to the first block's name, which can be off-screen. The
   option is a sticky name, or a muted repeat of the name on any block whose
   named block is out of view.
