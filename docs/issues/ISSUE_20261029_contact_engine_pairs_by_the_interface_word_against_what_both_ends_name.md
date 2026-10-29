---
type: bug
priority: med
status: triaged
area: contact-suggestions
reporter: agent
found_by: docs/sessions/HANDOFF_20261028_an_agent_proposes_a_face_binding_and_a_human_ratifies_it.md
class: contact_engine_ignores_end_geometry
handoff: docs/sessions/HANDOFF_20261029_the_contact_engine_asks_the_ends_what_shape_they_are.md
---

# The contact engine picks its pairing from the edge's interface word, and on every "clear" edge that contradicts the shape both ends name

## What happens

`scripts/build_contact_suggestions.py` chooses one pairing per gap edge from
`interface_contact.CONTACT_PAIRINGS[edge.interface]` alone (`clearance` and
`pin_in_bore` → `cylinder_in_cylinder`). The nodes at the two ends are not
asked what shape they are. Measured 2026-10-29 by the first agent proposal pass:
the projection's summary says `single_clear_top: 4`, and **all four clear top
pairs are refused** by `scripts/propose_bindings.py`'s shape rule
(`feature_geometry.end_surface_class`, the annotator's own rule):

| edge | engine's clear pair | what the ends name |
|---|---|---|
| `tan_link_mount_end_centre_is_this_bearing` | bearing OD 34f032f0 face 0 in link eye 8f519ff4 face 83 (cyl/cyl, 0.003 mm) | `ball` centre / `spherical` centre, both spherical |
| `tan_link_plate_end_centre_is_this_bearing` | MS14103-3 OD e4414548 face 22 in eye face 79 | ball centre / sphere centre |
| `shank_out_pitch_link` | washer **bore** 3b641a00 faces 2/3 around the shank | `washer far face`, planar |
| `shank_out_vpa_out` | bushing **bore** 0cdfaf20 faces 4/5 around the shank | `bushing far face`, planar |

The same is true of the two `pitch_link_*_centre_is_this_bearing` edges, which
are not "clear" only because both eyes hold the same bearing part. The contact
these pairs find is real (the bearing is pressed into the eye), so it is
evidence. But it is evidence *for the edge*. It is not either end's face, and
the annotator colours it as "the faces that touch" for an element whose two
ends are ball centres.

A sibling in the shape rule itself: a node whose own name says nothing falls
back to the edge's name. So `bolt_point` ("bolt point (tip)") needs a planar
face on `bolt_length_11` ("length") and a cylindrical one on
`cotter_hole_from_point` ("hole"). One node, two classes.

## Why it matters

The proposal pass's rubric was "a clear top pair → propose both faces at
high". Applied literally, it would have proposed eight wrong-shape faces. The
CLI refused them, which is the point of the refusal, but the engine's "clear"
flag currently selects exactly the wrong edges.

## Suggested shape (needs a decision)

Either pair per END from the node's shape class (falling back to the interface
word only when a node is silent), or keep the interface-word pairing as the
edge's evidence and stop reporting it as candidates for the ends. The
`clear_top` count should then count only pairs whose faces pass the shape rule.
