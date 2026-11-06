---
type: chore
priority: low
status: open
area: annotate/rail
reporter: agent
found_by: docs/sessions/HANDOFF_20261105_the_rail_reads_as_a_tree_of_bodies_joints_and_faces.md
---

# The annotator's own rail does not draw the kind glyphs, the state marks or the legend

`the_rail_reads_as_a_tree_of_bodies_joints_and_faces` gave the scene tree one
look per row kind, a state mark on each face-bearing row and a legend. It did
this where the tree is read: the shell's nav mirror (`apps/viewer/views/nav.js`'s
`renderSceneTree`, `apps/viewer/topology.css`). The annotator now tags its rows
with the kind and the mark (`railLook` in `apps/annotate/app.js`, the
`rail-kind--*` / `rail-mark--*` classes), but `apps/annotate/style.css` does
not style those classes. Its own `#sweep-tree` still uses the older
`.el-row--<state>` left borders and has no legend.

Nobody reads that copy today. Since 2026-10-30, opening `apps/annotate/` bare
redirects to the viewer with the pane open, and embedded, the rail is laid out
but not shown. So this is not visible in the app. It only matters if a
standalone annotator page comes back, or if a check screenshots the
annotator's own rail.

Fix: style `.rail-kind--*` / `.rail-mark--*` in `apps/annotate/style.css` from
the same tokens (paired by `tests/test_rail_row_looks_are_paired.py`), and
render `AA.railLegend()` above `#sweep-tree`. Alternatively, retire the
annotator's own rail styling outright.
