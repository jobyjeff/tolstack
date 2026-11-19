---
type: bug
priority: low
status: deferred
area: meshes
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261117_the_blade_and_piston_joints_are_authored_as_what_the_parts_show.md
defer_until: 2026-12-17
class: mesh_carries_duplicate_solids
resolution: triage 2026-11-17 -- low, deferred by default 30 days; class mesh_carries_duplicate_solids
---

# The blade root's mesh carries near-copies of four of its solids

`blade_root`'s alias mesh, `asm217755_216332_001_bb3745d2` (the 20-solid
geometry of `ISSUE_20260930_four_pitch_linkage_alias_rows_wait_on_rotorkits_extraction.md`),
has solids that occupy the same space as one another. Each pair below has the
same extent and nearly the same face count and area, in the mesh's own frame:

| solids | faces | area (mm²) | extent |
| --- | --- | --- | --- |
| 2 and 17 (the metal root fitting the pitch arm sits on) | 64 / 68 | 17978 / 17901 | x 76.8 to 118.0, y and z ±37 |
| 3 and 15 | 914 / 918 | 672255 / 672423 | x 73.9 to 1410.0 |
| 4 and 16 | 927 / 927 | 1288812 / 1288812 | x 180.0 to 1498.9 |
| 10 and 18 | 104 / 101 | 156575 / 156601 | x 180 / 190 to 1497 |

The two halves of each pair are not identical: the pitch-arm boss is faces
1060/1061 on solid 2 (-8.96 to 8.00 along the pitch axis) and 6439/6440 on
solid 17 (-8.86 to 8.00). So these may be two revisions of the same bodies,
both exported into one product, rather than a mesh written twice.

**Why it matters:** a face picked on the blade root binds one copy's face id.
The other copy's face, in the same place, is a different key, so the same
feature can be bound twice under two ids. Handoff
`the_blade_and_piston_joints_are_authored_as_what_the_parts_show` cites both
copies in the new nodes' notes and binds neither.

**What would settle it:** read the STEP product at `0:1:1:207` of
`217755-001 A.1 PROPULSION ASSEMBLY, PROPELLER, CW Released.stp`. If it
really carries the doubled bodies, the extraction is faithful and the question
is which copy is the part. If it does not, rotorkit's extraction wrote them
twice.

## 2026-11-17 triage sweep

Low, deferred by default. Source: dispatch/docs/sessions/lessons/LESSONS_20261117_triage_sweep.md.

## Addendum 2026-11-19 (walk `the_walk_reads_the_binding_flow_and_the_pitch_plate_on_the_merged_page`)

**The binding flow now binds both copies at once, and it ranks the copy
first.** In a scratch copy of the log, with the pitch arm's bore bound, the
blade root's locating-boss end listed its mates in this order: 6440, 6439
(solid 17), 1061, 1060 (solid 2), then 6667, 6666. A Take on face 1060 wrote
**one event holding four faces**: 1060, 1061, 6439 and 6440. The seat's Take
on 1079 bound 1079 and 6432 the same way, and the offered cross-pin pattern
bound faces in three solids. So the double-key risk this issue describes has
become a different one: every blade-root feature is bound across both copies,
and any fit or position read from it averages two bodies that are not
identical. Shots `06b_blade_boss_mates_offered_crop` and
`09a_blade_clocking_offer_crop` in
`docs/sessions/lessons/shots/the_walk_reads_the_binding_flow_and_the_pitch_plate_on_the_merged_page/`.
Jeff's real log has no blade-root binding yet apart from the bearing bore, so
nothing on his page is affected today.
