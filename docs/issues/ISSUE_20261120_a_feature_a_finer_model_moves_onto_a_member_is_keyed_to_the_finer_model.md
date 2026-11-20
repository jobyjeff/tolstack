---
type: feature
priority: med
status: open
area: feature-identity
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261119_an_assembly_is_an_outline_and_its_parts_may_sit_in_two_bodies.md
---

# A feature a finer model moves onto a member is keyed to the finer model, not the one it reuses ids from

Since 2026-11-19 (`an_assembly_is_an_outline_and_its_parts_may_sit_in_two_bodies`,
`docs/DAG_TOPOLOGY.md` "Bodies" rule 3) a model that reuses another's ids may
state a shared node on a part **inside** the part the other model puts it on
(`topology.check_shared_ids`): v2 may put v1's ball centre on a bearing's
outer race rather than on the bearing.

The feature-identity key did not move with it.
`topology.feature_identity_topology_id` (and the annotator's
`AA.identityKey`) keys a feature `part@node` under the source model only when
the source model puts the node on **that same part**; a node moved onto a
member is keyed to the finer model. So once link 4 moves v2's features onto
their members:

- a binding v1 holds on `<bearing>@<node>` does not read through to v2's
  `<outer race>@<node>`; the feature shows unbound on v2;
- a new bind on v2 is written under v2's key, so the two models hold two
  records of what the shared id says is one feature.

Whether that is right is a design call. The v1 binding is a face on the
**bearing's** mesh, and the finer feature is on the race: if the race has a
mesh of its own the old face is on another solid, and reading it through
would be wrong. If it does not, the bearing's face is the only one there is.

Options: (a) keep it as is -- a moved feature starts unbound on the finer
model, and the identity key says honestly which part it is on; (b) read
through when the source part is an ancestor of this one and the binding's
mesh is the ancestor's (display only, as `AA.identityReadThrough` already
is); (c) write a `supersedes` across keys -- refused by the fold today, by
design. Recommendation: (a) until link 4 says which members get meshes, then
(b) for the members that have none. Needs a decision before link 4 moves a
bound feature.
