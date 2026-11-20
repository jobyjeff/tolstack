# Lessons — an_assembly_is_an_outline_and_its_parts_may_sit_in_two_bodies (2026-11-20)

Link 2 of the chain that grew out of Jeff's note `20261119T142516_ci28ci`.
The tree (`parent`) and the bodies are now two groupings of the same parts:
an assembly whose parts sit in two bodies is in none, may own a dimension
between its parts' features in one body, and is drawn on the map as a named
outline with no box. No committed model has such an assembly yet, so v1 and
v2 load and draw as before (below); links 4 and 5 author the first ones.

## What was built

- `tolerance_stack/topology.py`: the body rules (a leaf in exactly one body;
  an assembly in the one body all its parts are in, or none; a part in no
  body carries no node), `within`, `dimension_ends` (an assembly's
  dimension's end parts, checked in `_assembly_ends`), `edge_body` through
  them, `tree_order` taking "top-level" relative to the ids it is given, and
  `check_shared_ids` -- the shared-id check moved out of the test so a
  fixture can call it, with the one latitude (a part inside the other's).
- `tolerance_stack/model_view.py`: a body's `parts` are those whose assembly
  is not in it; a dimension's `from`/`to` name its end parts' features and its
  `body` is `edge_body`. `tolerance_stack/kinematic.py`: a contributor's body
  is `edge_body`.
- `scripts/build_topology_projection.py`: `outlined_assemblies` (children and
  no node), `_needs_place`, `computed_map_places` placing an outline's parts
  down their own bodies' columns, and `_places_inside_outlines` giving an
  authored layout's unplaced outline parts a place (added to `places`, named
  in `computed_places`).
- `apps/viewer/map.js` / `views/map.js` / `map.css`: `VA.mapOutlined`; an
  outline round its parts' boxes and nested outlines, named top-left or
  top-right, registered as the part (border, hit border, name); an assembly's
  dimension as a jumper that runs straight or on a lane past its boxes,
  whichever crosses none; two new notes; `mapCounts` counts an outline as its
  part; district names moved to a layer over the outlines.
- Fixture: `tests/fixtures/topology_assembly_in_two_bodies.json` -- a link
  assembly (link body + two bearings, each an outer race in the link and an
  inner race in its neighbour) and a base assembly inside ground. The fast
  tier carries its model view between markers in `apps/viewer/tests.js`, and
  `tests/test_topology_map.py` holds that copy equal to `model_view()`; the
  browser suite reads the same copy.

## Shots (`shots/an_assembly_is_an_outline_and_its_parts_may_sit_in_two_bodies/`)

- `two_body_row.png` -- the fixture laid out in a row: the base assembly's
  outline **inside** ground (named top-right, because its top-left would sit
  on "ground"); the link assembly's outline round both bearings' outlines,
  each bearing **crossing** from its inner race's district into the link's;
  the centre-to-centre on its lane under the link's boxes. Zero notes.
- `two_body_computed.png` -- the same model on computed places (one column a
  body, as a model with no layout file gets): six notes, every one "outline
  takes in a part it does not hold". A column per body cannot keep a
  cross-body assembly's members together; a model that has one needs a
  layout file. The centre-to-centre runs straight here (the races are in one
  column and nothing lies between).
- `vpa_end_stop_v2_before.png` / `_after.png` -- v2, the base commit's viewer
  scripts against this branch's: **byte-identical PNGs**, and the layout
  geometry identical once the two new metric constants and the jumpers' new
  `sides` field are set aside (`results.json`).
- `vpa_pitch_linkage_before.png` / `_after.png` -- v1: geometry identical,
  47 notes before and after; the PNGs differ in one 8 × 3 px patch, where the
  "actuator piston (out…" district name runs past its own district into the
  next one's tinted field and is now drawn above it (the district names'
  new layer). That is the only pixel this branch moves on either model.

## Every reader of `body_of` or `parent` that assumed nesting

| Reader | What it assumed | Done |
|---|---|---|
| `Topology.__post_init__` | a child is in its parent's body | replaced by the three rules |
| `Topology.tree_order` | top-level = no parent | top-level = parent not among the given ids |
| `Topology.edge_body` (structural) | the edge's part is on both ends | the body of `dimension_ends` |
| `model_view` bodies' `parts`, dimensions' `from`/`to`/`body`, `end_feature` | as above | follow `dimension_ends` / `edge_body` |
| `kinematic.load_kinematic_study` contributor `body` | `body_of(edge.part)` | `edge_body` |
| `computed_map_places`, `load_topology_map` | top-level = no parent | `_needs_place`; outline parts placed |
| `VA.mapLayout` step 1 (`childless`) | a part with no place sits in its nearest placed ancestor's cell | stops at an outline; a part under one needs a place |
| `serialize_topology`'s `part_order` (walk, `walk_order: authored`) | `edge.part` is in a body's `parts` | left: an assembly in no body falls back to rank 0, a tie-break only |
| `topology.assembly_rollups` | (none -- folds a subtree whatever its bodies) | left: still the fold of a path over a subset of the chain |
| `apps/viewer/model.js` `unbodied` → nav | a part with no body is in a model with no bodies | **filed**: `ISSUE_20261120_an_assembly_in_no_body_is_listed_twice_in_the_nav_and_posed_by_nothing_in_3d.md` |
| `apps/annotate/sweep.js` `AA.sweepRidingParts`, `app.js` `anchorSweepBodies` | every meshed part is in a body | **filed**, same issue (annotate was fenced) |
| `feature_identity_topology_id` / `AA.identityKey` | a shared node is on the same part in both models | **filed**: `ISSUE_20261120_a_feature_a_finer_model_moves_onto_a_member_is_keyed_to_the_finer_model.md` |
| `VA.topPartOf`, `VA.assemblyIds`, `VA.gridPlan`, `VA.gridBraces` | body ⊃ assembly ⊃ part | link 3's (below) |

## What link 3 must know about the grid (and the map's Groups)

- **Use this fixture.** `tests/fixtures/topology_assembly_in_two_bodies.json`
  is the bearing-like assembly link 3's DoD asks for, already loaded and
  paired: a projection row needs only `model_view()` of it plus a `map`, and
  the fast tier's `TWO_BODY_MODEL` is that view. Its rows in the grid come
  from the walk, which link 3 will have to build (the builder's
  `project_topology` over the file).
- **`VA.topPartOf` maps every part to its top ancestor**, so in the grid
  outer race A (link body) and inner race A (ground) are both "link_asm's" --
  the part brackets will claim rows from two body blocks.
- **An assembly's own dimension is a row whose `part` is the assembly**
  (`edges[].part` is unchanged, `link_centres` → `link_asm`), and whose
  `body` is the one body its ends share (`link`). It is the one row of an
  outlined assembly that is not a member's.
- `assembly_rollups` folds an assembly's subtree across bodies; a folded
  assembly row's numbers are right, but which body bracket it sits in is
  link 3's call.
- **On the map**, the element to hide for "Assemblies off" is
  `g.map__outlinegroup` (border `rect.map__outline`, hit border
  `rect.map__outlinehit`, name `text.map__outlinename`) and, for an assembly
  that still has a box, `rect.map__assembly`. District names are no longer
  inside `g.map__body` in the districts layer: each is in its own
  `g.map__body` in the `map__layer--districtnames` layer, so "Bodies off"
  must hide both.

## Decisions the handoff left open

- **An assembly whose parts are all in one body must be listed in it**
  (refused by name otherwise) -- the "only when" read as "exactly when", so
  the one case the handoff relaxes is the only new freedom.
- **Box-less = children and no node.** An assembly that owns only a
  dimension has no box; its dimension is drawn between its members' pins.
- **The outline's name** takes the top-left, else the top-right when the
  top-left meets a district's name or another outline's (a note when both
  do); a halo of the page's ground under it, because an outline's border can
  run beneath another outline's name. A district's name gets no halo (its
  field is tinted, so a halo would show) -- it moved above the outlines.
- **Two new layout notes**: an outline that takes in a box not of its parts,
  and an outline name with no clear corner. Plus "dimension … has no jumper
  clear of every box".
- `load_topology_map` adds `computed_places` to an authored file only when it
  computed something, so v2's map is still shipped verbatim.
