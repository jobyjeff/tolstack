---
type: feature
priority: med
status: open
area: topology/v2
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261119_a_link_is_a_machined_part_and_two_bearings_each_two_races.md
---

# The inner races at the pitch arm and the tangential link mount sit on a stand-in for hardware nobody has authored

Since 2026-11-19 (`a_link_is_a_machined_part_and_two_bearings_each_two_races`)
each of v2's four bearing inner races sits on its mating part's attachment
bore by one `pin_in_bore` gap edge, a stand-in for the hardware between them.
At the two pitch-plate ends the staged handoff
`the_pitch_plate_carries_its_own_features_and_each_lug_is_a_bolt_stack`
replaces it with the bolt stack Jeff described. **At the pitch arm and at the
tangential link mount nothing is staged**, and the end-stop study's chain
runs through both:

| stand-in edge | mating bore | what the meshes show within ~12 mm of the ball |
|---|---|---|
| `pitch_link_lower_inner_race_on_pitch_arm` | `pitch_arm_link_bore` | `asm217755_217970_001` (Enovia: pitch link washer, IN_WORK) in `P1-215071-001.1`, centred 3.2 mm from the ball on the arm's bore; an `NAS1149V0332H` washer in the same sub-assembly; no bolt mesh within reach |
| `tan_link_lower_inner_race_on_mount` | `tan_link_mount_bore` | `asm217755_214723_002`, `asm217755_214936_002` (NAS76A3-006P.1) and `asm217755_215198_001` (213667-001.1), under the CW mount 215175-001 |

The questions for Jeff, with options and a recommendation, are in
`docs/sessions/lessons/LESSONS_20261119_a_link_is_a_machined_part_and_two_bearings_each_two_races.md`,
"Questions for Jeff" (3 and 4). The same list asks whether a swage is a
`press_fit` (1), which part number 213863's and 213861's instances carry (2),
whether a split MS14103-3 mesh is worth asking rotorkit for (5), and whether
the four centres stay bound on the balls (6).

Recommendation: a strategy session puts questions 3 and 4 to Jeff together
with link 5's bolt stack. The answer is most likely the same stack shape at
the arm and the mount (bushing, race, washer, bolt), and one follow-on
handoff can author all four ends alike.
