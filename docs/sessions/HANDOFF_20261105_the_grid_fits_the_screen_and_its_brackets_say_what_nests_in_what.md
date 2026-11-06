---
priority: high
depends_on: []
model: opus
hitl: false
---

# HANDOFF 2026-11-05 — the_grid_fits_the_screen_and_its_brackets_say_what_nests_in_what: bracket dividers nest by group size, sourcing and crops leave the row, part number and description are two columns, and the grid fits beside the 3D and preview panes

Source: Jeff's forge note `20261105T164140_sm8hkc` (2026-11-05), "#Grid view": "use brackets
(imagine [] or {} or () turned horizontally) as the dividers between parts, bodies etc. Larger
groups (bodies, studies) can be wider horizontally than smaller groups (parts), so it's clear
which are nested inside of the others. See second screenshot: I created this quickly in
powerpoint just to brainstorm formatting style, doesn't need to be exactly like this, just use it
as a guide/inspiration. Compare to the third screenshot which is the actual current grid view,
which is extremely busy, everything is nearly identical in color and has very little contrast
etc, so it's hard to infer meaning from anything. Also the table is too wide to fit on screen even
on my 4k monitor, the sourcing and crop columns are obscured when the 3d and/or preview panel
has reasonable size, and the crops are way too small to even see what's going on anyways. For
sourcing, just put a small alert icon (same as what's used on the left side menu) and show more
info in the preview panel. Clicking and dragging the dag horizontally causes the grid view to move
horizontally, it can even move behind the dag canvas." And from "Wording": "half of the Component
column start with PN/Description, and the other half are Description/PN. None of them fit
entirely in their column anyways, consider making them two separate columns."
Screenshots: `C:\workspace\forge\data\inbox\atomic-notes\attachments\20261105T164140_sm8hkc\paste-20261105T155248.png`
(Jeff's mock-up: a white outer brace spanning "Stop Position", a blue brace spanning "Plate
Position at the feather stop" with its rows and a Total row, a red brace spanning "Travel Between
End Stops"; braces are thin rounded rectangles open at the top, nested braces inset and
shorter; rows are part (number) | element | three values; no pills, no crops) and
`…\paste-20261105T155317.png` (the live grid as he saw it).
Routed here: `docs/issues/ISSUE_20261104_at_1600_wide_the_product_graphs_rails_leave_the_grid_a_59px_slit.md`
(brief Q7) and `docs/issues/ISSUE_20261104_design_the_sourcing_legend_names_a_red_wash_but_not_the_uncited_one.md`.
Baseline: master after the 11-03 batch. The grid is `function grid(...)`
(`apps/viewer/views/topology.js:2397`), rows `edgeRow` (`:2759`) and `subStackRow` (`:2467`),
columns `VA.TOPO_COLUMNS` (`:908–946`; SENSITIVITY 70 px, component 120, element 210,
contribution 170), pills in `chipsCell` (`:2736`), crops in `edgeCropCell` (`:2978`), body tints via
`VA.gridRowMarks`. Scope: the grid's structure, columns, dividers, CSS, and the hscroll coupling
with the DAG. Do NOT touch the row *order* or the stack model (`VA.kinematicStack`), the pose
animation (`the_grid_and_the_dag_move_with_the_mechanism`), the DAG layout, or element wording
(`stack_wording_drops_filler_and_the_hover_says_the_same_thing`).

## Deliverables

1. **Brackets.** Each group (study, body, sub-stack, part) is bounded by a horizontal brace,
   wider for the outer group and inset for the inner, in the group kind's hue (the same tokens
   the DAG handoff assigns to group kinds; coordinate through `topology.css` tokens, not by
   copying values). Row stripes, body tints and the red wash go; the brace, the indent and the
   row's part column carry the structure. Fold state and folded totals keep working.
2. **Two columns.** `PART` (number, e.g. `213668-002`) and `DESCRIPTION` (the drawing's
   nomenclature), in that order everywhere; `VA.elementDisplayLabel` keeps shortening the
   element text, but the part words come from the part record, not the label.
3. **Sourcing leaves the row.** Replace the pill cluster with one small icon in the state's
   colour, the same glyph the left nav uses for a warning; hover names the state in one phrase;
   the preview panel shows the citation, the note and the crop at a readable size when the row
   is selected. The legend lists every icon state (the routed legend issue closes here).
4. **Crops leave the row.** The CROP column goes; the crop lives in the preview panel and in
   the element record.
5. **It fits.** With the 3D pane and the preview pane at reasonable widths on a 3840 px
   display the whole grid is visible without horizontal scroll; at 1600 px wide with the preview
   open, every row's part and element and total are clickable (the 59 px slit, routed). Decide
   what gives at narrow widths (rails scroll, pane collapses, minimum width) and state it.
6. **One horizontal scroll.** Dragging the DAG horizontally scrolls the grid with it, and the
   grid may run behind the DAG canvas; the DAG's own drag-to-pan keeps working.

## Definition of done

- Screenshots at 3840 px (3D + preview open) and 1600 px (preview open) on the kinematic
  study, plus the grip-length study to show a linear stack reads the same way.
- A browser check that every grid row's part cell is clickable at 1600×1000 with the preview
  open.
- Viewer browser tier and the `[real]` tier green; the column-count and nav-mirror pins
  re-measured where they change, reasons stated.
- Lesson (`docs/sessions/lessons/LESSONS_20261105_the_grid_fits_the_screen_and_its_brackets_say_what_nests_in_what.md`):
  the brace geometry, the width budget per column, what gives at narrow widths.
