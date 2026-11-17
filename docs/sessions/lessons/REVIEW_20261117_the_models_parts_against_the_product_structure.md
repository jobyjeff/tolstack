# The end-stop model's parts, read against the product structure

2026-11-17. Measured, nothing authored: v2 (`docs/topologies/topology_vpa_end_stop_v2.json`) laid beside its meshes' source STEP and Enovia.

**Top three**

1. **Right:** 15 parts, 5 bodies; the two assemblies it already has (pitch link 213862-002, pitch anti-rotation link 212956-005) are real assemblies in Enovia, with the bearings it gives them.
2. **Flattened:** six of the 15 meshes are *assemblies* drawn as one part (hub 286 solids, mount 215175 40, blade 20, pitch plate 10, pitch link 5, tan link 4); the gas-spring mount 213668-002 is the one true single detail, and its "bushings" in the model are **bore features** (Slydring seats), not a part. **Two assemblies the model lacks are whole in one body** (Table 2: 215177-001, the piston group); the big real ones (216231-001 hub-and-blade, the moving-parts collector) are spread over 3 and 2 bodies and cannot be a `parent`.
3. **You decide:** (a) split the hub/pitch-link/tan-link/blade/plate meshes into detail plus children (re-keys 14 standing bindings, 6 of them on the hub); (b) whether Enovia *collectors* (P2/P3-213456-001, P3-214700, prd-e-03372837) count as assemblies for the model — they are in-work groupings, not physical parts; (c) which revision wins where the STEP and Enovia disagree (215175 -001 vs -002, 215176 -001 vs -002, 214820 -002 vs -003).

**Enovia was read** (token set; `enovia_sync` `bom.children` + `enginering_part_attributes`, read-only, 2026-11-17). Enovia reports the *current* structure; the STEP is the 217755-001 A.1 CW release, so a few children differ (noted per row).

Source tags: **[M]** v2 JSON / `part_mesh_aliases.json`; **[P]** `data/meshes/<sha12>/provenance.json` (`extraction`: `n_solids`, `product_is_assembly`, `instances`); **[E]** Enovia query; **[F]** fold of a copy of `data/inbox/feature-identity/` (84 files, 83 events; standing `bound` events and faces after supersede/retract; `fold_with_models`); **[V1]** `topology_vpa_pitch_linkage.json`.

## Table 1 — each v2 part (tree order by body)

| Body | Part id / name [M] | Mesh [M→P] and STEP source | STEP solids [P] | Enovia says [E] | Children in model [M] | Bindings on mesh [F] |
|---|---|---|---|---|---|---|
| base | `hub` propeller hub, 214373-002 | `asm217755_214373_002` (e28285d1e6c9); 217755-001 A.1 STEP, label 0:1:1:141 | **assembly, 286 solids** (20 leaves) | 214373-002 **Assembly** "dual bearing Gen5 hub assembly"; 8 child rows: 212475-003 outer race ×5, 214959-002 upper sleeve, 209637-006 wear ring, MS27642-52 ×5, 214588-002 bearing (SCD), 214508-003 seal ring ×5, 212966-006 hub (Detail), 214955-004 lower sleeve | none | **6 events / 8 faces** (solids 0, 47, 285) |
| base | `tan_link_mount_215175_002` 215175-002 tangential link mount | `asm217755_215175_001` (9913d0cff39c), label 0:1:1:1468 — mesh is the **-001 (CW)**, model id says -002 | **assembly, 40 solids** | 215175-001 CW and 215175-002 CCW both **Assembly**: 215198-00x mount (Detail) ×1, 214723-002 sealed bushing ×3, MS21070L08 ×10, CCR264CS-3-03 ×20, AS3209-008 ×3, AS3209-012 ×3 | none | 0 |
| base | `gas_spring_mount_213668_002` 213668-002 gas-spring mount (A.1) | `machined_213668` (6d5b1321446d); STEP `213668-002_2026-07-23_Released.stp` | **single solid** (1) | 213668-002 **Detail**, 0 children; sits in 215176-002 "lower gas spring body assembly" (STEP carries 215176-001 = 213668-001 + 2 X-rings) | none | 1 event / 1 face |
| base | `piston_cover_214958_002` 214958-002 piston cover | `asm217755_214958_002` (9791e92a036a), label 0:1:1:1499 | single solid (1) | 214958-002 **Detail** (A.1, A.2), 0 children | none | 0 |
| tan_link | `tan_link_212956_005` 212956-005 pitch anti-rotation link assembly | `asm217755_212956_005` (8f519ff443a2), label 0:1:1:1434, 3 instances | **assembly, 4 solids** (3 leaves) | 212956-005 **Assembly**: 213863-004 link (Detail) ×1, MS14101-3 ×1, MS14103-3 ×1 | `spherical_bearing_tan_link`, `spherical_bearing_tan_link_ms14103_3` | **2 events / 2 faces** (solids 0, 2) |
| tan_link | `spherical_bearing_tan_link` narrow end (child) | `asm217755_MS14101_3_34f032f0` (34f032f08978), `MS14101-3_2` | single product, **2 solids** | MS14101-3 **Standard** (narrow, self-aligning) | — (child of 212956-005) | 0 |
| tan_link | `spherical_bearing_tan_link_ms14103_3` wide end (child) | `asm217755_MS14103_3` (e44145483cfa) | single solid (1) | MS14103-3 **Standard** (wide) | — (child of 212956-005) | 0 |
| pitch_plate | `pitch_plate_215177_001` 215177-001 pitch plate | `asm217755_215177_001` (37e9f606341b), label 0:1:1:1458 | **assembly, 10 solids** | 215177-001 **Assembly** "pitch plate assembly": 215735-001 pitch plate (Detail) ×1, NAS77A3-015A flanged bushing ×8, NAS77A4-015A ×1 | none | 1 event / 1 face (solid 0) |
| pitch_plate | `gas_spring_piston_214700_002` 214700-002 piston body | `asm217755_214700_002` (ed1010fe02c9) | single solid (1) | 214700-002 **Detail** "piston body, gas spring" (a second 214700-002 row titled "screw mount" is IN_WORK, ignored); in collector P1-214700-001 / P3-214700 | none | 1 event / 1 face |
| pitch_plate | `piston_head_lower_214699_002` | `asm217755_214699_002` (5dbbe4e15c29) | single solid (1) | 214699-002 **Detail** "piston head, lwr" | none | 0 |
| pitch_plate | `piston_head_upper_214698_002` | `asm217755_214698_002` (8899ea5d7297) | single solid (1) | 214698-002 **Detail** "piston head, upr" | none | 0 |
| pitch_link | `pitch_link` 213862-002 pitch link assembly | `asm217755_213862_002` (b221f534035c), label 0:1:1:253, 4 instances | **assembly, 5 solids** (3 leaves) | 213862-002 (A.2) **Assembly**: 213861-002 pitch link (Detail) ×1, MS14101-3 ×2 | `spherical_bearing_pitch_link` | **2 events / 2 faces** (solids 2, 4) |
| pitch_link | `spherical_bearing_pitch_link` (child) | `asm217755_MS14101_3_815597cb` (815597cb2da7), 2 instances | single product, 2 solids | MS14101-3 **Standard**, ×2 under 213862-002 (model draws one part for two) | — (child of 213862-002) | 0 |
| blade | `pitch_arm` 215071-001 | `asm217755_215071_001` (e1c41692e17a), label 0:1:1:195, 5 instances | single solid (1) | 215071-001 **Detail** (A.1, B.1, C.1). Enovia `bom 215071-001` said "no RELEASED revision": its `dwgname` is `215071`; found by title | none | 0 |
| blade | `blade_root` blade bonded assembly 216332-001 | `asm217755_216332_001_bb3745d2` (bb3745d2764b), label 0:1:1:207, STEP name `216332-001_36` | **assembly, 20 solids** (11 leaves) | 216332-001 **Assembly** "blade bonded assembly, M1": 211457-007 blade assy (comolded) ×2 rows, 213399-016 outboard fitting, 216011-001 erosion shield, 216027-001 vortex generator, adhesives/sealant (Continuous). A **second** identity titled 216332-001 is a Detail "plug, tail stringer", title `216632-001` — a different part | none | 1 event / 2 faces (solid 7) |

Bindings on the other mesh shas in the log: none. Total standing `bound` events 14 (19 `bound` events written; the rest superseded or retracted) on 7 meshes: 6+2+2+1+1+1+1.

## Table 2 — assemblies the model does not have (whose members are in v2)

Members found from the meshes' `instance_path` [P] and the Enovia children [E]. "Rigid body" = the v2 bodies [M] its members sit in.

| Real assembly | Kind [E] | Members already in v2 | v2 bodies | Can be a `parent`? |
|---|---|---|---|---|
| 215177-001 pitch plate assembly (nested as 215177-001.2 → .3 in the STEP) | Assembly, RELEASED | the plate part itself | pitch_plate only | yes, it is already `pitch_plate_215177_001`; its detail 215735-001 is not separate (split) |
| P3-214700 piston and end stop components | Collector, RELEASED | 214700-002, 214698-002, 214699-002 (+ not in v2: 213859-002 seal cap, 215256-001 slide ring) | pitch_plate only | yes, one body; but a collector, not a physical part |
| P1-214700-001 piston body subassy | Collector, RELEASED | 214700-002 | pitch_plate | a one-member group, adds nothing |
| 215176-002 lower gas spring body assembly (STEP: 215176-001) | Assembly (-001 IN_WORK, -002 RELEASED) | 213668-002 only (the other child is X-rings) | base only | yes, one body; no mesh installed for the assembly (the mount mesh is the standalone detail STEP) |
| P3-213456-001 variable pitch static parts (STEP path `prd-e-03300520`) | Collector, IN_WORK | 215175-00x, 213668-002 (via 215176), 214958-002 | base only | yes, one body; a collector, in work |
| prd-e-03372837 blade and pitch arm | Collector, IN_WORK | blade 216332-001, pitch arm 215071-001 | blade only | yes, one body; a collector, in work |
| prd-e-03262343 pitch arm and fasteners, "rigid body" | Collector, RELEASED | 215071-001 (+ 217970 washer, not in v2) | blade only | one body (named as one rigid body in Enovia) |
| P2-213456-001 variable pitch moving parts (STEP `prd-e-03478614`) | Collector, IN_WORK | 212956-005 ×3, 215177-001, 214700-002 and heads | **tan_link + pitch_plate** | **no**: spread over two bodies |
| 216231-001 hub and blade assembly (STEP `prd-e-03478612`) | Assembly, RELEASED (A.1, B.1) | hub 214373-002, pitch link 213862-002 ×4, blade, pitch arm | **base + pitch_link + blade** | **no**: spread over three bodies |
| 217755-001 propulsion assembly | Assembly, RELEASED | everything | all five | no (the model itself) |

Not read: whether a Collector is meant to be treated as an assembly in this model (see decision (b)).

## Table 3 — parts the real structure has between these, left out on purpose

Omissions are v2's `notes` (gas spring, VPA, ring gear, brake, every fastener, washer and bushing, blades 2–5). "Would be a child of" is by Enovia parent / STEP instance path.

| Part [source] | Would be a child of | Mesh today | Status |
|---|---|---|---|
| 213861-002 pitch link detail (E) | `pitch_link` 213862-002 | inside the 5-solid assembly mesh | needs a mesh split |
| 213863-004 anti-rotation link detail (E) | `tan_link_212956_005` | inside the 4-solid mesh | needs a mesh split |
| 215735-001 plate detail (E) | `pitch_plate_215177_001` | inside the 10-solid mesh | needs a mesh split |
| NAS77A3-015A flanged bushing ×8, NAS77A4-015A ×1 (E; P: 9 of the plate mesh's 10 solids; `asm217755_NAS77A3_015A` / `_NAS77A4_015A` exist) | `pitch_plate_215177_001` | already drawn by the plate mesh and also a separate mesh | would be added (with the split, or it draws twice) |
| 214820-002 plain bushing ×8 (STEP; Enovia P2 lists -003) (P) | pitch plate installation 215177-001.2, a sibling of the plate assembly, not a child of 215177-001 | `asm217755_214820_002` | would be added; parent is undecided |
| 214943-002 plain bushing ×1 (P, under `P2-214943`) | spans plate and VPA output: no single parent | `asm217755_214943_002` | would be added; parent not shown by either source |
| 215198-001/-002 tangential link mount detail (E) | `tan_link_mount_215175_002` | inside the 40-solid mesh | needs a mesh split |
| 214723-002 sealed bushing ×3 (E, P) | `tan_link_mount_215175_002` | `asm217755_214723_002`, also inside the 40-solid mesh | would be added (needs the split) |
| MS21070L08 ×10, CCR264CS-3-03 ×20, AS3209-008/-012 ×6 (E) | `tan_link_mount_215175_002` | inside the 40-solid mesh | fasteners and seals: left out on purpose |
| 214936-002 countersunk bushing ×3 (STEP under P3 static collector) (P) | base body, parent not shown | `asm217755_214936_002` | would be added; parent unknown |
| 212966-006 hub, 214955-004 / 214959-002 sleeves, 212475-003 races ×5, 214508-003 seal rings ×5, 209637-006 wear ring, 214588-002 bearing, MS27642-52 ×5 (E) | `hub` 214373-002 | all inside the 286-solid mesh | needs a mesh split (the model's "hub" is this whole assembly) |
| 211457-007 blade assy, 213399-016 fitting, 216011-001 shield, 216027-001 vortex generator (E) | `blade_root` 216332-001 | inside the 20-solid mesh | needs a mesh split |
| 217970-001 pitch link washer (E, IN_WORK) | `pitch_arm` or the pitch link joint, not shown by either source | none read | would be added; parent not shown |
| 213859-002 seal cap, 215256-001 slide ring (E) | `gas_spring_piston_214700_002`'s group P3-214700 | none read | would be added; neither is in v2 |
| 214958-002 piston cover O-rings | — | — | none: Enovia shows 0 children for 214958-002 |

## Proposed part tree per body

"in the model" = v2 today; "would be added" = a part with a mesh or Enovia row, not yet in v2; "needs a mesh split" = its mesh today is the parent assembly.

```
base
  hub 214373-002 (assembly)                         in the model; needs a mesh split (286 solids; 6 events on solids 0, 47, 285)
    212966-006 hub                                  needs a mesh split
    214955-004 / 214959-002 spindle sleeves         needs a mesh split
    212475-003 outer race x5, 214508-003 seal x5    needs a mesh split
    209637-006 wear ring, 214588-002 bearing        needs a mesh split
  tan_link_mount_215175_002 (assembly, mesh is -001) in the model; needs a mesh split (40 solids)
    215198-00x mount detail                         needs a mesh split
    214723-002 sealed bushing x3                    would be added
  gas_spring_mount_213668_002 (detail)              in the model; one solid
    (215176-002 lower gas spring body assembly      would be added; no mesh)
  piston_cover_214958_002 (detail)                  in the model; one solid
tan_link
  tan_link_212956_005 (assembly)                    in the model; needs a mesh split (4 solids)
    213863-004 link detail                          needs a mesh split
    spherical_bearing_tan_link (MS14101-3)          in the model
    spherical_bearing_tan_link_ms14103_3            in the model
pitch_plate
  pitch_plate_215177_001 (assembly)                 in the model; needs a mesh split (10 solids)
    215735-001 plate detail                         needs a mesh split
    NAS77A3-015A x8, NAS77A4-015A x1                would be added
  214820-002 bushing x8, 214943-002                 would be added; parent undecided
  gas_spring_piston_214700_002                      in the model
  piston_head_lower_214699_002                      in the model
  piston_head_upper_214698_002                      in the model
pitch_link
  pitch_link 213862-002 (assembly)                  in the model; needs a mesh split (5 solids)
    213861-002 pitch link detail                    needs a mesh split
    spherical_bearing_pitch_link (MS14101-3 x2)     in the model
blade
  blade_root 216332-001 (assembly)                  in the model; needs a mesh split (20 solids)
    211457-007 blade, 213399-016, 216011-001, 216027-001   needs a mesh split
  pitch_arm 215071-001 (detail)                     in the model; one solid
```

Counts on the hub line: the hub's six standing events carry eight faces, on solids 0, 47 and 285 of 286; which child each solid is is not recorded in the manifest (`manifest.json` has only `solid_id`), so which bindings move to which child is **not read**.

## Checks

- Feature-identity file count before: 84 (83 events + `README.md`). After: 84; listing identical to the pre-run listing (the fold ran on a copy under the scratchpad; nothing written to `data/`).
- Nothing outside `docs/sessions/lessons/` changed.
