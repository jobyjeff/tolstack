# Lessons — the_pitch_plate_carries_its_own_features_and_each_lug_is_a_bolt_stack (2026-11-20)

Link 5 of the chain from Jeff's note `20261119T142516_ci28ci`. In v2,
215177-001 is the container and owns no feature; the plate 215735-001 carries
them. Each link's plate end is the bolt stack Jeff described. A part with
children may not carry a node any more.

## What was built

- **`docs/topologies/topology_vpa_end_stop_v2.json`**: 33 parts, 78 nodes,
  104 edges (31, 68 and 88 before).
  - The plate's three features moved from 215177-001 onto 215735-001, ids
    unchanged: `pitch_plate_spindle_bore_axis`, `piston_body_plate_flange_seat`
    and `gas_spring_piston_fastener_clocking`. The two dimensions between them
    (`pitch_plate_pilot_to_piston_flange`, `pitch_plate_pilot_to_piston_fasteners`)
    are 215735's now. 215177-001 owns no node and no edge.
  - Out: `pitch_plate_link_attach_bore`, `pitch_plate_tan_link_attach_bore`,
    their radii, the four bushing pins to them, and link 4's two stand-ins.
  - In: two bolts, and per lug 6 nodes (the bolt's shank as its three
    bearing lengths, the flange's underside on the plate, the race's
    flange-side face, the race's clamped face) and 12 edges (3 bolt pins,
    8 dimensions, the radius from the pilot boss to the flanged bushing bore).
  - **The shank is three features**, one length in each bore, joined by two
    dimensions of the bolt: the handoff's "the bolt's shank" among the
    structural dimensions. The first cut had one shank node, and the viewer
    tier refused it: `[real] every live dot answers the SAME on hover and on
    click` reads a node's own part off a dimension incident on it, and a
    one-feature part has none. On the NAS6403U11D mesh all three lengths are
    faces 36 and 37, one cylinder.
  - The pitch plate body lists its parts in the order its walk first reaches
    them (`test_model_v2_reads_in_its_authored_body_and_part_order` refused the
    old order): in from the tangential link's race, through that lug's bolt,
    straight and flanged bushings to the plate, out through the pitch link's
    lug to its race, then the piston. 215177 comes last; it has no row.
- **`tolerance_stack/topology.py`**: a node on a part with children is
  refused by name ("An assembly carries no feature"). It takes the place of
  the old "node on a part in no body" check, which it covers: once bodies are
  declared, every part in no body is an assembly. Witness spec
  `python__test-a-part-with-children-carries-no-node__be6dc4a5.json`; the old
  check's spec (`…in-no-body…__d00a48e8.json`) is retired with it.
- **`tolerance_stack/model_view.py`, `part_number`**: a part's number is its
  `drawing`, or for a standard part with none, the number its own name
  carries. The label rule already stripped that number. Item 5 asked for the
  flanged bushings' number on the tree and the map. This reaches every
  standard part in both models: the NAS77 bushings, the bolts, the MS
  bearings and races, and v1's washers and bolts. The label test's
  "standard part, number-free" case flipped on purpose.
- **`docs/topologies/map_vpa_end_stop_v2.json`**: the region re-placed,
  below.
- **`docs/topologies/part_mesh_aliases.json`**: `bolt_nas6403u11d`'s row
  (v1's id, the same bolt) says which occurrence v2 draws. NAS6403U14D has no
  row because it has no mesh.
- Tests: `tests/test_topology.py` (each lug's eight joints by id and kind;
  each link's plate end walked to 215735 through the race, the bolt and the
  flanged bushing; the guard; the roll-up tests moved off the plate onto a
  feature-less lug group, so the plate flange's own −4.06 ± 0.10 term leaves
  the pinned share, −6.3348/−6.3348/−6.0778), `tests/test_model_view.py`,
  `tests/test_topology_map.py`.
- Docs: `docs/DAG_TOPOLOGY.md` (Bodies rule 1, v2's inventory, the container
  and the bolt stacks, the map). Two issues resolved:
  `ISSUE_20261118_which_part_the_pitch_plates_attachment_bores_sit_on.md` and
  `ISSUE_20261119_design_the_maps_flanged_bushing_boxes_carry_no_part_number.md`.

## The bolts — which instances, and why

The meshes alone could not answer this. `data/meshes/` has a NAS6403U11D at
the pitch link lug, but **no bolt mesh within 30 mm of the tangential link's
plate-end ball**. So the 217755-001 A.1 STEP was read
(`C:\workspace\rotorkit\data\inbox\step\…CW Released.stp`, grepped for its
`NEXT_ASSEMBLY_USAGE_OCCURRENCE` rows):

| Lug | STEP group (product) | Holds | Bolt product | Its instance name |
|---|---|---|---|---|
| pitch link | `prd-e-03481962.1` (`prd-e-03662009`) | NAS1149V0332H washer (`NAS620C10L.1`), 214820-002 (`NAS76A3-006P.1`), the bolt | **NAS6403U11D**, "BOLT, HEX HEAD, 6Al-4V, .190"-32 X .688" GRIP" | `NAS6403U10D.3` |
| tangential link | `prd-e-03300154.1` (`prd-e-03662008`) | NAS1149V0332H washer (`NAS620C10L.1`), 214820-002 (`prd-e-02977127.1`), the bolt | **NAS6403U14D**, "… X .875" GRIP" | `NAS6403U12D.1` |

- The pitch link's occurrence is `prd-e-03481962.1`. Its frame is 8.3 mm
  from the P2 sweep's upper pitch link ball, and its axis matches the
  straight bushing's. The other four of that mesh's instances are the lugs
  at the other blades.
- The tangential link's bolt has **a different number** from the pitch
  link's, and no mesh. So the 3D pane cannot draw it, and its shank has no
  face to bind.
- Both numbers are the STEP products'. The instance names disagree (below).
- v1 names the tangential link joint's bolt NAS6403U13H. The STEP puts all
  three NAS6403U13H at the piston heads (`P3-214700.3`). So v2 does not
  reuse v1's `bolt_nas6403u13h`.

## What the meshes say along each bolt

Every lug part's world vertices were projected onto the bolt axis (the
straight bushing's, at the tangential link). Order, from the head: straight
bushing | inner race | flange | the flanged bushing's barrel in the plate's
lug | washer. That is Jeff's description. Measurements, never values:

- **Pitch link**: head face at 0. Straight bushing −4.76 to 0. Race faces at
  −4.64 to −4.86 and −11.96. Flange top −11.87, flange underside on the
  plate's lug −13.45, barrel to −17.26. Washer −17.51 to −18.32.
- **Tangential link**, from the straight bushing's outer end: bushing 0 to
  4.76. Race 4.38 to 16.25. Flange top 15.86, underside 17.44, barrel to
  21.25. Washer 21.39.
- The MS14103-3 is one solid, placed with the link. Its bore leans on the
  lug's axis: its radius from that axis runs from 1.8 to 3.0 mm along it.
  So its faces overlap both bushings' ends by about 0.4 mm. The MS14101-3's
  inner race is coaxial to within 0.1 mm.
- In the pitch link lug the bolt's head bears on the straight bushing's end.
  The handoff's table does not have that joint, so it is not authored.

## The v1 ids v2 dropped here, and the chain in their place

Added to link 4's table (link 4's lesson, "The v1 ids v2 no longer carries").

| v1 id | v2 chain |
|---|---|
| `pitch_plate_link_attach_bore` (node) | the lug: the bolt's shank on `bolt_nas6403u11d`, one length a `pin_in_bore` in each of `pitch_link_flanged_bushing_bore` (`pitch_link_bolt_shank_at_flanged`), `pitch_link_upper_inner_race_bore` (`…_at_race`) and `pitch_link_straight_bushing_bore` (`…_at_straight`) |
| `pitch_plate_tan_link_attach_bore` (node) | the same at the tangential link, `tan_link_bolt_shank_at_…` on `bolt_nas6403u14d` |
| `pitch_plate_attach_radius` (pilot boss → pitch link bore) | `pitch_plate_link_flanged_bushing_radius` (pilot boss → the plate's pitch link flanged bushing bore), then `pitch_link_flanged_bushing_press_fit` → `pitch_link_flanged_bushing_wall` → `pitch_link_bolt_in_flanged_bushing` → `pitch_link_bolt_shank_race_to_flanged` → `pitch_link_upper_inner_race_on_bolt` |
| `pitch_plate_tan_link_attach_radius` | `pitch_plate_tan_link_flanged_bushing_radius`, then the same four, `tan_link_…` |
| link 4's `pitch_link_upper_inner_race_on_pitch_plate` (v2 only) | `pitch_link_upper_inner_race_on_bolt` |
| link 4's `tan_link_upper_inner_race_on_pitch_plate` (v2 only) | `tan_link_upper_inner_race_on_bolt` |

The stack is a loop: the race also reaches the plate through the straight
bushing, and axially through its two seats. A study names one route.

## Bindings — what moved, what reads, what needs a re-pick

Nothing was written to `C:\workspace\tolstack\data\inbox\feature-identity\`.
It had 100 events before this session and 100 after.

- **Moved features.** `pitch_plate_spindle_bore_axis` is a v1 node on
  215177. On 215735, inside 215177, it keeps v1's key by link 4's rule. On
  Jeff's real log (a scratch copy, served), it reads "bound · face 487 of
  215735-001": event 0005, the edge-keyed bind of v1's
  `hub_to_pitch_plate_spindle_coaxiality`. That is what it read before.
  `piston_body_plate_flange_seat` and `gas_spring_piston_fastener_clocking`
  are v2's own ids, so their key moves from `vpa_end_stop_v2:pitch_plate_215177_001@…`
  to `…:pitch_plate_215735_001@…`. Neither has any event on the log, so
  nothing is lost. Had one been bound, link 4's rule would not have followed
  it: that rule covers a key shared with `ids_from`, not a move inside one
  model.
- **Bindings that need a re-pick.** These belong to the two attachment
  bores, which v2 no longer reads (v1 still does).

  | Events | v1 feature | Faces (mesh `37e9f606`, the 215177 assembly) | What those faces are in v2 |
  |---|---|---|---|
  | 0093, 0094, 0098, 0099, 0100 (standing) | `pitch_plate_215177_001@pitch_plate_link_attach_bore` | 1380, 1381 | the plate's Ø8.520 bore: `pitch_plate_215735_001@pitch_plate_link_straight_bushing_bore` (same face ids on the 215735 mesh) |
  | 0095, 0096, 0097 | the same | 1380, 1381 and 1509, 1510 | 1380/1381 as above; 1509/1510 are solid 4's bore: `flanged_bushing_nas77a3_015a@pitch_link_flanged_bushing_bore` |
  | proposals 0051, 0054, 0058, 0061 (edge-keyed, `from` end) | `pitch_plate_attach_radius`, `pitch_plate_tan_link_attach_radius` | 439 and 487 | the pilot boss (`pitch_plate_spindle_bore_axis`), which v2 still has |
  | — | `pitch_plate_215177_001@pitch_plate_tan_link_attach_bore` | no events | — |

  If Jeff means the bolt's axis, the pick is now on the bolt's shank: its
  three lengths (`bolt_nas6403u11d@pitch_link_bolt_shank_at_…`) are all
  faces 36 and 37 of the NAS6403U11D mesh. The tangential link bolt has no
  mesh to pick on.

## Questions for Jeff (not resolved by guessing)

1. **The bolts' numbers.** The STEP's products are NAS6403U11D (pitch link)
   and NAS6403U14D (tangential link). The instances are *named*
   `NAS6403U10D.3` and `NAS6403U12D.1`. v2 uses the products. v1 says the
   tangential link's bolt is NAS6403U13H, but the STEP puts those at the
   piston heads. Which numbers are on the drawing?
2. **NAS77A3 against NAS77C3.** The bushing mesh's product is NAS77A3-015A,
   and so is Enovia's. The 215177-001 STEP names the instances
   `NAS77C3-015.1` to `.8`. v2 says NAS77A3-015A.
3. **The tangential link's bolt has no mesh.** rotorkit's extraction installed
   no NAS6403U14D. Is it worth asking for, so the shank can be bound?
4. **The bolt head on the straight bushing.** In the pitch link lug the head
   bears on the straight bushing's end. Jeff's list stops at the race clamp.
   Does the head seat belong in the kinematic model, or with the grip-length
   studies he deferred?
5. **The MS14103-3's lean.** Its one solid is placed with the link, so its
   bore leans on the lug's axis and its faces overlap the bushings by about
   0.4 mm. Nothing reads this as a value. It does mean a face picked on that
   bearing is a face of a posed link, not of a race sitting square on the
   bolt.

## The map

Constraints, from link 4's lesson and the map's rules:

- A district and an outline are each one rectangle that encloses no other
  box.
- Each inner race must sit on its district's edge, beside its link's outer
  race.

Together these put **both inner races on the pitch plate district's bottom
row**, and the 215177 outline in one row: tangential flanged bushing, plate,
pitch flanged bushing.

Candidates were scored with the page's own `VA.mapLayout` under node (a
scratch scorer fed by `model_view()` and `load_topology_map`). The scorer
added one thing the notes do not count: **pairs of routes that cross**.

- The first arrangement had no notes and three crossings. In each lug, the
  flange-to-race lane ran on the column's inner flank, across another of the
  lug's routes.
- A search over 298 arrangements varied the plate's column (4 or 5), each
  lug's width, the race row (5 or 6), and the bolts' and straight bushings'
  cells. The links and the blade row followed. The one shipped has no notes
  and one crossing: hub to tangential link mount, which the base column
  already had.
- Integration's map, scored the same way, has six crossings, five of them in
  the plate region.
- It is seven columns by ten rows.

Each sentence of Jeff's "What it should actually be" is a drawn thing on
`map_3840_pitch_plate_region.png`:

- The container's outline holds the plate and both flanged bushings and
  nothing else. The probe measured this: `held` = those three.
- Each flanged bushing has two joints to the plate: the press fit and the
  flange seat.
- Each flanged bushing has a seat on its race and a pin to the bolt.
- The bolt has a pin to the race and a pin to the straight bushing.
- The straight bushing has a transition fit into the plate and a clamp on the
  race.

### The shots and the click-around

All are in `shots/the_pitch_plate_carries_its_own_features_and_each_lug_is_a_bolt_stack/`.
They were taken by `tests/debug_pitch_plate_20261120.mjs` against the scratch
root, and read before this section was written.

- **Map**: `map_3840_side_by_side.png`, `map_1536_side_by_side.png` and each
  width's `…_pitch_plate_region.png`. Notes none. Drawn counts equal the
  model's: 5 bodies, 33 parts, 99 features, 75 dimensions, 50 interfaces.
  Every lug box leads with its number.
- **Groups**: `map_3840_pitch_plate_{bodies,assemblies,parts}_off.png`.
  Nothing moves.
- **Tree**: `tree_215177_open.png`. "215177-001 pitch plate assembly · 3
  parts · 0 features", then the plate with its 9 features, then the two
  "NAS77A3-015A flanged bushing" rows. The pilot boss carries the bound mark.
- **3D**: `pane_pitch_link_bolt_selected.png`. The shank's length in the
  race (`…_at_race`) is selected and the bolt framed. Its body offers one
  "Take" row (2 faces, r 2.4065, "fits the mating bore").
- **What the shots showed that no check asked about:**
  - Two long diagonals: tangential flange to race, and the tangential
    straight bushing's fit up to the plate. The pitch link's flange-to-race
    route takes the column's outer lane.
  - The district's lower left is empty.
  - The pitch link outline's name, "213862-002 pitch link", is crossed by the
    pitch link straight bushing's clamp route. No note fires for a name
    crossed by a route. That is filed (below).
  - The hovers in the probe lit nothing (`own: []`). The browser suite `the
    map`, which checks what a hover lights, is green on this tree, so the
    probe's pointer placement is the suspect, not the page. Not chased
    further.
  - One console 404 on every load: `/tolstack/rebuild/status`, an endpoint
    of drawing-checker's server that the probe's own server does not mount.

## What the tiers caught that the model change moved

- **A one-feature part.** The bolt began as one shank node. The viewer fast
  tier (`[real] every live dot answers the SAME on hover and on click`)
  reads a node's own part off a dimension incident on it, so it named
  `pitch_link_bolt_shank` an authoring error. The handoff's "the bolt's
  shank" among the structural dimensions said the same. The shank is now its
  three bearing lengths with two dimensions between them (above).
- **The map's drawn scale.** `VA.mapTransform` rounded the scale to two
  decimals. The seven-column map fits a 1700 × 1500 Side by side region at
  0.27588, and drew at 0.28: 2 px past the pane's right edge. `the map`'s
  "fits its region" check caught it. v2's map was height-bound before, with
  slack. The scale now keeps five decimals, with a fast check and its
  witness spec (`fast__the-map-s-drawn-transform-keeps-the-fit-s-scale-so-a-fit__1f235976.json`).
- **Two checks in `the model drawn alone`**, each written against the old
  data:
  - "every part of the end-stop model's bodies is posed with its own body":
    the tangential link's bolt has no mesh, so there is nothing to pose. It
    is now exempt as mesh-less, and only that.
  - The district-border press: it was one pixel inside the base district's
    top edge. At the smaller fit that pixel is past the hit stroke's inner
    half, and lands on the field. It now presses on the border's own line.
- **The hover-divergence counts** in `apps/viewer/README.md` and
  `views/topology.js`, re-derived from a projection of this tree: 110 of 157
  live nodes, 86 as a set (102, 147 and 82 before).

## The test record

Everything ran from this worktree. The `[real]` tiers ran against a scratch
root, `C:\workspace	olstack\data\scratch\plate`. It held copies of the main
checkout's `data/inbox`, `data/meshes` and `data/projections`, a `git archive`
of the tree, and junctions to `node_modules` and `venv-win`. Every builder
was run from this worktree with `--data-root <root>/data`. The last full
rebuild was from `a63d1900`; later commits changed the map's transform, two
browser checks, two published counts and docs, and no projection input. The
shared `data/` was never written. The real feature-identity log was 100 events
before and after. The scratch root is left for the review; it is gitignored.

- **Default tier**, `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -p no:cacheprovider`
  on `a63d1900`: **2577 passed, 2 failed, 1 skipped, 4 deselected**, 494 s
  (ledger row recorded, inside budget). The two failures, both expected and
  the same as link 4's:
  - `test_viewer_js_suite_is_green`: the worktree has no `data/`. The tier
    below was run instead.
  - `test_every_established_export_lists_exactly_the_runs_the_log_records_for_its_sha`:
    pre-existing, already filed as
    `ISSUE_20261119_the_gas_spring_mount_export_has_a_sixth_run_the_pitch_linkage_topology_does_not_list.md`.
  - After that run, `tests/test_mutation_witnesses.py` was re-run on the
    later commits (49 passed), and so were the topology, model view,
    projection and map tests (300 passed).
- **Viewer fast tier with `[real]`**, `node apps/viewer/run_tests.cjs --repo <scratch root>`:
  **619/619** (one check added).
- **Annotate fast tier**, `node apps/annotate/run_tests.cjs --repo <scratch root>`:
  **334/334**.
- **Browser**, `--repo <scratch root>`, one `--only` run per suite that reads
  v2. These are a stack-data change's browser checks, not suites this branch
  changed, except `the model drawn alone`:
  - `the map (the counts on both models`: 32/32. It failed once on the fit
    (above) and passed after the fix.
  - `the Groups switches`: 11/11.
  - `the model drawn alone`: 22/22 after its two edits.
  - `the DAG zoom, Fit and the grid header`, `a suggestion names its face`,
    `a pattern is bound as its like faces`, `a bound pattern offers the
    whole pattern`, `the first end of a joint lists`: each 1/1 suite green.
- **Witness**: one run with the two new specs, `--only` each, **2/2
  witnessed** in 9m52s. The retired spec (`…in-no-body…__d00a48e8.json`)
  went with its guard. Pin: viewer fast `619 / 619` (+1, with a spec). The
  pytest guard is not censused.

## Found on arrival

Nothing. The worktree was clean, at `bf9aa924`.
