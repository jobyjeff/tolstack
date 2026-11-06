---
priority: high
depends_on: []
model: opus
hitl: false
---

# HANDOFF 2026-11-05 — the_dag_is_coloured_by_a_chosen_attribute_and_spaced_to_taste: group boxes are thin bright borders by group type, nodes and edges take a selectable colour overlay, and the graph has three widths

Source: Jeff's forge note `20261105T164140_sm8hkc` (2026-11-05), "# dag display": "Groups: Make
the group boxes full transparent (no fill), make the border very thin and bright, use different
colors for each group type. The smallest group (part level) could potentially still have a solid
fill, with all other borders displayed on top of the fill. let's experiment (make the fill
toggle-able in the view settings). Graph: We went back to white only for the graph edges, now
let's add the ability to color edges/nodes based on different attributes, similar to how FEA
plots can have different overlays, for example color by body, color by part, color by type (size
form etc). Make it extendable, any other color schemes that could be helpful? Add options to
change the aspect ratio of the 2d graph. It's still pretty bunched up (too narrow), I think having
an option to space it out to med and wide would be helpful to reduce clutter." Routed here:
`docs/issues/ISSUE_20261104_the_3d_scene_does_not_colour_a_body_with_its_dag_tint.md` and
`docs/issues/ISSUE_20261104_design_dashed_gaps_read_as_hashes_and_a_bodys_second_block_is_unnamed.md`.
Baseline: master after the 11-03 batch. Body fields are `rect.tv__bodyfield` in `railsSvg`
(`apps/viewer/views/topology.js:1639`, about `:1736`), CSS `apps/viewer/topology.css:579–600`
(stroke `rgba(255,255,255,.07)`, fill `var(--tv-body-n)`); `VA.BODY_TINTS` = 16; edges have one
ink `--edge-ink` (lit 4 px / unlit 1.5 px); glyph kinds in `apps/viewer/interface_glyphs.js`.
Scope: `railsSvg` body fields and names, the palette, a new overlay selector in the view
settings, the DAG's horizontal spacing, and the 3D scene's body colour (`apps/annotate/scene.js`
material colour only). Do NOT touch row order or the layout algorithm beyond spacing (owned by
`a_part_with_many_interfaces_is_drawn_as_a_component_with_pins`, which depends on this), the
grid, or the tween.

## Deliverables

1. **Groups.** No fill by default; a thin (1 px at zoom 1) bright border, one hue per group
   kind: study, body, part. Part-level groups may keep a solid fill; every border draws above
   fills. A view-settings toggle `group fill: off | parts | all`, persisted like the other view
   state. The red-wash legend and the unnamed second block of `base`/`pitch_plate` (routed
   issue) are resolved in the same pass: a body's second block carries a short repeat name.
2. **Overlays.** One selector, "colour by": `none` (the 11-03 white), `body`, `part`,
   `interface type` (the six glyph kinds), `sourcing` (traced / inferred / untraced / gap),
   `contribution` (a sequential ramp over |sensitivity| × band, kinematic studies only). The
   overlay colours nodes and edges; lit/unlit stays weight. Build it as a table of named schemes
   each mapping an element to a token so a seventh scheme is one entry; the lesson lists the
   ones you considered and did not build (Jeff asked "any other color schemes that could be
   helpful?"). Load the `dataviz` guidance before choosing the categorical and sequential
   ramps; the same tokens drive the grid's body tint (`VA.gridRowMarks`) and the 3D scene
   (routed issue), so one palette is seen three times.
3. **Width.** A view setting `graph width: narrow | medium | wide` scaling the column pitch;
   `narrow` is today's. Measure the crossing count and the pane width at each setting on the
   kinematic study and record them.
4. **Dashed gaps.** Gap edges read as hashes at small zoom (routed issue); choose a gap stroke
   that reads as "gap" at zoom 0.12 and at 1, and show both.

## Definition of done

- Screenshots in the lesson: kinematic study at each width, with each overlay, fill off and
  on; the 3D pane showing a body in its DAG tint.
- The sourcing legend names every tint the grid and DAG use (no unnamed wash).
- Viewer browser tier green; glyph census and body count pins keep their values.
- Lesson (`docs/sessions/lessons/LESSONS_20261105_the_dag_is_coloured_by_a_chosen_attribute_and_spaced_to_taste.md`):
  the scheme table, the ramps and their contrast check, the crossing counts per width.
