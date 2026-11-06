---
type: feature
priority: low
status: resolved
area: annotate/scene
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261103_the_joint_is_the_node_and_an_edge_says_only_lit_or_unlit.md
class: scene_dag_parity
handoff: docs/sessions/HANDOFF_20261105_the_dag_is_coloured_by_a_chosen_attribute_and_spaced_to_taste.md
resolution: strategy 2026-11-05: routed into HANDOFF_20261105_the_dag_is_coloured_by_a_chosen_attribute_and_spaced_to_taste (Jeff's note 20261105T164140_sm8hkc) -- handoff completed 2026-11-06 -- closed automatically by dispatch when handoff `the_dag_is_coloured_by_a_chosen_attribute_and_spaced_to_taste` moved to completed/; not independently verified.
---

# The 3D scene does not colour a body with its DAG tint

The handoff asked that "the same tint is what the grid rows and the 3D
scene's body colour use". The DAG containers and the grid rows now share one
assigned tint per body: sixteen `--tv-body-*` tokens in
`apps/viewer/topology.css`, picked by `VA.bodyTint` from the body's place in
`bodies[]`. The 3D pane (`apps/annotate/`) has no body colour at all. Its
parts are drawn in the scene's neutral material, and the only tints are the
pick, the inspect highlight and the sweep's moving parts. The handoff fenced
the pane out of scope ("Do NOT touch ... the pane"), so this is left for a
later change.

What it would take:

- the pane reading the same sixteen tokens. It is a separate document, and it
  already reads `apps/viewer/style.css` tokens through the shell, so it can
  read these too.
- `VA.bodyTint` reaching the pane. It would sit beside the scene's
  part-to-body map, which the sweep's rigid bodies already use.
- a decision on how strong a body's colour should be in 3D. At the DAG's
  alpha (~.07) a mesh colour would be invisible, and at full strength it would
  fight the pick tint. This is a design question, so the issue is for
  strategy.

Recommendation: mix the body tint into the part's base colour at a fixed small
weight, and keep the pick and the inspect highlight as they are.
