---
type: feature
priority: low
status: resolved
area: annotate
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261110_the_model_is_derived_once_and_the_left_column_is_its_tree.md
class: one_selection_many_surfaces
handoff: docs/sessions/HANDOFF_20261112_hover_and_select_light_the_same_things_on_all_four_surfaces_and_nothing_goes_opaque.md
resolution: deferred 2026-11-10 (triage) -- low defers by default; resolved 2026-11-12 by hover_and_select_light_the_same_things_on_all_four_surfaces_and_nothing_goes_opaque -- the page posts one `light` verb for its hover and its selection, which the pane draws in either mode; `hover part|body` is no longer on this path
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

## Addendum 2026-11-11 (one_selection_one_hover_and_leaders_off)

The hover is now the one page hover (`state.focus.hovered`, `topology_app.js`),
and `paneHoverCommand` is the one place it becomes a pane verb: `hover part`
and `hover body` while a sweep is loaded, and -- new -- `hover feature <edge>
<end>` for a hovered feature, interface or DAG node, also sweep-mode only
(the pane throws outside it). Bind mode still receives only `highlight` for an
edge. The fix shape is unchanged: a `hover` the pane answers in bind mode.

## Addendum 2026-11-12 (hover_and_select_light_the_same_things_on_all_four_surfaces_and_nothing_goes_opaque)

Resolved by a different shape than the fix proposed above. The page no longer
posts `hover part|body|feature` at all: its one resolver (`VA.focusLightOf`,
`apps/viewer/model.js`) says what the hovered or selected entity lights, in
two tiers, and the page posts that as one `light <json>` verb
(`VA.sceneLightCommand`), which the pane draws in both of its modes
(`cmdLight`, `apps/annotate/app.js`): the own parts glow at their resting
look with their bound faces overlaid harder, touching parts ghost, the rest
faint. A body or part hovered in the tree lights the scene with no sweep
loaded. The pane's `hover` verb stays for its own rail rows.
