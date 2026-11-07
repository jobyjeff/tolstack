---
type: feature
priority: low
status: deferred
area: viewer/dag-layout
reporter: agent
audience: strategy
class: dag_layout_policy
found_by: docs/sessions/HANDOFF_20261105_a_part_with_many_interfaces_is_drawn_as_a_component_with_pins.md
defer_until: class:dag_layout_policy
resolution: deferred 2026-11-06 (triage) -- low defers by default; class trigger (the topology-layout brief)
---

# A part the kinematic stack visits twice is two blocks

Brief Q5 ("part runs repeat") is dissolved on the whole walk and on chain
studies: the page gathers each multi-interface part into one run
(`VA.gatherParts`) and draws it as one block. The grid follows, because it
is built off the drawn walk.

On a kinematic page the band is in the stack's own order (`lit.order`,
`VA.orderBand`), and the grid's row order is that chain order. The handoff
fenced that order. So a part the stack reaches twice is cut into two runs in
the band, and the page draws two blocks. A part with lit and unlit pins is
also two blocks: one in the band and one outside it. The pitch plate on the
end-stop study is both cases.

Options:

1. Leave it. The band is the chain, and a part the chain revisits is
   honestly visited twice.
2. Gather the band too, and accept that the grid's chain order and the DAG
   then disagree, so leaders cross where the chain revisits.
3. Draw the two blocks of one part as one container, bridged like a body's
   fields (`VA.bodyBridges`).

Recommendation: 3. It is the precedent body fields set, and it keeps both
the chain order and "one part reads as one thing".
