---
type: chore
priority: low
status: open
area: topologies/vpa_pitch_linkage
reporter: agent
found_by: docs/sessions/HANDOFF_20261026_the_tangential_link_cites_its_drawing.md
---

# The tangential link's cited length is bore-to-bore; the solver's points are ball centres

`tan_link_length` now cites 213863-004 A (61.40 basic, ⌖Ø0.1 B). That is the distance
between the link body's two bore axes. The kinematic study's `tan_link.point_a/b` are the
bearings' ball centres, and the offset of each ball centre from its bore axis
(`tan_link_ms14101_ball_centre_offset`, `tan_link_ms14103_ball_centre_offset`) carries no
dimension, so that part of the joint position error is in no contributor.

What would close it: the RBC catalog's MS14101-3 / MS14103-3 concentricity or ball-centre
callouts (spec library event 0006, pp. 21-22), cited as two more contributors (a sphere
each, or folded into the length). The mesh-derived 61.45 mm centre distance on run P2 is
0.05 mm above the drawing's 61.40, inside the cited band's full width.
