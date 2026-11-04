---
type: chore
priority: med
status: open
area: specs/acquisition
reporter: agent
needs: jeff
ask: Drop the Trelleborg Slydring GR04WB328AT11 datasheet and drawing 214700-002 into the tolstack inbox
found_by: docs/sessions/HANDOFF_20261103_the_slide_joint_is_the_mounts_bushings_against_the_piston_body.md
---

# The gas-spring bushing tipping term needs the Slydring's ID band and the piston body's OD band

"Gas-spring bushing tipping" is unmodelled in three studies: the end-stop
studies (`study_pitch_system_end_stop_minus7/plus72.json`) and the kinematic
study. It is the source workbook's largest angular term (0.72 deg, its row 68).

Since 2026-11-03 the slide this term comes from is authored on the right
parts: `pitch_plate_slide_bushings_to_piston_body`, the piston body's OD
riding in the mount's two GR04WB328AT11 Slydrings. The term can now be
authored, but none of its inputs can be cited yet:

- **Radial clearance.** This is the Slydring's installed ID band minus the
  214700-002 OD band. Neither band is on file:
  - no Slydring datasheet is in `data/inbox/specs/`, and the hardware entry
    `GR04WB328AT11` is `not_transcribed`;
  - 214700-002 is not in `data/inbox/drawings/`. Jeff read Ø47.574 off that
    drawing, but no band.
- **Lever.** This is the axial spacing of the two rings. In the mesh it is
  the distance between the two r 25.387 seat grooves at the mount's
  occurrence: z 174.25–180.55 and z 202.31–208.61, about 28 mm centre to
  centre. That is a mesh measurement, not a band. 213668-002's drawing would
  cite it.
- **Its shape in a study.** A `disk` zone on `plate_slide`'s axis
  components, banded as a tilt in rad: clearance over spacing, for each ring
  pair. P2 already carries that joint's Jacobian (see the kinematic study's
  note).
