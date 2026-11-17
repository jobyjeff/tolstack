---
priority: high
depends_on: [a_joint_says_what_kind_it_is]
model: opus
hitl: false
---

# HANDOFF 2026-11-17 — the_base_stack_joints_are_seat_boss_and_pattern: the two mount joints above the hub are authored as their three constraints

Source: Jeff, 2026-11-10: hub ↔ tangential link mount, tangential link mount ↔
gas-spring mount and gas-spring mount ↔ piston cover "all have the same datum
style with a flange, central locating boss, and fastener pattern for
clocking". Jeff, 2026-11-17: go ahead and propagate "the three parallel joint
types (flange, boss, and hole pattern) to the gas spring mount etc". Baseline:
`master` with `a_joint_says_what_kind_it_is` merged (a shared node can state
`fastener_pattern`). Third of a chain of six; the next link does the blade and
piston joints, so leave those alone.

Scope: `docs/topologies/topology_vpa_end_stop_v2.json`, the tests that pin its
counts and its model view, `docs/DAG_TOPOLOGY.md` where it describes v2. Read
v1 (`topology_vpa_pitch_linkage.json`) for ids; do not edit it. `apps/` only
under item 5. Do NOT touch `docs/topologies/map_vpa_end_stop_v2.json` — the
map draws a joint from the model, and a joint that needs a layout edit to
read is a finding, not a fix.

**Jeff's real binding log is read-only**
(`C:\workspace\tolstack\data\inbox\feature-identity\`): count its files
before and after; any bind you try goes to a scratch data root.

## The pattern to copy: hub ↔ tangential link mount, as v2 authors it today

| Constraint | Authored as | Ids |
|---|---|---|
| Flange (seat) | a node both parts share | `tan_link_mount_hub_face` (mount, hub) |
| Locating boss | a gap edge, `pin_in_bore`, between a datum feature on each part | `hub_boss_in_tan_link_mount_pilot`: `hub_spindle_bore_axis` → `tan_link_mount_pilot_bore` |
| Fastener pattern | a node both parts share, `interface: fastener_pattern` | `tan_link_mount_fastener_clocking` (mount, hub) |

Each part ties those features to its own with structural edges that carry no
dimension and say what would close them (hub:
`hub_spindle_to_tan_link_mount_face`, `hub_boss_to_tan_link_mount_fasteners`;
mount: `tan_link_mount_height`, `tan_link_mount_pilot_to_bore`,
`tan_link_mount_fasteners_to_bore`). The map draws the joint as a bundle of
three parallel routes with three symbols.

## What the two joints have today

- tangential link mount ↔ gas-spring mount: the seat only,
  `tan_link_mount_gas_spring_seat` (gas-spring mount's datum A on the mount).
- gas-spring mount ↔ piston cover: the seat only,
  `piston_cover_mount_flange_seat`.

## Deliverables

1. **Find each constraint in the geometry before authoring it.** For both
   joints, on the two parts' meshes (`docs/topologies/part_mesh_aliases.json`
   → `C:\workspace\tolstack\data\meshes\<sha>\`, placed by the assembly as the
   3D pane places them): the coaxial boss and bore that locate one part in the
   other, and the ring of like holes on each part that the fasteners pass
   through. The repo already has the tools — the contact and mate ranking
   (`AA.rankMatingFaces`, `docs/ANNOTATION_SURFACE.md` "Contact suggestions")
   and the pattern detection (same document, "A hole pattern"). Record per
   constraint, in the lesson and in the new node's or edge's `note`: the face
   ids on each part, the two diameters for a boss and bore, the hole count,
   hole diameter and circle diameter for a pattern. **These are evidence that
   the feature exists, never values**: no edge gains a dimension here, and the
   one rule of this repo stands (`CLAUDE.md`).
   Which part carries the boss and which the bore is read from the meshes,
   not assumed from the hub joint.
2. **Author what the geometry shows, in the pattern above.** For each joint: a
   datum feature on each part and a `pin_in_bore` gap edge between them for
   the boss; one shared node with `interface: fastener_pattern` for the
   pattern; structural edges on each part tying the new features to that
   part's existing ones, each with its "what would close it" sentence and no
   dimension. Names follow "Naming a feature" in `docs/DAG_TOPOLOGY.md` (the
   feature, not the part; a shared feature names the seated part; one spelling
   of locating boss, fastener pattern). Ids: where v1 already has the feature,
   v1's id (`ids_from`); otherwise new ids in the existing style. Edge order
   is authored: the ground body keeps reading up the stack from the hub.
3. **A constraint the geometry does not show is not authored.** If a joint has
   no boss (it is located some other way), or the pattern is not a ring, write
   what is there in the lesson with a shot, file an issue with `needs: jeff`
   and the one question, and author the rest. Do not invent a variant.
4. **The counts and the model view follow.** Update every pin on v2's part /
   node / edge / interface / joint counts in the same change and say the old
   and new numbers in the lesson. The solver pairing and `ids_from` checks
   stay green.
5. **Look at what the page does with them.** After
   `scripts/rebuild_projections.ps1` against a scratch data root, on your
   branch's page: the map shows three bundles up the ground column, each with
   seat, boss and ring of dots; the layout's defect notes are zero; the tree
   lists each joint's three constraints; the new features show as unbound and
   the All · Unbound filter finds them; a hole of one new pattern offers "Take
   all N holes" (take it, on the scratch root, and shoot it). A defect that is
   a few lines in the map or the tree is fixed here and named in the lesson; a
   larger one is an issue, and the model change still lands.

## Definition of done

- v2 on your branch's page shows the three ground-stack joints as bundles of
  three; shots at 3840 Side by side and a crop of each bundle in
  `docs/sessions/lessons/shots/<slug>/`, read with vision.
- The exploratory click-around on the real projection; tests per `CLAUDE.md`'s
  table.
- Lesson (`docs/sessions/lessons/LESSONS_20261117_the_base_stack_joints_are_seat_boss_and_pattern.md`):
  a table — joint, constraint, the ids authored, the mesh evidence — the
  counts before and after, anything not authored and why, the
  feature-identity file count before and after.
