---
type: feature
priority: low
status: open
area: annotate/sweep-rail
reporter: agent
audience: strategy
found_by: docs/sessions/active/HANDOFF_20261020_the_sweep_rail_shows_the_mechanism.md
---

# The sweep rail cannot show a body's internal dimension chains

Jeff's level-of-detail sketch (2026-10-16) has three levels: collapsed =
bodies and joints; a body opens into its parts; a joint opens into the faces
that define it. The sweep rail now does all three. The level it **cannot** show
is a body's *internal* dimension chain — how the pitch plate's own dimensions
carry its spindle bore to its pitch-link attach bore, say — because nothing
attaches a chain study to a body. A `linkage-sweep/v1` run names a body's parts
(`bodies[].parts`) and each joint's feature joins (`geometry.features[]`), and
the topology names edges between nodes; but no document says "this chain study
is the inside of body X".

What it would take, roughly: a body → chain-study join (in the topology, or in
the kinematic study, whose contributors already name the edges they perturb),
after which a body row could open into that study's elements and the rail
could colour them by binding state as it colours joint features today.

Recommendation: wait until a chain study exists that is naturally "one body's
inside" (the pitch plate's attach geometry is the obvious first one) and design
the join against it, rather than inventing the field first.
