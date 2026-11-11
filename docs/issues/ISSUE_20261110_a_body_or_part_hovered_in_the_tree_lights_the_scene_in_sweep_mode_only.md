---
type: feature
priority: low
status: deferred
area: annotate
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261110_the_model_is_derived_once_and_the_left_column_is_its_tree.md
defer_until: 2026-12-10
class: one_selection_many_surfaces
resolution: deferred 2026-11-10 (triage) -- low defers by default
---

# A body or part hovered in the tree lights the scene in sweep mode only

Resting on a part or body row in the left column posts the pane's own
`hover part` / `hover body` verb (2026-11-10), which the pane answers only
while a sweep is loaded (`cmdHover` calls `sweepState()` first and throws
"not in sweep mode" otherwise). So with the pane in bind mode a hovered part
row lights nothing in the scene, and the page deliberately posts nothing
rather than earn a banner. A feature row lights its node on the DAG and the
grid in both modes.

Teach `hover part` to answer in bind mode (the part's open mesh, every
occurrence), then let the tree post it whatever the pane shows.
