---
type: chore
priority: med
status: open
area: topology/v2
reporter: agent
needs: jeff
ask: Say whether the pitch arm seats on the blade root's shoulder, and what the piston body's top pockets are for
found_by: docs/sessions/active/HANDOFF_20261117_the_blade_and_piston_joints_are_authored_as_what_the_parts_show.md
---

# The blade and piston joints: two findings the meshes do not settle

Handoff `the_blade_and_piston_joints_are_authored_as_what_the_parts_show` read
the four joints inside model v2's blade and pitch-plate bodies off the parts'
meshes and authored every constraint that was plainly there (the lesson's
table, `docs/sessions/lessons/LESSONS_20261117_the_blade_and_piston_joints_are_authored_as_what_the_parts_show.md`).
These two findings were not plain, so **nothing was authored for either**.
Each number is a measurement of a mesh, not a value.

| Joint | What the meshes show | The question | Shot |
| --- | --- | --- | --- |
| blade bonded assembly ↔ pitch arm | The seat v2 already has (`pitch_arm_root_seat`, "pitch arm clamp face") is the arm's face 250 against the blade root fitting's shoulder (faces 1079 / 6432). In the CAD the two faces are **0.025 mm apart**, not touching. The cross-pin hole through both parts lines up to within 0.02 mm, and the arm's Ø64.030 bore sits on the root's Ø64.000 boss. Nothing touches the arm's other end face (face 296). | Does the arm clamp against the shoulder, so the 0.025 is CAD placement slack? Or does the cross pin set the arm's axial place, so the face is a clearance and the seat should go? The seat is left as authored. | `docs/sessions/lessons/shots/the_blade_and_piston_joints_are_authored_as_what_the_parts_show/09_question_pitch_arm_clamp_face_250.png` |
| piston body ↔ upper piston head | Three Ø7.0 pockets on a Ø24 circle (faces 140–143, 150, 151; at 80.4°, 200.4° and 320.4°) are cut 4.0 deep into the piston body's top face. Six Ø2.515 holes in two rings (r 6.96 and r 12.50, near 0°, 120° and 240°; faces 8–19) are also in the top. Neither head has anything at those places. A Ø4.0 bore on the axis runs through the body's top (faces 0, 164) and through the upper head (faces 152, 153). | What are they: gas passages, a fill port, a tooling feature, or a pin or dowel the assembly CAD leaves out? If any of them locates the upper head, it is a constraint the model is missing. | `docs/sessions/lessons/shots/the_blade_and_piston_joints_are_authored_as_what_the_parts_show/10_question_piston_body_top_pockets_140.png` |

Each shot is the annotator's 3D pane framed on the named face, with a pick armed
on the part. In shot 10 the two heads hide the pockets from the framed view,
so the face ids above are the evidence there.

Meshes: pitch arm `asm217755_215071_001`, blade root
`asm217755_216332_001_bb3745d2`, piston body `asm217755_214700_002`, upper
head `asm217755_214698_002`.
