---
type: feature
priority: med
status: triaged
area: topology/containers
reporter: agent
audience: strategy
found_by: docs/sessions/active/HANDOFF_20261026_the_fastener_stacks_join_the_model.md
resolution: triage 2026-10-30: brief BRIEF_20260914_dag_layout_geometry_tradeoffs consumed 2026-10-29 without curing this (layout.bodies still holds one span per component block; collapsing base still gives two pills, body:base and body:base#2, pinned in apps/viewer/tests.js); reopened for re-triage; triage 2026-10-30: gathered into a new brief with the other undecided layout questions
class: dag_layout_policy
strategy: docs/strategy/BRIEF_20261030_topology_layout_questions_the_redesign_left_open.md
---

# A body whose parts sit in two components of the walk draws as two containers

Since the four fastener grip stacks folded into `vpa_pitch_linkage`
(2026-10-27) the model is five connected components: the mechanism and one per
stack. A stack's hardware is declared in the body it clamps to, and the walk
lays components out one after another, so a body with parts in two components
is **two blocks**: the pitch plate four (mechanism plus three grip stacks),
`base`, `pitch_link`, `tan_link` and `vpa_piston` two each.

What this does today (all measured, `apps/viewer` `[real]` tier):

- each block draws its own container and its own name, so "named once" is now
  "named once per block";
- collapsing `base` folds **two** pills, one per block, not one node;
- `body_spans` / the walk can no longer promise one block per body.

The tests were re-pinned to the per-component count and say so. The design
question is whether that is the picture: options are (a) leave it (a stack is a
different piece of the body's story), (b) draw one container per body across
components (the walk would have to interleave components), (c) connect each stack
to its body through a real contact node, which needs a sourced edge nobody has.
Recommendation: (a) until a reader asks, since (b) reorders the whole walk for a
drawing preference and (c) invents structure.
