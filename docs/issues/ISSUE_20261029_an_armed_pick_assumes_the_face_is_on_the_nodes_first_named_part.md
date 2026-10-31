---
type: bug
priority: med
status: resolved
area: annotate/sweep-rail
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261029_a_face_is_picked_the_way_cad_picks_it.md
class: armed_pick_reach
handoff: docs/sessions/HANDOFF_20261030_an_armed_pick_can_reach_either_part_and_says_why_a_bind_failed.md
resolution: triage 2026-10-30: strategy options decided in the handoff (option 2, the armed row switches parts; option 1 rejected for now, needs a CAD truth table for 14 nodes) -- handoff completed 2026-10-30 -- closed automatically by dispatch when handoff `an_armed_pick_can_reach_either_part_and_says_why_a_bind_failed` moved to completed/; not independently verified.
---

# An armed pick assumes the face is on the node's first-named part, and nothing lets the reader switch

`AA.pickEndPartIds` (`apps/annotate/sweep.js`) arms a joint end's pick on the
end node's **first** listed part with an installed mesh, and the selection
filter then makes every other part unpickable. The handoff's lesson justified
the order as "all 35 two-part nodes are named `<first part's face> against
<second part>`". Re-derived at review against
`docs/topologies/topology_vpa_pitch_linkage.json`: there are **34** two-part
nodes, and only **20** use the "X against Y" form. The other 14 never state
which part carries the face. Jeff's own reproduction, "hub blade-1 root
bearing bore" (`[hub, blade_root]`), is one of the 14 and happens to be right.
Some of the others are ambiguous from their names alone:

- "gas-spring bushing in the pitch plate": `[pitch_plate_215177_001, gas_spring]`
- "hydraulic brake attached to the pitch plate": `[pitch_plate_215177_001, hydraulic_brake]`
- "actuator body mounted to the hub": `[hub, vpa_208510_007]`

**Failure scenario:** for an end whose face is on the second part, Pick arms
the wrong part. The right face can't be hovered or clicked, and the rail
offers no way to switch parts. The reader has to know to leave sweep mode and
bind from bind mode instead.

**Options (strategy):**

1. Declare it on the topology: a per-node `face_part` (or treat `parts[0]` as a
   documented, tested field contract and audit the 14 nodes).
2. When the node has two parts with meshes, let the armed row switch between
   them (the filter follows).
3. Keep the heuristic and add a test that every two-part node's `parts[0]` is
   the face's part. That needs someone to establish the truth for the 14.

Recommendation: (1) with a pairing test, because the order is data and
should be declared, not inferred from wording.
