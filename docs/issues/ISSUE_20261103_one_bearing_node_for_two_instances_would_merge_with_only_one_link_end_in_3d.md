---
type: chore
priority: low
status: open
area: annotate/model-layer
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261103_coaxial_ends_share_one_3d_node.md
---

# One bearing node stands for two instances, so in 3D it would join only one of the pitch link's two ends

`pitch_link_bearing_ball_centre` is one node for both MS14101-3 instances in
the pitch link (the topology's own note on
`pitch_link_upper_centre_is_this_bearing`: a part id names a part, and these
are two instances of one). Its two gap edges say it IS the lower centre and
it IS the upper centre.

Since 2026-11-03 the scene draws concentric ends of an edge as one node
(`AA.modelJointGroups`). Today nothing on P2 merges there: every face on the
pitch link is only *proposed*, never accepted. Measured on the open proposals
(the faces Jeff would accept, placed in the assembly frame): the bearing's
ball centre sits **0.000 mm** from the upper centre and **105.99 mm** from
the lower one, because a node's bound feature is one face at one occurrence.
So once those proposals are accepted, the upper end becomes one 3D node with
the bearing and the lower end stays separate. The lower "is this bearing"
edge then draws as a 106 mm line from the upper joint down to the lower one,
which is a picture of the instance problem, not of a dimension.

Options (strategy's call, nothing to fix today):

- (a) Leave it. The 2D DAG is right, and the 3D line tells the truth about the
  modelling shortcut.
- (b) Split the bearing node per instance in the topology, so each link end
  has its own bearing centre. This is the honest model, and it changes the
  topology.
- (c) Let a binding carry an occurrence, so one node can be bound at two
  instances. This is a feature-identity change.

Recommendation: (a) until a binding is accepted there, then (b).
