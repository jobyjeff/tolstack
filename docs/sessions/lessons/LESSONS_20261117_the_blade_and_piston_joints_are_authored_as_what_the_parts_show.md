# Lessons — the_blade_and_piston_joints_are_authored_as_what_the_parts_show (2026-11-17)

Handoff: `docs/sessions/active/HANDOFF_20261117_the_blade_and_piston_joints_are_authored_as_what_the_parts_show.md`.
Jeff's "variants of the same style" are now written down, one per joint, as
the meshes show them:

- **pitch plate ↔ piston body** is the ground stack's style whole: seat, boss
  and fastener pattern.
- **blade ↔ pitch arm** is a seat, a bore on a boss, and a clocking that is one
  radial hole line, not a ring.
- **piston body ↔ the two heads**: one spigot locates both heads. The lower head
  is a plain ring, clamped between the body and the upper head, and the upper
  head is bolted to the piston body through the lower head's bore.

So the two heads' shared face stays a seat alone, and **upper head ↔ piston
body is a joint v2 did not have** (joints 15 → 16).

## Method

Every face of the six parts was fitted with `feature_geometry.fit_part_faces`
and moved to the assembly frame with each mesh's own `placement_world`.
Pairs were then searched across the two parts of each joint:

- opposed coplanar planes (a seat);
- coaxial cylinders within 1.5 mm of each other's radius (a fit);
- `pattern_siblings` / `hole_pattern` rings matched centre for centre;
- a facet-normal test to tell a boss from a bore.

The scratch scripts are not committed; this table is the evidence.

The plate, the piston body and both heads share one placement (the
`P3-214700.3` sub-assembly's), so their numbers are in the assembly frame. The
blade mesh has one instance, at blade slot `prd-e-03372837.2`, not the
topology's blade 1. So the blade and the pitch arm were both placed at slot
.2's occurrence and measured about the arm's bore axis.

The repo's own contact suggestions, rebuilt from this tree, rank exactly these
faces as the **single candidate** for each new gap:

| gap | radial clearance | axial overlap |
| --- | ---: | ---: |
| blade boss | 0.015 | 15.9 |
| lower head | 0.000 | 1.49 |
| upper head | 0.000 | 1.01 |
| plate pilot (existing) | 0.016 | 2.0 |

All values are in mm.

## The table

| Joint | Seat | Fit | Pattern | Other | Authored ids | Evidence (mesh faces; never a value) |
| --- | --- | --- | --- | --- | --- | --- |
| blade bonded assembly ↔ pitch arm | existing `pitch_arm_root_seat`. **Asked:** a 0.025 mm gap in the CAD | the arm's Ø64.030 bore on the root fitting's Ø64.000 boss | one radial Ø6.350 hole line through both (two holes, 180° apart), under v1's `fastener_pattern` | nothing on the arm's other end face | `pitch_arm_blade_root_bore`, `blade_root_pitch_arm_locating_boss`, gap `blade_root_boss_in_pitch_arm_bore`; shared `pitch_arm_blade_root_clocking` (v1's id) | arm 253/254 (−8.57 to 7.32 along the axis); blade 1060/1061 on solid 2 and 6439/6440 on solid 17. Holes: arm 266/267 and 271/272; blade 4558–4561, 6403–6406 and 6572–6575, at 57.0° and 237.0°, square to the axis within 0.04°. Seat: arm 250 to blade 1079/6432. |
| pitch plate ↔ piston body | **new** `piston_body_plate_flange_seat` (the body's datum A) | existing `pitch_plate_pilot_in_piston` | 5 holes, Ø4.900 (body) and Ø5.200 (plate), on Ø72.000, at 14/86/158/230/302° | — | the seat; shared `gas_spring_piston_fastener_clocking` | body 109 to plate 922, 382 and 383 at z 102.166. Pilot: plate 487/521 Ø41.040 in body 33/34 Ø41.072. Holes: body 110–119; plate 2, 3, 553/554, 559/560, 565/566, 571/572. |
| piston body ↔ lower head | existing `piston_body_head_seat` | body Ø40.000 spigot in the head's Ø40.000 bore | **none**: the head has ten faces and no hole | — | `piston_body_head_locating_boss`, `piston_head_lower_pilot_bore`, gap `piston_body_boss_in_lower_head_pilot` | body 4/5 (z 211.64–214.84); head 1/2 (z 211.84–213.33); seat body 168 to head 7 at z 210.835 |
| lower head ↔ upper head | existing `piston_heads_seat` | **none**: both Ø40 bores sit on the body's spigot; the OD rings 56.884 / 56.784 locate nothing | **none** | — | nothing | seat lower 0 to upper 113 at z 213.326, 0.0004 apart |
| piston body ↔ upper head (**new joint**) | **none**: the body's top (face 1, z 215.835) is 0.100 below the recess floor (151) | the same Ø40 spigot in the upper head's Ø40 bore, the top 1.0 of it | 3 holes, Ø5.200 (head) and Ø5.300 (body), on Ø22.400, at 35.4/155.4/275.4° | **Asked:** the body's 3 × Ø7 pockets, its 6 × Ø2.515 holes and the Ø4 centre bore have no partner | `piston_head_upper_pilot_bore`, gap `piston_body_boss_in_upper_head_pilot`; shared `piston_head_upper_fastener_clocking` | head 114/115 (z 213.83–214.94); holes head 120/121, 124/125, 128/129 and body 144–149 |

Structural edges, each "Value to come from <drawing>'s drawing.":

- **pitch arm:** `pitch_arm_bore_to_clamp_face`, and v1's
  `pitch_arm_link_hole_to_clocking_hole` (v2 drops v1's band and transform).
- **blade root:** `blade_root_bearing_to_pitch_arm_boss`,
  `blade_root_boss_to_clocking`.
- **plate:** `pitch_plate_pilot_to_piston_flange`,
  `pitch_plate_pilot_to_piston_fasteners`.
- **piston body:** `piston_body_id_datum_to_flange`, `_to_fasteners` and
  `_to_head_boss`, and `piston_body_head_boss_to_fasteners`.
- **lower head:** `piston_head_lower_pilot_to_feather_stop`.
- **upper head:** `piston_head_upper_pilot_to_step_face`,
  `piston_head_upper_fasteners_to_step_face`.

The two questions are in
`docs/issues/ISSUE_20261117_the_blade_and_piston_joints_leave_questions_for_jeff.md`
(`needs: jeff`, a shot each).

## Decisions the handoff left to me

- **Authoring the fifth joint.** The handoff listed four joints. The
  geometry of upper head ↔ piston body is unambiguous: the bores line up on one
  spigot and the three holes line up centre for centre. So I authored it rather
  than ask, and the heads' seat stays a joint of one. If Jeff reads the
  upper head as located on the lower head, the change is to move
  `piston_head_upper_pilot_bore`'s gap and the pattern. Nothing else moves.
- **The plate/piston seat is a new id.** v1 has the face as
  `piston_body_plate_flange`, on the body alone and "deliberately not an
  interface". `test_a_model_that_reuses_anothers_ids_means_the_same_feature_by_each`
  holds a shared id to the same parts in both models, so v2's two-part seat
  cannot take that id.
- **The cross pin is `fastener_pattern`**, because v1 already says so of
  `pitch_arm_blade_root_clocking`, and the holes do fix rotation about the
  pitch axis. It is a radial line, not a ring, and the note says so.
  `pattern_siblings` finds no pattern there: the two holes are one coaxial
  surface.
- **Names.** "A feature two parts share names the part that seats on it":
  "piston body flange face", "upper piston head fastener pattern". The
  spigot is "piston head locating boss" because it receives both heads. Both
  heads' bores are "pilot bore", and the two gap names say which head.

## The map: one defect, fixed in `apps/viewer/map.js`

The browser tier's `[real] the map draws the model's counts … reports no
defect` went red on the new joint. The upper head ([2,0]) and the piston body
([2,2]) are stacked in one column with the lower head ([2,1]) between, so
both routes ran straight through the lower head's box. This is the case the
handoff asked about: "a bundle between two boxes stacked in one column must
still read". It did not, until the fix.

The fix is about 30 lines:

- A feature whose **every** interface is with a part beyond a part between
  takes the column's outer flank. The body's spigot also meets the lower head,
  so it stays on top.
- Such a route (`detour`) runs out to a lane past every box between it and
  back. A joint's earlier constraints take the outer lanes, so the two nest.
- The drawing's extent takes the routes in.

The layout file is untouched. The map now reports no notes, and shot `05`
shows both routes reading beside the lower head. One cosmetic point: the
outer lane (the ring of dots) runs just outside the pitch plate district's
dashed border.

There is a new fast guard ("a joint between two parts of one column with a
part between them …") with spec `fast__a-joint-between-…__0e605dc8.json`, and
the fast census pin moved 721 → 722.

My first cut of `detour` spelled its stub points exactly as `route()` does.
That made an existing witness's `find` anchor match twice, and
`test_mutation_witnesses` went red: "a `find` matches 2 places … the anchor
has rotted". `detour` now takes its stub ends from `route()`'s own output.
**A copied line in a witnessed file is a rotted anchor for somebody else's
spec.**

## Counts, before → after

| | before | after |
| --- | ---: | ---: |
| parts | 15 | 15 |
| nodes (interfaces, DAG doc) | 31 | 40 |
| edges | 40 | 56 |
| branch points | 13 | 19 |
| grounded loops | 10 | 17 |
| gap edges | 10 | 13 |
| features (model view) | 42 | 55 |
| shared features | 22 | 30 |
| dimensions | 30 | 43 |
| interfaces (contacts + gaps) | 21 (11 + 10) | 28 (15 + 13) |
| within bodies (base / pitch plate / blade) | 13 (9 / 3 / 1) | 20 (9 / 8 / 3) |
| joints | 15 | 16 |
| compound joints | 3 | 7 |
| (features, dimensions): blade root / pitch arm / plate / piston body / lower head / upper head | (2,1) / (2,1) / (3,2) / (3,2) / (3,2) / (2,1) | (4,3) / (4,3) / (5,4) / (7,6) / (4,3) / (4,3) |

Pins moved:

- `tests/test_model_view.py`: the counts, and the per-body within counts
  (that test is renamed to `…_grounds_nine_the_plates_eight_the_blades_three`).
  The joint test also pins the four inner compound joints and the heads' seat
  as a joint of one.
- `tests/test_topology.py`: the plate pilot's incidence set.
- `docs/DAG_TOPOLOGY.md`: the inventory sentence, a paragraph, and the map
  rule.
- `apps/viewer/README.md` and `views/topology.js`, re-derived by probing the
  `[real]` checks in the scratch copy:
  - crossings 334 → 42 became 371 → 55 (v2 152 → 33);
  - v2's rail reuse is 29 over 11;
  - live nodes 74 of 119, 54 as a set, 20 reordered.

## Feature-identity log

The real log (`C:\workspace\tolstack\data\inbox\feature-identity\`) held
**84 files (83 events + README) before and 84 after**. It was never written.
The one bind went to the scratch copy as event 0084: Take all 5 holes on
`gas_spring_piston_fastener_clocking`, faces 110–119, fit "5 holes Ø4.9 on a
Ø72 circle".

## The click-around

The scratch root is `C:\workspace\tolstack\data\scratch\bpj`. It holds a
`git archive` of the branch with **no `git init`**, `data/` copied from the
main checkout, and `venv-win` and `node_modules` junctioned. The eight
builders ran from the worktree with `--data-root`, stamped `cdb6566d`; the
topology has not changed since.

The probe is `tests/debug_blade_piston_joints_20261117.mjs --root <root>`.
Shots are in `shots/the_blade_and_piston_joints_are_authored_as_what_the_parts_show/`,
all read:

| shot | what it shows |
| --- | --- |
| `01` | the map at 3840 Side by side |
| `02`–`06` | the five joints' bundles. The blade's and the plate's three-constraint bundles read like the ground stack's, and `05` is the detour. |
| `07` | the tree, with blade and plate joints of 3 / 3 / 2 / 2 / 1 constraints |
| `08` | All · Unbound: all 13 new features listed (filter count 43 = DOM rows 43 = the fold's 43) |
| `09`, `10` | the two questions, framed on an armed pick. In `10` the heads hide the pockets. |
| `11`, `12` | a hole of the piston body's ring offered as "5 like holes on one plane · Take all 5 holes", then taken |

Two notes on the shots:

- `camera face` frames nothing until a pick is armed on that part. My first
  `09`/`10` were the whole assembly.
- One console 404 per page is the probe server's missing mount, as last time.

## Test record

(below)

## Blocked actions

None.
