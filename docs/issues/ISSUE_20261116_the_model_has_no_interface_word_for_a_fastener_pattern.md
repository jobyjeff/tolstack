---
type: feature
priority: med
status: resolved
strategy: docs/strategy/BRIEF_20261030_topology_layout_questions_the_redesign_left_open.md
area: topology/vocabulary
reporter: agent
audience: strategy
found_by: docs/sessions/active/HANDOFF_20261115_the_map_draws_the_end_stop_model.md
---

# The model has no interface word for a fastener pattern, so the map's layout file names the clocking

Jeff's symbol table for the map (2026-11-10) has four pictures: a seat is the
capacitor mark, a boss in a hole a circle and dot, a ball joint a cup and
ball, and **a fastener pattern (clocking) a ring of dots**. The model can say
the first three -- a node two parts share is a seat (`model_view.CONTACT_KIND`),
and a gap edge's `interface` word says `pin_in_bore` or `spherical`
(`tolerance_stack/topology.py`, `INTERFACE_KINDS`) -- but a clocking is
authored as a shared node like any seat (`tan_link_mount_fastener_clocking`,
kind `mating_surface`, two parts), and nothing on it says *pattern*.

The map handoff could not change the model file or the vocabulary, so the
layout file beside the model names it: `docs/topologies/map_vpa_end_stop_v2.json`,
`"symbols": {"tan_link_mount_fastener_clocking": "pattern"}`, read by
`VA.mapSymbolOf`. That is a drawing instruction standing in for a fact about
the model, and it will not scale to the compound joints Jeff described (every
flange-boss-fastener joint has one), each of which would need a line here as
it is authored.

Options, for a strategy session:

1. **A node kind for it.** `tolerance_stack/topology.py`'s node `kind`
   vocabulary gains a word (`fastener_pattern`, say) beside `mating_surface`
   and `datum_feature`; the model view carries it on the feature; the map
   draws the ring of dots from the kind and the layout file's `symbols`
   override is retired. This is also what the pattern binding (a hole pattern
   bound as its like faces, 2026-11-16) would want to key on.
2. **An interface word on a shared node.** Today only a gap edge states an
   `interface`; letting a shared node state one (`"interface": "pattern"`)
   would make a contact's kind authorable the way a gap's is, and the map's
   `contact` symbol becomes the default for a node that states none.

Recommendation: option 1 -- a clocking is a feature's nature, not a gap's
kind, and the pattern binding already treats the feature as the unit.
Reversible either way: the override is one line in one file.

> **Resolved 2026-11-17** by handoff `a_joint_says_what_kind_it_is`. The
> strategy session took **option 2**: a node two parts share may state an
> `interface` word, and `fastener_pattern` and `revolute` joined
> `INTERFACE_KINDS`. One mechanism covers both the clocking and the blade's
> pitch bearing (which was drawn as a flat seat, the walk's S9), and no id
> changes, so the bindings Jeff's log holds on both nodes keyed by `{topology_id,
> part, node}` fold exactly as before. The four nodes state their words, the
> map draws the ring of dots from the model, and the layout file's `symbols`
> key is gone (the builder now refuses a file that carries one).
