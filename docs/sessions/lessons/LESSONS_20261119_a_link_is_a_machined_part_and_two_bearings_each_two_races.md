# Lessons — a_link_is_a_machined_part_and_two_bearings_each_two_races (2026-11-20)

Link 4 of the chain from Jeff's note `20261119T142516_ci28ci`. In v2 each link
assembly is now its machined part and two spherical bearings, and each bearing
an outer race and an inner race. The four ball joints are in the graph: one
`spherical` gap edge per bearing, between its inner race (in the mating part's
body) and its outer race (in the link's body).

## What was built

- **`docs/topologies/topology_vpa_end_stop_v2.json`**: 11 parts (the two
  machined links, the pitch link's second bearing, eight races), 20 nodes and
  22 edges; v1's four joint edges out. 31 parts, 68 interfaces, 88 edges.

  > **Review correction, 2026-11-20:** "20 nodes" is 16 new nodes (per link,
  > two machined bores and, per bearing, the outer cylinder, the inner bore and
  > the ball centre) plus the four sphere centres moved onto the outer races:
  > 52 + 16 = 68. The 22 edges are all new (11 per link), less v1's four:
  > 70 + 22 - 4 = 88.
  - The link bodies are each machined part and its two outer races. The inner
    races are in `blade`, `base` and `pitch_plate` (twice). The two link
    assemblies and the four bearings are in no body.
  - At each end: the machined part's bore holds the outer race (`press_fit`
    gap); the outer race's cylinder reaches its seat's centre (a dimension);
    the ball joint (`spherical` gap) joins the inner race's ball centre to
    that seat centre; the inner race's bore reaches its ball centre (a
    dimension); and the inner race's bore sits on the mating part's bore (a
    `pin_in_bore` gap, a stand-in for the hardware).
  - **One decision the handoff left open**: the outer race also carries a
    dimension from its outside cylinder to its seat's centre. Without it the
    chain from the machined bore to the ball is broken at the outer race.
  - The four seat centres keep v1's ids, moved onto the outer races;
    `pitch_link_length` and `tan_link_length` keep id, ends and part.
- **`tolerance_stack/topology.py`, `feature_identity_key`**: how a binding
  follows a moved feature (below). `model_view` and
  `feature_identity.edge_end_feature` write and read through it.
- **`apps/annotate/app.js`** (`featureEnds`, `featureAt`) and
  **`apps/viewer/model.js`** (`featureEnds`): match an end to a feature by the
  whole identity key, and read a dimension's end from the view row's
  `from`/`to`, so the link's length (an assembly dimension) ends on the races.
- **`docs/topologies/map_vpa_end_stop_v2.json`**: places for the ten new boxes
  with **zero layout notes**, five columns by nine rows (below).
- **`docs/topologies/part_mesh_aliases.json`**: eleven rows. Also corrected:
  212956-005's evidence named a bolt among its four solids, and there is none.
- Tests and docs moved with the model: `tests/test_topology.py`,
  `tests/test_model_view.py`, `tests/test_topology_map.py`,
  `docs/DAG_TOPOLOGY.md` (v2's inventory, a paragraph on the links, the
  map's arrangement), `docs/ANNOTATION_SURFACE.md` ("A feature on a member").
  `apps/viewer/README.md`'s and `views/topology.js`'s hover-divergence counts
  were re-derived from a projection built from this tree.
- Two guards, each with a witness spec: the key rule (pytest) and an assembly
  dimension's ends (viewer fast tier).
- Link 2's `ISSUE_20261120_a_feature_a_finer_model_moves_onto_a_member_is_keyed_to_the_finer_model.md`
  is resolved, with an addendum.

## How the parts were read

- **Which MS14101-3 solid is which race**: every face of the three bearing
  meshes was fitted (`feature_geometry.fit_face`) and grouped by the
  manifest's `solid_id`. Solid 0 (26 faces) has the outside cylinder (r 7.141)
  and a concave sphere (r 5.198): the outer race. Solid 1 (10 faces) has a
  sphere (r 5.147) and the bore (r 2.41): the inner race. Both MS14101-3
  meshes read the same.
- **MS14103-3 is one solid** (38 faces): one sphere (r 6.732), the bore
  (r 2.413) and the outside cylinder (r 7.937). Both races are authored anyway
  and both alias the same mesh. What that costs a pick: the outside cylinder
  is the outer race's, the bore the inner race's, and the sphere is either's.
  No `solid_id` tells them apart, so a pick on the sphere cannot say which
  race it is on. The reader decides by which feature they armed.
- **Which MS14101-3 occurrence is which end**: `.1` is at (83.00, -44.55,
  -22.70), the sweep's pitch-arm ball; `.2` at (84.97, -17.14, 79.67), the
  plate end. Each bearing declares its occurrence; the races declare none (why
  under "3D").
- **The machined parts' numbers** are the meshes' products, and they agree
  with Enovia (product-structure review page): 213861-002 and 213863-004. The
  instance names disagree: `213861-001.1` and `213863-002.1` (questions).
- **The machined pitch link at blade 1** is inside the instrumented
  546293-002, so its design mesh records blades 2–5 only. Its local
  placement is the identity in every 213862-002, so it declares its
  assembly's blade-1 occurrence and is drawn there, as `pitch_link` is.

## How bindings follow a moved feature (item 6)

A feature that a finer model states on a member keeps the source model's key,
**part included**. `feature_identity_key` answers `(source model, the
source's part)` when this model's part is inside the source's part for that
node. The projection writes this as `model.features[].identity`. So v2's
outer race reads Jeff's v1 record, and a bind on v2 writes to it. There is
one record and no event, and no `supersedes` points across keys. Every
browser reader already keyed off `identity`, except two helpers that compared
the part alone (above).

Measured on Jeff's real log (read-only, 100 events before and after):

| v2 feature | reads | faces |
|---|---|---|
| `pitch_link_lower_outer_race@pitch_link_lower_sphere_centre` | `vpa_pitch_linkage:pitch_link@…`, bound | `b221f534` face 104 |
| `pitch_link_upper_outer_race@pitch_link_upper_sphere_centre` | `vpa_pitch_linkage:pitch_link@…`, bound | `b221f534` face 140 |
| `tan_link_lower_outer_race@tan_link_lower_sphere_centre` | `vpa_pitch_linkage:tan_link_212956_005@…`, bound | `8f519ff4` face 64 |
| `tan_link_upper_outer_race@tan_link_upper_sphere_centre` | `vpa_pitch_linkage:tan_link_212956_005@…`, bound | `8f519ff4` face 0 |

`fits.json` was built from this tree into a scratch directory and compared
with the shared one: the same features, the same summary (21 fitted, 1
unresolved), and the four centres equal in every float. Local frame, then the
occurrence linkage's sweep poses:

| centre | local (mm) | at the drawn occurrence (mm) |
|---|---|---|
| pitch link lower | (0.0015, 0.0000, 0.0000) | 213862-002.2: (-18.9086, -92.2846, -22.6996) |
| pitch link upper | (0.0015, -0.0000, 105.9906) | 213862-002.2: (7.9191, -86.3223, 79.6661) |
| tan link lower | (-0.0500, -0.0024, 0.0015) | prd-e-03438709.1: (79.4281, 62.4299, 110.0269) |
| tan link upper | (61.4003, 0.0000, -0.0003) | prd-e-03438709.1: (80.9983, 9.0266, 79.6661) |

(The pitch link's fits are on the design mesh, whose instances are blades
2–5. The row lists the first, as `fits.json` does.) Before and after are
identical.

## The v1 ids v2 no longer carries, and the chain in their place

Only the four joint edges left. Every node id v2 had is still there.

| v1 id | v2 chain, from the mating part to the link's seat centre |
|---|---|
| `pitch_arm_link_joint` (spherical, `pitch_arm_link_bore` → `pitch_link_lower_sphere_centre`) | `pitch_arm_link_bore` —`pitch_link_lower_inner_race_on_pitch_arm` (pin_in_bore)→ `pitch_link_lower_inner_race_bore` —`pitch_link_lower_inner_race_bore_to_ball`→ `pitch_link_lower_ball_centre` —`pitch_link_lower_ball_joint` (spherical)→ `pitch_link_lower_sphere_centre` |
| `pitch_plate_link_joint` (`pitch_plate_link_attach_bore` → `pitch_link_upper_sphere_centre`) | `pitch_plate_link_attach_bore` —`pitch_link_upper_inner_race_on_pitch_plate`→ `pitch_link_upper_inner_race_bore` —`pitch_link_upper_inner_race_bore_to_ball`→ `pitch_link_upper_ball_centre` —`pitch_link_upper_ball_joint`→ `pitch_link_upper_sphere_centre` |
| `tan_link_mount_joint` (`tan_link_mount_bore` → `tan_link_lower_sphere_centre`) | `tan_link_mount_bore` —`tan_link_lower_inner_race_on_mount`→ `tan_link_lower_inner_race_bore` —`tan_link_lower_inner_race_bore_to_ball`→ `tan_link_lower_ball_centre` —`tan_link_lower_ball_joint`→ `tan_link_lower_sphere_centre` |
| `tan_link_plate_joint` (`tan_link_upper_sphere_centre` → `pitch_plate_tan_link_attach_bore`; v1 runs it link-first) | `pitch_plate_tan_link_attach_bore` —`tan_link_upper_inner_race_on_pitch_plate`→ `tan_link_upper_inner_race_bore` —`tan_link_upper_inner_race_bore_to_ball`→ `tan_link_upper_ball_centre` —`tan_link_upper_ball_joint`→ `tan_link_upper_sphere_centre` |

Between a link's two seat centres a study may take the one length
(`pitch_link_length`, `tan_link_length`: Jeff's "should resolve to a single
value"). Or it may take the parts that make it: each outer race's
`…_outer_race_od_to_centre`, each `…_outer_race_press_fit`, and the machined
part's `pitch_link_race_bores` / `tan_link_race_bores`. Both routes are in the
graph, so a study names one of them and never both.

## Questions for Jeff

1. **The swage.** "Outer race is located with a boss-bore to the machined link
   part, it's actually swaged into the housing so I'm not sure how to
   represent this." It is authored as a `press_fit` gap from the race's
   outside cylinder to the machined bore: an interference that never moves,
   with no new word. Is a swage a press fit for a tolerance study? Or is it
   its own interface, with the bore's band and none of the race's?
2. **213863's number.** The mesh's product and Enovia say 213863-004. Each
   instance in the STEP is *named* `213863-002.1`. The pitch link has the
   same mismatch: product 213861-002, instances `213861-001.1`. v2 uses the
   products' numbers.
3. **The hardware at the pitch arm** (not authored; meshes within ~12 mm of
   the ball): `asm217755_217970_001` at `…/prd-e-03262343.1/P1-215071-001.1/217970-001.1`
   (Enovia: "pitch link washer", IN_WORK, parent not shown), centred 3.2 mm
   from the ball along the arm's bore; an `NAS1149V0332H` washer in the same
   P1-215071-001.1. No bolt mesh was found within reach. What clamps the
   inner race on the arm, in order?
4. **The hardware at the tangential link mount**: `asm217755_214723_002`
   (`…/215175-001.1/prd-e-02954553.3/prd-e-02929297.1`), `asm217755_214936_002`
   (`…/prd-e-02954553.1/NAS76A3-006P.1`) and `asm217755_215198_001`
   (`…/215175-001.1/213667-001.1`). These are under the CW mount
   215175-001, the one these meshes come from. Same question.
5. **MS14103-3 is one solid.** Its two races are authored, but a face on its
   sphere cannot say which race it is on. Is a split mesh from rotorkit
   worth asking for?
6. **The four centres are bound on the balls.** Jeff's four sphere-centre
   bindings are faces of the inner races' balls on the link-assembly meshes.
   v2 now states the centre on the outer race's seat, concentric to 0.001 mm,
   so the fits did not move. Keep those faces, or re-pick each on its seat
   (r 5.198)?

## What link 5 inherits at the two plate ends

- Two stand-ins to replace: `pitch_link_upper_inner_race_on_pitch_plate` and
  `tan_link_upper_inner_race_on_pitch_plate`. Each is a `pin_in_bore` gap
  from 215177's attachment bore (`pitch_plate_link_attach_bore`,
  `pitch_plate_tan_link_attach_bore`) to the inner race's bore. Jeff's bolt
  stack puts the race between the flanged bushing (located) and the straight
  bushing (clamped). The race's bore, ball centre and
  `…_inner_race_bore_to_ball` are its own and stay.
- `pitch_plate_link_attach_bore` still holds Jeff's four-face disagreement
  (events 0095 to 0100). Nothing here touched it.
- The inner races are in `pitch_plate`'s district on the map, in the cells
  under the plate's row: `[2, 4]` (tangential link) and `[4, 4]` (pitch
  link, under the machined plate). A bolt and its stack added there have to
  keep the links' outlines clear (below).

## The map

A district is **one rectangle**: the bounding box of the body's cells,
clipped to its boxes. A box-less assembly's outline is one rectangle round
all its members. So a link's five boxes must enclose no other box. Each inner
race must also sit on the edge of its neighbour's rectangle, beside its outer
race. None of the arrangements that kept every old place satisfies that.
Candidates were scored with the page's own `VA.mapLayout` under node, a
scratch scorer over `model_view()` and the map file. Two attempts each left
one or two notes ("dimension `pitch_link_length` has no jumper clear of every
box" when the lower ball's pin faced sideways into its inner race). The one
shipped has none:

- the tangential link as a Z in column 1, rows 4–6: the plate end's inner race
  at `[2, 4]` under 215177, its mount end's at `[0, 6]`, two cells under the
  mount, which reaches it past empty cells;
- the pitch link straight down column 4, rows 4–8;
- the blade along row 8: hub `[0, 8]`, blade root `[2, 8]`, pitch arm `[3, 8]`,
  the pitch link's lower inner race `[4, 8]`.

Every place above row 4 is the sketch's. The hub, the blade root and the
pitch arm moved down.

### The shots and the click-around

The shots are in `shots/a_link_is_a_machined_part_and_two_bearings_each_two_races/`.
They were taken by `tests/debug_links_20261120.mjs` against a scratch root
(below), and were read before this section was written.

- `map_3840_side_by_side.png` and `map_1536_side_by_side.png`, with crops of
  each link (`map_*_tangential_link.png`, `map_*_pitch_link.png`). The probe
  measured all four bearings at both widths: each draws its named dotted
  outline, both its races, and a spherical symbol between the two races. The
  layout has no notes. The drawn counts equal the model's (5 bodies, 31 parts,
  83 features, 59 dimensions, 44 interfaces).
- `map_3840_links_{bodies,assemblies,parts}_off.png`: the Groups switches over
  the links. Nothing moves.
- What the shots showed that no check asked about:
  - The tangential link's outline is a large rectangle round its Z, and it
    crosses into ground's district and the pitch plate's. That is the rule
    (an outline may cross a district's border), but it is a lot of dotted line
    for five boxes.
  - The mount-end inner race is joined to the mount by a long vertical route
    past two empty cells.
  - The hub's three joints to the mount detour by the base column's left flank
    past that race.
- `tree_pitch_link_open.png`: the nav with the pitch link open. Each link
  body lists its machined part and outer races. The Parts section lists
  `213862-002 pitch link` whole: machined part, two bearings, four races. So
  every race is listed twice (filed; below).
- `pane_outer_race_selected.png`: the 3D pane, Side by side, with the lower
  outer race's cylinder selected after it was bound (below).
- **One race feature bound end to end**, on the scratch copy of the log. The
  feature was `pitch_link_lower_outer_race@pitch_link_lower_outer_race_od`,
  unbound at rest. **Pick a face** armed it. The pick of face 0 of the
  bearing's mesh went through the scene's `onPick`, because the probe's
  screen scan found no point on the face at that camera. It swept in the
  cylinder's other three arcs and wrote event `0101` in 2 ms, keyed
  `vpa_end_stop_v2:pitch_link_lower_outer_race@pitch_link_lower_outer_race_od`,
  with faces 0, 1, 20 and 21 of `815597cb`. The body then read
  "bound · 4 faces of outer race, pitch arm end". The real log was 100
  events before and after.
- The four moved centres' bodies read "bound · face 104 of outer race, pitch
  arm end" and so on. The face is on the link assembly's mesh, but the line
  names the part the feature is on. That is the existing wording; question 6
  is the real question here.

## 3D

- **Sweep mode** poses the parts linkage lists (`pitch_link`,
  `spherical_bearing_pitch_link`, `tan_link_212956_005`), whose meshes draw
  all of each link. The new parts in a link body ride nothing
  (`AA.sweepRidingParts` skips a link body). An inner race in a mating body
  would ride it, drawing the bearing a second time at that body's pose,
  except that its candidate occurrences share too short a path with the
  body's own. That holds only while **the races declare no occurrence**,
  which is why they do not: a declared one is a single candidate and rides.
- **Out of sweep mode** the link is drawn more than once where its meshes are
  all open: the assembly mesh, the machined part's mesh and the bearings'.
  This is measured, not hidden, as 215177's is.
- `ISSUE_20261120_an_assembly_in_no_body_is_listed_twice_in_the_nav_and_posed_by_nothing_in_3d.md`
  is now reachable, in the nav and in 3D. Its addendum says how. It is still a
  design call and is not touched here.

## Decisions the handoff left open

- **Body part order is the walk's.** v2's walk is `authored`, so it enters a
  body at the earliest-listed part that an incoming edge reaches. With the
  inner races listed last, the pitch plate was entered by the feather stop
  and the blade by the hub (`test_model_v2_reads_in_its_authored_body_and_part_order`
  caught it). Each link now reads from the end the walk enters it by. Each
  inner race is listed where its link enters the mating body: first in the
  blade and the plate, with the pitch link's beside its attachment's
  bushings. The first rows are unchanged.
- **The outer race carries a dimension** from its cylinder to its seat's
  centre (above).
- **The races declare no occurrence** (under "3D").

## The browser checks this model change moved

These are the CLAUDE.md lesson of 11-18 again: a stack-data change is a
browser-test change. Every one below was a check written against v2 before
v2 had an outline, a two-body assembly or a bound feature on another part's
mesh.

- `the map`: the counts check counted boxes only. A part is its box *or its
  outline* (`VA.mapCounts` and DAG_TOPOLOGY already said so), so it now
  counts `rect.map__outline` too.
- `the model drawn alone`, four checks:
  - The 3D pane's Bodies list appends the run's own link parts (the link
    assemblies linkage poses) to the model's. The expected count now adds
    those, where the model puts them in no body.
  - An inner race is drawn by its bearing's mesh, which the link carries.
    It is exempt from "posed with its own body" (pointing at the filed
    issue).
  - A bound interface partner ghosts the mesh *its bound face* is on. The
    tangential link's centres are bound on the assembly mesh, not on the
    race's.
  - The locating-boss row's interface no longer fits on screen with the
    boss's own row. Ground lists one more part, and the page keeps the own row
    on screen (`revealLitRows`). The check now asks for that.
- `a pattern is bound as its like faces`, the Parts filter: its opener
  clicked every closed fold. A race listed twice shares one fold key, so a
  pass toggled it twice, and Playwright's scroll-into-view stalled on the
  rows far down the long nav. It now opens each distinct closed key once,
  dispatched in the page.

## The test record

Everything ran from this worktree. The `[real]` tiers ran against a scratch
root, `data/scratch/lnk` in the main checkout. It held copies of inbox, meshes
and projections and a `git archive` of the tree. Every builder was then run
from this worktree with `--data-root <root>/data`; the first run needed
`--allow-older-tree` once, because the archive's first build was stamped from
the main checkout's git. The last rebuild was from `49c952b3`, and later
commits changed only browser checks, the probe, shots and this lesson. The
shared `data/` was never written. The real feature-identity log is 100 events
before and after. The scratch root is left in place for the review, and is
gitignored.

- **Default tier**, `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q`
  on `9e780777`: **2488 passed, 2 failed, 1 skipped**, 518 s (ledger row
  recorded, inside budget). The two failures:
  - `test_viewer_js_suite_is_green`: the worktree has no `data/`. The tier
    below was run instead.
  - `test_every_established_export_lists_exactly_the_runs_the_log_records_for_its_sha`:
    pre-existing, already filed as
    `ISSUE_20261119_the_gas_spring_mount_export_has_a_sixth_run_the_pitch_linkage_topology_does_not_list.md`.
- **Viewer fast tier with `[real]`**, `node apps/viewer/run_tests.cjs --repo <scratch root>`:
  **618/618**.
- **Annotate fast tier**, `node apps/annotate/run_tests.cjs --repo <scratch root>`:
  **334/334**.
- **Browser**, `--repo <scratch root>`, one `--only` per suite, for every
  suite that reads v2:
  - `the map (the counts on both models`: 32/32.
  - `the Groups switches`: 11/11.
  - `the model drawn alone`: 22/22.
  - `the DAG zoom, Fit and the grid header`: 35/35.
  - `a suggestion names its face`: 5/5. It failed 3/5 once inside a
    back-to-back batch, then passed alone, unchanged.
  - `a pattern is bound as its like faces`: 11/11.
  - `a bound pattern offers the whole pattern`: 4/4, after its fold clicks
    were dispatched in the page.
  - `the first end of a joint lists`: 2/2.

  The last three browser edits came after the last batch. Each changed suite
  was re-run alone after its edit.
- **Witness**: one run with the two new specs, `--only` each, **3/3
  mutations witnessed** in 9m36s. No existing spec changed, and the one
  browser guard whose name I first changed is back to its name, so its spec
  stands (`tests/test_mutation_witnesses.py` 49 passed). Pins: viewer fast
  `618 / 618` (+1, with a spec). The pytest guard is not censused.

## Found on arrival

Nothing. The worktree was clean, at the integration tip `1ba5132a`.
