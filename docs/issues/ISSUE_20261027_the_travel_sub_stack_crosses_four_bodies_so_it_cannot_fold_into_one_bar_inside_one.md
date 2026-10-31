---
type: feature
priority: med
status: triaged
area: viewer/dag-layout
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261026_the_dag_draws_bodies_as_containers_and_joints_as_symbols.md
resolution: triage 2026-10-30: brief BRIEF_20260914_dag_layout_geometry_tradeoffs consumed 2026-10-29 without curing this (the sub-stack is still four dashed fields over four bodies with a display-only fold; no synthetic edge or own block was chosen); reopened for re-triage; triage 2026-10-30: gathered into a new brief with the other undecided layout questions
class: dag_layout_policy
strategy: docs/strategy/BRIEF_20261030_topology_layout_questions_the_redesign_left_open.md
---

# The travel sub-stack crosses four bodies, so it cannot fold into one bar inside one body

The handoff's deliverable 4 says a chain a `study_ref` names "is drawn as a
dashed field inside its body, collapsed to one bar labelled with the study's
title and its folded interval, expanding into its edges". The only live
`study_ref` (the blade-pitch kinematic study's travel between end stops) is
four edges on four different bodies:

| edge | body | walk row (body-major layout) |
| --- | --- | --- |
| `gas_spring_mount_flange_to_end_stop` | `base` | 9 |
| `piston_head_lower_thickness` | `piston_head_lower_214699_002` | 98 |
| `piston_head_upper_thickness` | `piston_head_upper_214698_002` | 100 |
| `piston_cover_flange_to_end_stop` | `piston_cover_214958_002` | 104 |

So there is no single body to draw it inside, and its rows are not contiguous.
Folding it to one bar geometrically means taking four edges out of the walk,
which disconnects the rails at their ends.

**What shipped instead (display only).** A dashed field round each of the four
bars, inside whichever body each is in, and the study's title and folded
interval once, at the topmost. Closed (the default, matching the contributor
table's group row), the four bars are drawn as one muted fold
(`rail__bar--folded`) that the label stands for; open, they wear their own
colours. The label and the table's group row open and close on one piece of
app state, so they move together. Pinned by
`[real] the travel sub-stack is a dashed field inside its bodies that folds
and opens with the contributor table's group row`.

**Options for a strategy session:**

1. Keep it as shipped. The fold is honest and costs nothing in layout.
2. Lay a sub-stack's edges out as their own block: a second grouping axis on
   top of body-major walking. It changes the walk for every page that is not a
   kinematic page, so it needs a decision about which grouping wins.
3. Draw a collapsed sub-stack as one synthetic edge between its two end nodes
   (`piston_head_upper_step_face` to `piston_cover_end_stop_shoulder`, the
   `travel_between_end_stops` gap's own ends). Hide the four edges and keep
   the rails joined through that edge. This is closest to the handoff's words.
   It needs the walk re-derivation to accept a synthetic edge.

Recommendation: 3 when a second `study_ref` arrives; 1 until then.
