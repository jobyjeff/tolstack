---
type: feature
priority: low
status: open
area: viewer/dag
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261112_hover_and_select_light_the_same_things_on_all_four_surfaces_and_nothing_goes_opaque.md
class: one_selection_many_surfaces
---

# The rail-leg glow left with the two-tier light

Until 2026-11-12 a pointer on a bar, a dot, a grid row or a rail lit the whole
connected line it sat on -- the rail span, the branch curve that opened it,
every bar and dot on it and those edges' rows (`--hot`, "one hover state, two
surfaces", 2026-09-30; Jeff: *"add an emphasis (bold/glow etc) to the edges
when you hover over them, again makes it easier to trace them"*). The
2026-11-12 rule replaced that with the one resolver's two tiers: own (the
thing and what it contains) and touching (what meets it). A leg is neither,
so hovering a rail now lights nothing and hovering an edge lights its own
marks and the interfaces at its ends, not the leg. The handoff asked for this
for parts and bodies ("a part or body hover lights no whole rail leg") and
named the DAG's own `hot.on` winning over the page's hover as a cause; it did
not say whether tracing a leg from an edge is still wanted.

If it is, it is a third thing hover says, not a tier: a *path* emphasis
(every mark on the leg, at the touching weight) that an edge or a rail could
carry beside the resolver's own and touching. The registry that knew which
leg a mark sat on (`hot.rail`, `hot.railOf`, `hot.railOfLink` in
`apps/viewer/views/topology.js`) is still built and still unread by the
lighter, so the cost is the rule and the CSS, not the bookkeeping. The rail's
hit paths still tell the page their key (`rail|<i>`), which the page resolves
to no entity.
