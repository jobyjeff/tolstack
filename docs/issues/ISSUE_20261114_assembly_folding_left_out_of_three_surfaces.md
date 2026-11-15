---
type: chore
priority: low
status: open
area: viewer/assemblies
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261112_a_part_may_contain_parts.md
---

# Three surfaces where a part inside an assembly is still read flat

Handoff `a_part_may_contain_parts` (2026-11-14) taught the model view, the tree,
the grid and the DAG about `parent`. These sites were left as they were. Each
one is reachable only on a model that has an assembly, which today is model v2's
two links:

| Site | What it does now | What it should do |
|---|---|---|
| A kinematic page's grid (`VA.gridPlan`, `focus.stack`) | Ignores the fold. The stack's rows are its own sub-stacks, and `kinematic.py` computes no per-assembly fold. | Fold an assembly within a sub-stack. This needs a per-assembly `fold()` of the stop's terms in `build_kinematic_projection.py`, as `topology.assembly_rollups` does for a chain study. |
| The 3D pane's sweep rail (`apps/annotate/app.js`, `AA.sweepModelTree`, around `:3807`) | Lists a body's declared parts flat, in `bodies[].parts` order. | Indent a part under its parent, as the left tree does. The pane reads the authored topology, where `parts[].parent` is present. |
| The grid caret (`VA.gridBraces`, `assemblyCaret`) | Appears on the first row of an assembly that has rows of its own. An assembly with no dimension of its own, whose children do have rows, can be folded only from the toolbar. Once folded, its row has the caret. | Put the caret on the first row of the assembly's run in that case too. No committed model has the case. |

None of them changes a number. The DAG's own share is a separate issue,
`ISSUE_20261114_the_dag_draws_no_nested_outline_for_a_part_inside_an_assembly.md`.
