---
priority: med
depends_on: [the_rail_holds_still_and_takes_the_face_jeff_picked]
model: opus
hitl: false
---

# HANDOFF 2026-11-05 — the_rail_reads_as_a_tree_of_bodies_joints_and_faces: the binding rail gets a visual hierarchy — deep indents, one style per element kind, anchored controls, and a state legend

Source: Jeff's forge note `20261105T164140_sm8hkc` (2026-11-05): "The second joint changed
formatting (turned orange) and the menu jumps around whenever you interact/expand elements, the
whole thing is still extremely jarring and unintuitive. Similar complaints to the grid view,
there's no meaningful styling cues to give contrast between different element/object types, the
indention for nested elements is way too shallow. Random checkboxes floating in space. Really
needs a lot of work, I'm not sure what else to say as I've already spent a couple hours trying to
make sense of *what* is wrong with it, as typed out above as best I can. The examples I gave are
just conceptual, I'm no graphic designer myself." Routed here:
`docs/issues/ISSUE_20261103_design_the_candidate_lists_disclosure_is_nearly_invisible_at_rest.md`.
Baseline: master after `the_rail_holds_still_and_takes_the_face_jeff_picked` (behaviour fixed,
words fixed; this is the look). The rail is built in `apps/annotate/app.js` (`candidateList`
`:3300`, `candidateTwisty` `:3273`, `candidateRow` `:3337`, `candidateAction` `:3376`) and
`sweep.js` (body rows `:1407`, joint rows `:~1414`); CSS tokens live in `apps/viewer/style.css`
`:root` and are paired by `tests/test_app_type_scale.py`; the rules are
`docs/DESIGN_TYPE_AND_COLOUR.md`. Scope: the rail's markup classes and CSS, a state legend, and
`docs/DESIGN_TYPE_AND_COLOUR.md` where a new rule is needed. Do NOT change rail behaviour,
commands or scroll handling (the handoff this depends on), the 3D scene, or the grid.

## Deliverables

1. **Four kinds, four looks.** Body, joint, joint end, candidate face each get one consistent
   row style (type size and weight from the scale, one glyph per kind, one indent step per
   level, and the step is wide enough that four levels read at a glance; measure the step
   against the grid's new brace indent so the two surfaces agree). The twisty is visible at
   rest (routed issue).
2. **Controls belong to rows.** Every checkbox and button sits in its row's control column,
   aligned, with a label or a hover that says what it does; nothing floats.
3. **States are a legend, not a surprise.** Bound / proposed / picked-this-session / contact
   candidate / declared-face each have one colour, and a legend at the top of the rail (or in
   the pane's help) names them. "Turned orange" is one of these and the lesson names which.
4. **One pass with the page in front of you.** Click-around on the live kinematic study with
   the rail open, all joints expanded, two ends bound; shots in the lesson's folder; the
   filmstrip of the expand/take sequence from the behaviour handoff re-filmed on the new look.

## Definition of done

- Screenshots: the rail at rest, fully expanded, mid-pick, with legend; side by side with the
  grid at the same zoom so the indent steps can be compared.
- `tests/test_app_type_scale.py` and the annotate browser tier green; no new inline colour
  literals (tokens only).
- Lesson (`docs/sessions/lessons/LESSONS_20261105_the_rail_reads_as_a_tree_of_bodies_joints_and_faces.md`):
  the kind → style table, the indent step, the legend, what orange was.
