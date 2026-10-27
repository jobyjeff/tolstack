---
type: feature
priority: low
status: open
area: viewer/leaders across the seam
reporter: agent
found_by: docs/sessions/HANDOFF_20261026_leaders_follow_the_active_study_across_the_seam.md
---

# The scene-to-shell mapping stops at a body, and ignores hover

A pick in the scene selects on the shell's page through the scene's mirrored
tree: the newly `selected` row's key is read by `VA.sceneRowElement`
(`apps/viewer/topology.js`), and a row naming an edge, or a body carrying
exactly one lit edge, becomes the selection. Two gaps, one mapping:

| gap | measured on P2's kinematic study | shape of the fix |
|---|---|---|
| **A pick on a multi-part body selects nothing.** | `base` carries 3 lit edges, `blade` 2, `pitch_plate` 3; only the two links and the three single-part piston bodies resolve. | Narrowing to the picked *part* (the row key's `sha=` against the topology's `part.mesh.part_id`) would resolve only `base`'s gas-spring mount: the tan-link mount and the pitch arm carry two lit edges each, the pitch plate three. What names a *dimension* is the picked face's binding, which the scene already uses to select feature rows (`data-edge` on a feature row, which the mapping reads); the live inbox has none yet. So this is mostly a binding gap, not a mapping one. |
| **Hovering in the scene does not light a leader.** | Hovering a DAG mark or grid row lights its leaders (`VA.seamLeaderStates`' `hot`); hovering a part in the scene marks its rail row `sceneHover: true` in `annotate:tree`, which the shell does not read. | `followScenePick`'s twin over the `sceneHover` row, into `paneHot`. |
