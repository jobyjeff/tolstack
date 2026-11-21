---
type: chore
priority: med
status: triaged
strategy: dispatch/docs/strategy/drafts/DRAFT_tolerance_analysis_over_the_kinematic_model.md
area: topology/v2
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261119_the_pitch_plate_carries_its_own_features_and_each_lug_is_a_bolt_stack.md
---

# The pitch plate's bolt stacks leave five questions for Jeff

Model v2's two plate-end bolt stacks (handoff
`the_pitch_plate_carries_its_own_features_and_each_lug_is_a_bolt_stack`) are
authored from what the 217755-001 A.1 STEP and the meshes show. These points
were left as questions, not settled by guessing. The evidence for each is in
`docs/sessions/lessons/LESSONS_20261119_the_pitch_plate_carries_its_own_features_and_each_lug_is_a_bolt_stack.md`,
"Questions for Jeff".

| # | Question | What v2 does today |
|---|---|---|
| 1 | The bolts: the STEP's products are NAS6403U11D (pitch link) and NAS6403U14D (tangential link); the instances are *named* NAS6403U10D.3 and NAS6403U12D.1; v1 says the tangential link's is NAS6403U13H, which the STEP puts at the piston heads. Which numbers are on the drawing? | uses the products' numbers |
| 2 | The flanged bushings: product NAS77A3-015A (mesh and Enovia), instances named NAS77C3-015.n in the 215177-001 STEP. | NAS77A3-015A |
| 3 | NAS6403U14D has no installed mesh, so its shank cannot be bound. Ask rotorkit for one? | authored with no mesh |
| 4 | In the pitch link lug the bolt head bears on the straight bushing's end. Does that seat belong in the kinematic model, or with the deferred grip-length studies? | not authored |
| 5 | The MS14103-3 is one solid, placed with the link, so its bore leans on the lug's axis and overlaps the bushings by about 0.4 mm. Is a split, square mesh worth asking for? | measured, not used |

Recommendation: carry these to Jeff in the next strategy session's review page
beside link 4's six. None blocks the end-stop study, which reads none of these
values yet.
