---
type: chore
priority: low
status: open
area: viewer/pane
reporter: agent
found_by: docs/sessions/HANDOFF_20261112_hover_and_select_light_the_same_things_on_all_four_surfaces_and_nothing_goes_opaque.md
class: one_selection_many_surfaces
---

# A selected edge reaches the pane twice, as `highlight` and as `light`

Since 2026-11-12 the page tells the pane what its hover and its selection
light with one verb, `light <json>` (`VA.sceneLightCommand`,
`apps/viewer/topology_app.js`'s `paneLightCommand`), and the pane draws the
two tiers (`cmdLight`, `apps/annotate/app.js`). The hover's old
`highlight <topology> <edge>` post is gone. The selection's is not: while a
run is loaded (`VA.annotateEdgeIsHighlight`) a selected edge still posts
`highlight` too (`selectedPaneTarget`), which tints the edge's bound face in
the colour buffer with the pick orange and sets the model layer's one
`emphasis` edge -- the same face the `light select` layer overlays and the
same edge its `emphasisEdges` carries. Kept this way because the kinematic
page's checks read `__lastHighlight` after a row click and the pane's own
rail selection paints the same tint for a feature, so the two agree; but it
is one fact posted twice, and `cmdHighlight`'s `highlightAction` (the edge's
parts as an action) is a second route to the looks the light already owns.

Fix shape: drop `selectedPaneTarget` and the `highlight` post from the page;
let `light select` carry the pick tint for an own face (a `select` layer at
the buffer, or the overlay alone) and the model layer's emphasis; then
`highlightAction` has no page-side writer and can go with `cmdHighlight`'s
sweep branch. The kinematic suite's `__lastHighlight` reads move to
`__lastLight`.
