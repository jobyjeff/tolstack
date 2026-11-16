---
type: feature
priority: med
status: open
area: apps/annotate
reporter: agent
found_by: docs/sessions/HANDOFF_20261115_a_suggestion_names_its_face_and_the_mating_side_ranks_the_candidates.md
---

# A bore opposite a bound ball centre gets no ranked mates

`AA.rankMatingFaces` (`apps/annotate/suggestions.js`) asks two relations: a
round face on the bound round face's axis, and a flat face against the bound
flat face. A bound **sphere** asks nothing (`AA.MATE_RELATIONS.spherical` is
null). On model v2 with the 2026-11-15 log, that leaves four unbound sides
with a bound side opposite and no ranked list:

| unbound side | bound opposite |
|---|---|
| `pitch_arm@pitch_arm_link_bore` | `pitch_link@pitch_link_lower_sphere_centre` (face 104) |
| `pitch_plate_215177_001@pitch_plate_link_attach_bore` | `pitch_link@pitch_link_upper_sphere_centre` (face 140) |
| `pitch_plate_215177_001@pitch_plate_tan_link_attach_bore` | `tan_link_212956_005@tan_link_upper_sphere_centre` (face 0) |
| `tan_link_mount_215175_002@tan_link_mount_bore` | `tan_link_212956_005@tan_link_lower_sphere_centre` (face 64) |

The natural relation is the contact engine's `ball_in_seat`: a bore whose
axis runs through the ball's centre, nearest radius first (and a concave
sphere sharing its centre). Its tolerances need measuring on pairs where both
sides are bound, and none of these four is bound on both sides yet, so the
thresholds cannot be set the way the cylinder and plane ones were (the
2026-11-15 lesson's table). The four bore sides above still list their agent
proposals and contact faces as before.
