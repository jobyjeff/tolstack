---
priority: high
depends_on: [the_groups_switches_reach_the_map_and_the_grid_brackets_an_assembly_in_two_bodies]
model: opus
hitl: false
---

# HANDOFF 2026-11-19 — a_link_is_a_machined_part_and_two_bearings_each_two_races: in v2 each link is a machined part and two spherical bearings, each bearing an inner and an outer race, and all four ball joints are in the graph

Source: Jeff's note `20261119T142516_ci28ci` (2026-11-19):

> Tan link assembly has both bearings, but neither of them interact with the
> graph. In reality they need to be in the chain. … the spherical bearing
> itself is two bodies joined by the spherical joint. Outer race is located
> with a boss-bore to the machined link part, it's actually swaged into the
> housing so I'm not sure how to represent this (zero distance gap with a
> tolerance?). Inner race has a bore and a set of flanges (one side is
> located to the pitch plate's flanged bushing, the other side is clamped by
> the straight bushing). The pitch link assembly currently only has one of
> the bearings included, also not wired into the graph yet. Pitch link and
> tan link have identical topology (resolves to a two force member with
> spherical joints at both ends, so the machined part and two outer races
> should resolve to a single value: it's length). This also means both link
> assemblies are flexible, and contain a single rigid body plus part of two
> other rigid bodies (the inner races are actually part of the mating parts'
> rigid bodies)

And: "Getting the kinematic end stop study fully incorporated is top
priority."

Link 4 of the chain. Links 2 and 3 made the schema, the map and the grid able
to hold an assembly whose parts sit in two bodies; read their lessons first.
Link 5 (`the_pitch_plate_carries_its_own_features_and_each_lug_is_a_bolt_stack`)
replaces what this handoff leaves at the two pitch-plate ends with the bolt
stack Jeff described; this handoff authors the links and the four joints.

Baseline: tolstack `master` at `ccfe4926` plus the handoffs ahead in the
chain. Scope: `docs/topologies/topology_vpa_end_stop_v2.json`,
`docs/topologies/map_vpa_end_stop_v2.json`,
`docs/topologies/part_mesh_aliases.json`, the tests and docs a model change
moves (list below), and whatever the bindings rule (item 6) needs in the fold.
Do NOT touch v1 (`topology_vpa_pitch_linkage.json`), the kinematic study
file, `C:\workspace\linkage`, the vocabularies (no new interface word), or
the pitch plate's own parts and features (link 5).

## What v2 holds today (read 2026-11-19)

- Bodies: `tan_link` (link) = `tan_link_212956_005`,
  `spherical_bearing_tan_link`, `spherical_bearing_tan_link_ms14103_3`;
  `pitch_link` (link) = `pitch_link`, `spherical_bearing_pitch_link`.
- The three bearing parts have no node. The pitch link has one bearing part;
  its mesh has two. Neither machined link is a part.
- Each link assembly owns its two sphere centres
  (`pitch_link_lower_sphere_centre`, `pitch_link_upper_sphere_centre`,
  `tan_link_lower_sphere_centre`, `tan_link_upper_sphere_centre`) and its
  length edge (`pitch_link_length`, `tan_link_length`, structural, `part` =
  the assembly). All six ids are v1's. linkage's sweep
  `vpa-pitch-p2-20261105-204957` joins on the four centres
  (`C:\workspace\linkage\linkage\vpa.py:424-434`), and v1's kinematic study
  names both length edges as contributors.
- Four `spherical` gap edges, v1 ids, each from a bore on the mating part to
  a sphere centre on the link: `pitch_arm_link_joint`
  (`pitch_arm_link_bore`), `pitch_plate_link_joint`
  (`pitch_plate_link_attach_bore`), `tan_link_mount_joint`
  (`tan_link_mount_bore`), `tan_link_plate_joint`
  (`pitch_plate_tan_link_attach_bore`).
- Meshes (`C:\workspace\tolstack\data\meshes\<sha>\provenance.json`):

  | Thing | Mesh `part_id` | Solids | Alias today |
  |---|---|---|---|
  | MS14101-3, both ends of the pitch link | `asm217755_MS14101_3_815597cb` | 2 (26 + 10 faces), instances `…/213862-002.1/MS14101-3.1` and `.2` | `spherical_bearing_pitch_link` |
  | MS14101-3, tangential link, mount end | `asm217755_MS14101_3_34f032f0` | 2 (26 + 10) | `spherical_bearing_tan_link` |
  | MS14103-3, tangential link, plate end | `asm217755_MS14103_3` | 1 (38 faces) | `spherical_bearing_tan_link_ms14103_3` |
  | pitch link machined part 213861-002 | `asm217755_213861_002` | 1 | none |
  | tangential link machined part (product 213863-004, instance named `213863-002.1`) | `asm217755_213863_004` | 1 | none |
  | 213862-002 pitch link assembly | `asm217755_213862_002` | 5 | `pitch_link` |
  | 212956-005 tangential link assembly | `asm217755_212956_005` | 4 | `tan_link_212956_005` |

## Deliverables

1. **Parts.** Under each link assembly: its machined part and two bearings
   (the pitch link gains its second). Under each bearing: an inner race and
   an outer race. Names carry the number and the everyday name; a number is
   cited from the mesh's provenance or the product-structure page
   (`docs/sessions/lessons/REVIEW_20261117_the_models_parts_against_the_product_structure.md`),
   never recalled. Where two sources disagree (213863-004 against -002), use
   what the mesh's product says and put the disagreement on the lesson's
   question list. Which solid of MS14101-3 is which race is read from the
   geometry (say how). MS14103-3 is one solid: author its two races anyway
   (Jeff: every spherical bearing is two bodies) and say in the lesson what
   that costs a pick.
2. **Bodies.** Each link's body is its machined part and its two outer
   races. Each inner race is in the body of the part it is fixed to: the
   pitch plate's body at both plate ends, `blade` at the pitch arm, `base`
   at the tangential link mount. The link assemblies and the bearings are
   then in no body (link 2's rule). The pairing with linkage's `BODY_PARTS`
   (`tests/test_topology.py:1352`, allowance list at :990–999) is updated,
   not loosened.
3. **Features and joints, per bearing.**
   - Outer race: its outside diameter, and its socket centre. The socket
     centre **is** the link's sphere centre: the four ids above move from the
     link assembly to the outer race that carries them (link 2's shared-id
     rule allows a descendant) and are not renamed.
   - Machined part: a bore at each end; one structural dimension between
     them.
   - Outer race in its bore: a gap edge, `press_fit` (strategy's answer to
     Jeff's "not sure how to represent this": a swage is an interference
     that never moves; no new word. The question goes on the review page).
   - Inner race: its bore and its ball centre, with a structural dimension
     between them.
   - The ball joint: one `spherical` gap edge, inner race's ball centre to
     outer race's socket centre. New ids; the four v1 joint ids leave v2.
   - The inner race on its mating part: one `pin_in_bore` gap edge from the
     mating part's bore (`pitch_arm_link_bore`, `tan_link_mount_bore`,
     `pitch_plate_link_attach_bore`, `pitch_plate_tan_link_attach_bore`) to
     the inner race's bore. At the two plate ends this is a stand-in that
     link 5 replaces with the bolt and bushings. At the pitch arm and the
     mount, list in the lesson what hardware the meshes show there (the
     instances beside each ball, including the unidentified
     `asm217755_217970_001`) as questions for Jeff; do not author it.
4. **The length stays one value.** `pitch_link_length` and `tan_link_length`
   keep their ids, their ends and their `part` (the link assembly, now an
   ancestor of both ends' parts): Jeff's "the machined part and two outer
   races should resolve to a single value". Nothing in v1, the kinematic
   study or linkage changes, and the sweep still plays on v2
   (`AA.sweepPlaysOn`).
5. **The map.** Authored places for the new parts so each bearing's outline
   straddles the border between its link's district and its neighbour's,
   outer race on the link's side, the ball joint's symbol between the races.
   Zero layout notes. Flip the Groups switches and look.
6. **Jeff's bindings keep reading.** His log
   (`C:\workspace\tolstack\data\inbox\feature-identity\`, 100 events) binds
   faces to some of these features under today's keys, and
   `scripts/fit_bound_features.py` turns the sphere centres into the fits
   linkage reads. Write nothing to that log. After this handoff, on his real
   log: every feature that moved to a child part reads bound to the same
   faces it does today, and `fits.json` gives the same four centres (state
   the eight numbers before and after). How the fold follows a feature to
   the member that now carries it is yours to design; say it in
   `docs/ANNOTATION_SURFACE.md`. **If you cannot hold this without writing
   an event or losing a fit, stop short:** leave the four sphere centres on
   the link assemblies, author the rest, and file the question for Jeff
   (`needs: jeff`).
7. **Everything a model change moves** (from the 11-18 lesson: a stack-data
   change is a browser-test change): `tests/test_topology_map.py`
   (`V2_PLACED_CHILDREN`), `tests/test_model_view.py` (`MODEL_V2_COUNTS`,
   `MODEL_V2_WITHIN`,
   `test_model_v2_puts_each_bearing_inside_its_link_assembly`),
   `tests/test_topology.py` (`test_children_and_the_tree_order_of_model_v2`),
   the re-derived counts in `apps/viewer/README.md` and
   `apps/viewer/views/topology.js`, `docs/DAG_TOPOLOGY.md`'s prose on v2,
   the map file's `provenance.arrangement`, alias rows for every new part.

## Definition of done

- v2 loads; every gap edge's two ends are in different parts; each ball
  joint is one `spherical` edge between an inner and an outer race in two
  different bodies; each link body is exactly a machined part and two outer
  races (asserted by name).
- The sweep `vpa-pitch-p2-20261105-204957` plays on v2; the four fitted
  centres are unchanged (asserted to the stored precision).
- On a copy of Jeff's log (never the real one): the tree shows each link as
  machined part, two bearings, four races; binding one unbound race feature
  works end to end.
- Shots, read before the lesson: the map's two link regions at 3840 Side by
  side and 1536 wide, the tree with a link open, the grid with a bearing's
  rows, the 3D pane with one race selected.
- Tiers as `CLAUDE.md`'s table.
- Lesson (`docs/sessions/lessons/LESSONS_20261119_a_link_is_a_machined_part_and_two_bearings_each_two_races.md`):
  a table of every v1 id v2 no longer carries and the v2 chain that stands
  in its place (the first tolerance study on v2 will be written from it);
  the questions for Jeff (the swage word, 213863's number, the hardware at
  the pitch arm and the mount, MS14103-3's one solid); how bindings follow
  a moved feature; what link 5 inherits at the two plate ends.
