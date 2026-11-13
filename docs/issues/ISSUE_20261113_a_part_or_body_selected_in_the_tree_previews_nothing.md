---
type: feature
priority: med
status: open
area: viewer/preview
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261112_a_part_links_to_its_drawing_before_it_has_a_tolerance.md
---

# A part or a body selected in the tree previews nothing

Jeff's note behind handoff `a_part_links_to_its_drawing_before_it_has_a_tolerance`
asked for drawing links "in the preview pane for each part/assembly". The Preview
has no record for a part or a body: `VA.focusElementOf` (`apps/viewer/model.js`)
maps a part, a body or a joint to `null`, so selecting or hovering a part's row in
the tree, or a part's block in the DAG, leaves the Preview on
"Point at a dot, a bar or a row to preview it here; click to keep it."
(measured on v2, 2026-11-13, `tests/debug_part_drawing_links_20261113.mjs`).

The handoff shipped the link where a part *is* previewed today: the part line of a
dimension's Preview and each side of an interface's Preview (`VA.renderPartName`,
`apps/viewer/views/topology.js`). Every v2 part with a dimension or a feature is
reachable that way. Three v2 parts (the three spherical bearings) are in no row and
no dot, so no Preview names them at all.

Options:

1. **A part record** (recommended): `part|<id>` gets an element record (label, the
   drawing link and older runs, its body, its features and dimensions as counts),
   and the Preview shows it when a part is hovered or selected. `focusElementOf`
   stays as it is for the scene and the deep link; the Preview reads its own key.
2. A body record too, listing its parts, each with its link.
3. Leave it: a part is reached through its rows.

Needs a design call on what a part's Preview carries beyond the link, so it is a
strategy question, not a fix.
