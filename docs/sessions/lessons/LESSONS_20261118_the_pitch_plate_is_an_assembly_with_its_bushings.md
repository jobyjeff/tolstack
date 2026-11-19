# LESSONS 2026-11-18 — the_pitch_plate_is_an_assembly_with_its_bushings

Model v2's `pitch_plate_215177_001` is now an assembly: the machined plate and
the NAS77A3-015A flanged bushing at each attachment the model reaches. The two
214820-002 straight bushings are top-level parts beside it. Jeff's standing
bindings are unchanged. A row detour went into the map so the members can be
drawn without a route through a box.

## Parts added

All five are in the `pitch_plate` body.

| id | what | parent | mesh (alias row) | occurrence |
|---|---|---|---|---|
| `pitch_plate_215735_001` | 215735-001 machined plate | `pitch_plate_215177_001` | `asm217755_215735_001` (new row); its face ids are solid 0's of the 215177 mesh | its only instance, `.../215177-001.3/214538-001.1` |
| `flanged_bushing_nas77a3_015a` (v1's id) | NAS77A3-015A, pitch link | `pitch_plate_215177_001` | `asm217755_NAS77A3_015A` (new row) | `NAS77C3-015.4` = solid 4 of the 215177 mesh |
| `flanged_bushing_nas77a3_015a_tan_link` (new id) | NAS77A3-015A, tangential link | `pitch_plate_215177_001` | same mesh (new row) | `NAS77C3-015.1` = solid 1 |
| `bushing_214820_002` (v1's id) | 214820-002 straight bushing, pitch link | none (top level) | existing row | `.../prd-e-03481962.1/NAS76A3-006P.1` |
| `straight_bushing_214820_002` (v1's id) | 214820-002 straight bushing, tangential link | none (top level) | existing row | `.../prd-e-03300154.1/prd-e-02977127.1` |

**Which occurrences, and how I know.** I placed every NAS77A3, NAS77A4 and
214820 instance in the plate's own frame (inverse of the plate's
`placement_world` times each instance's). Then I checked them against the P2
sweep's two plate-end ball centres:
- the pitch link's upper ball is at (83.0, -25.0) in the plate's frame, between NAS77C3-015.4 at x 77.9 and the 214820 at x 86.5;
- the tangential link's plate-end ball is at (81.5, 1.4), between NAS77C3-015.1 at 74.4 and the 214820 at 91.8.

Jeff's own bind confirms the pitch link pair: faces 1509/1510 are on solid 4.

**On the 215177 mesh, solid order is instance order:** solid 0 is the plate,
solids 1 to 8 are NAS77C3-015.1 to .8 (matched by centroid), and solid 9 is the
NAS77A4.

**Left out, because they are outside the model:**
- NAS77C3-015.2 and .3 and 214820 `prd-e-03300154.2` and `.3`: the other two tangential links.
- NAS77C3-015.5 to .8 and 214820 `prd-e-03481962.2` to `.5`: blades 2 to 5's pitch links.
- NAS77A4-015A x1, at (3.1, -5.1, 135.5): the VPA output joint, which v2 does not model.

That leaves 4 of the 17 bushings in the model: 2 flanged and 2 straight.

## Features and constraints added

Each lug pair is two plate bores, an outer cylinder and a bore on each
bushing, and seven edges. There are 12 nodes and 14 edges in all.

| attachment | plate bore (on 215735-001) | Ø on mesh | callout |
|---|---|---|---|
| pitch link, flanged side | `pitch_plate_link_flanged_bushing_bore`, faces 1385/1386 | 7.950 | 215735-A sh 2 SECTION A-A: 5X Ø7.950 +0.015/0.000, position Ø0.2 to A B C and Ø0.1 to A, datum G |
| pitch link, straight side | `pitch_plate_link_straight_bushing_bore`, 1380/1381 | 8.520 | 5X Ø8.520 ±0.008, position Ø0.03Ⓜ to GⓂ |
| tan link, flanged side | `pitch_plate_tan_link_flanged_bushing_bore`, 1375/1376 | 7.950 | 3X Ø7.950 +0.015/0.000, position Ø0.2 to A B, datum C |
| tan link, straight side | `pitch_plate_tan_link_straight_bushing_bore`, 1370/1371 | 8.520 | 3X Ø8.520 ±0.008, position Ø0.03Ⓜ to FⓂ |

The bushings measure on their own meshes as follows:
- **NAS77A3-015A:** outer cylinder faces 8/9, Ø7.965; bore faces 2/3, Ø4.826.
- **214820-002:** outer cylinder faces 10/11, Ø8.506; bore faces 4/5, Ø4.826.

| edge (per attachment, `pitch_link_` / `tan_link_`) | kind | what closes it |
|---|---|---|
| `*_flanged_bushing_press_fit` | gap, **`press_fit`** (new word) | the bore's band, which is **cited**, less NAS77A3's outer-diameter band, a **gap** (`JB_NAS77.pdf` is in the inbox but not parsed) |
| `*_straight_bushing_transition_fit` | gap, **`transition_fit`** (new word) | the bore's band, **cited**, less 214820-002's outer-diameter band, a **gap** (no drawing in the inbox) |
| `pitch_plate_*_bushing_bores_position` | structural, 215735-001 | the cited Ø0.03Ⓜ to GⓂ / FⓂ |
| `*_flanged_bushing_wall`, `*_straight_bushing_wall` | structural | each bushing's own bands, a gap |
| `*_flanged_bushing_bore_to_attach_bore` | gap, `pin_in_bore` | the bolt, which is not in the model |
| `*_straight_bushing_bore_to_flanged_bushing_bore` | gap, `pin_in_bore` | the bolt, through both bushings |

No edge carries a `dimension`, which keeps v2's rule. Each note cites what
exists and names the gap. Nothing was transcribed from v1. The two source gaps
are filed in `ISSUE_20261118_the_pitch_plate_bushing_fits_wait_on_the_nas77_sheet_and_214820_drawing.md`.

**Why two new interface words.** `pin_in_bore` already covered "a pressed
race", but it cannot say pressed versus transition, and deliverable 2 asks the
constraint to say which fit it is. I added both words to `INTERFACE_KINDS` and
regenerated `vocab.gen.js`. Each reached:
- its everyday word, `VA.INTERFACE_KIND_WORDS`;
- a map symbol (press = the disc fills the ring; transition = a smaller disc with a faint ring between);
- `interface_contact.CONTACT_PAIRINGS`, as cylinder in cylinder;
- both vocabulary lines and both symbol tables in `DAG_TOPOLOGY.md`.

`SHARED_NODE_INTERFACES` derives them automatically.

## Bindings — nothing re-keyed

I folded a copy of the log (101 files, 100 events; the real log's listing was
identical before and after, 101 files) with master's models and with this
branch's. **All 48 features came out identical: same state, same outcome, same
faces.** Every id Jeff has bound kept its id and its part.

`pitch_plate_link_attach_bore` was already in `disagreement` on master. One
bind takes 1380/1381 alone (the plate's Ø8.520 straight-bushing bore, empty in
this mesh). The other also takes 1509/1510 (the flanged bushing's Ø4.826
bore). It is still in disagreement now. That is the keep-or-let-go flow's to
settle, not this handoff's.

**For Jeff (filed as `ISSUE_20261118_which_part_the_pitch_plates_attachment_bores_sit_on.md`,
`audience: strategy`):** which part should each attachment bore finally sit
on? If it moves, this is what would move. Each "move" is a re-pick under a new
key, never a migration of the old event.

| event / feature (key today, v1's id) | old key | new key, option b (plate's bore) | new key, option c (bushing's bore) |
|---|---|---|---|
| binds 0093–0100, `pitch_plate_link_attach_bore` | `vpa_pitch_linkage` / `pitch_plate_215177_001` / `pitch_plate_link_attach_bore` | `vpa_end_stop_v2` / `pitch_plate_215735_001` / `pitch_plate_link_flanged_bushing_bore` (faces 1385/1386) | `vpa_end_stop_v2` / `flanged_bushing_nas77a3_015a` / `pitch_link_flanged_bushing_bore` (NAS77A3 faces 2/3) |
| `pitch_plate_tan_link_attach_bore` (no standing bind) | `vpa_pitch_linkage` / `pitch_plate_215177_001` / `pitch_plate_tan_link_attach_bore` | `... / pitch_plate_215735_001 / pitch_plate_tan_link_flanged_bushing_bore` | `... / flanged_bushing_nas77a3_015a_tan_link / tan_link_flanged_bushing_bore` |

## The map

**Layout.** Jeff's 12 places are unchanged, and the plate assembly's members
run in a row to its right:
- `flanged_bushing_nas77a3_015a_tan_link` at [3, 3] and `pitch_plate_215735_001` at [4, 3];
- the pitch link's flanged bushing has no place, so it sits under the plate;
- the straight bushings are at [4, 1] (pitch link) and [4, 2] (tangential link).

The map is 2127 × 2334 world units, against master's 1339 × 2334. It is still
portrait and fits Side by side at 3840.

**How the layout was chosen:** by measurement, not by eye.
`VA.mapLayout` runs in node against the projection, and I scored every
placement of the five new parts in the free cells right of the plate. The score
was the map's own `notes`, plus whether the assembly's outline holds a part
that is not its member. Before the code change, columns 3–4 had no clean
placement: the best had 1 defect, an outline wrapping the piston body. Six
columns had none either.

- **The cause was a row with a part between.** That is the column detour's case
  (2026-11-17) turned sideways, so `map.js` gained `rowDetour` beside `detour`:
  the row's outer flank and a lane under or over the boxes between. Master's map
  still lays out with no notes and the same bounds under it. Only that much was
  compared, not every point.
- **The test has a witness:** a fast-tier test plus its witness spec
  (`fast__a-joint-between-two-parts-of-one-row...`, WITNESSED), with the census
  pin raised 604 → 605.
- **Two model shapes the map forced, both truer anyway.**
  - The straight bushing's bolt edge runs to the flanged bushing's bore, not
    to the attachment bore. The bolt goes through both bushings, and this makes
    each attachment a triangle off the plate instead of a ring through it.
  - The new edges go last in `edges[]`, so the tangential link joint is the
    plate attach-bore pin's first interface and keeps its left-hand side.
    With my edges first, the joint's symbol sat on the plate's name.
- **What's left (filed as `ISSUE_20261118_a_map_feature_with_partners_on_two_sides_crosses_its_own_box.md`):**
  - The tangential-link attach bore has partners on both sides of the plate.
    One pin per feature means one route crosses the plate's own box, which the
    notes exempt.
  - The child-under-parent connector's symbol sits on the child box.

**Shots** (`docs/sessions/lessons/shots/the_pitch_plate_is_an_assembly_with_its_bushings/`,
from `tests/debug_pitch_plate_assembly_20261118.mjs` against a scratch root
built from this branch). I read every one.
- `01` is the 3840 Side by side landing: everything fits.
- `02` is the district.
- `03`–`10` are each new joint hovered. Each lit its two pins and its one grid row.
- `11` is the plate assembly selected in the tree:
  - the tree nests the plate and both flanged bushings with their features, and the straight bushings sit at the body's top level;
  - the map lights the assembly's members (37 marks), and the pane lights the plate;
  - the interface rows read "press fit" and "transition fit".
- `rejected_layout_crossing_straight_bushings.png` is the other clean placement. Its two straight bushings' routes cross.

The page shows "data is older than the code", because the scratch build was
dirty mid-session. It is not a product defect.

**Not addressed:**
- The 3D pane draws the plate and the two flanged bushings twice, from the
  assembly mesh and from the children's meshes. That class is already filed:
  `ISSUE_20261001_the_pitch_link_assembly_mesh_and_its_own_two_bearings_are_both_drawn_in_sweep_mode.md`,
  with an addendum added. The handoff's "a child names a solid of its
  assembly's mesh" is the fix, and the solid order is now measured.
- The pane's part list is flat (`AA.sweepModelTree`), as it already was for the
  pitch link's bearing. The tree is where the nesting shows.

## What the same move costs on the hub

The hub (214373-002, mesh `e28285d1`, 286 solids) has **4 standing features**
on it, from its 6 bind events:
- `hub_spindle_bore_axis` (face 144), `tan_link_mount_hub_face` (526) and
  `tan_link_mount_fastener_clocking` (743/744), all on **solid 0**;
- `hub_blade1_root_bearing_bore` (2356/2358), on **solid 47**.

Done this handoff's way (the assembly keeps its ids, and children with
features are added beside it), the cost is **0 re-keys**. Moving the features
onto children would mean 4 re-picks across 2 solids: solid 0's child takes 3
features, solid 47's takes 1. Unlike 215177, which solid is which Enovia child
is **not** recorded for the hub: no per-part meshes exist for its 20 leaves.
So the next structure handoff starts from mapping the hub's solids to its
Enovia children, which 215177 got for free from separate meshes.

## Gotchas

- **`numpy` is not in `venv-win`.** Use `tolerance_stack.feature_geometry`
  (`read_mesh`, `fit_face`) for mesh fits.
- **v2's JSON round-trips exactly** with `json.dumps(indent=2, ensure_ascii=True)`.
  The map file does not, because its arrays are inline, so edit it as text.
- **The viewer `[real]` tier needs `docs/` in the scratch root** (worksheets)
  as well as the crops rebuilt with drawing-checker's interpreter. Otherwise it
  is either stale or 5 worksheet checks go red.
- **A witness run `--repo C:/workspace/tolstack` from a branch whose tree moved
  the projection inputs is "red before the mutation".** Pass the scratch root.
- **`apps/viewer/README.md` and `views/topology.js` carry a re-derived count**
  of nodes answering differently when hovered and when clicked. New nodes move
  it (74 of 119 → 86 of 131, the set count 54 → 66).

## Blocked actions

None.

## Test record

- **Default tier**, in this worktree:
  `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -p no:cacheprovider`
  gave 2371 passed, 2 failed, 1 skipped, 4 deselected, in 482 s (inside budget, recorded).
  - `test_viewer_js_suite_is_green` failed on the worktree's skipped `[real]` tier,
    which is expected here (CLAUDE.md). That tier was run separately against the scratch root, below.
  - `test_mutation_witnesses.py::test_every_anchor_resolves_to_exactly_one_place`
    failed because my map.js edit rotted the column-detour spec's anchor. I
    re-pointed it, and the file then gave 49 passed.
- **Fast tiers**, against a scratch root built from HEAD
  (`C:/workspace/tolstack/data/scratch/ppab`, projection paired at 703984f6):
  `node apps/viewer/run_tests.cjs --repo <it>` 605/605;
  `node apps/annotate/run_tests.cjs --repo <it>` 331/331.
- **Witness**, against the same root, `--only` both detour guards (the new row
  guard, and the column guard whose anchor moved): 2/2 witnessed.
- **Browser tier**: no browser suite was added or changed, so none was run.
  The inspection probe is not a tier.

## Re-run 2026-11-19 — review round 1 (REQUEST CHANGES)

- **The question is now on Jeff's review page, with the faces shown**
  (blocker). Rows Q3 (pitch link) and Q4 (tangential link) are in
  `REVIEW_20261117_the_portrait_map_and_the_joints.md`, each linking the issue.
  Six shots `q_*.png` sit in this lesson's shots folder:
  - each option's faces marked on the 215177 mesh, in the 3D pane, with the plate see-through: option (b) is the plate's Ø7.950 bore, option (c) the flanged bushing's Ø4.826 bore;
  - Jeff's two disagreeing binds, on 1380/1381 alone and with 1509/1510.

  `tests/debug_pitch_plate_assembly_20261118.mjs --questions` takes them. What it
  took to get a face-level shot, for the next person:
  - arm a pick on the attachment's joint end (`arm <edge> <end> <topology> <part>`, which isolates the part and writes nothing without a click);
  - wait until `__scene.renderCount` stops moving, because the arm's and the sweep's own framing land seconds later and undo any camera set before them;
  - hide the other parts, ghost the plate, then place the camera yourself, radially out from the hub's axis and above, so blade 1 is not between the camera and the plate.

  `camera face` alone framed from a fixed direction straight through blade 1.
- **The tangential link's bore-to-attachment note no longer claims a binding**
  (should-fix). The sentence had been copied from the pitch link's twin; no
  event names `pitch_plate_tan_link_attach_bore`.
- **The tangential link's flanged bore note quotes datum F too** (nit 4).
- **v1 is reached through the alias table** (nit 3, stated rather than
  changed). The new `flanged_bushing_nas77a3_015a` row is keyed by an id v1
  also has. v1's builder line went from 26/35 to 27/35 parts with an installed
  mesh, and v1's flanged bushing is now drawn at all eight NAS77A3 instances
  (v1's part declares no `occurrence`). The mapping is physically right: v1's
  part is the NAS77A3-015A by its own nomenclature. But it is a v1 change the
  fence did not foresee, and an alias row keyed by a shared id reaches both
  models by construction.

### Round 2 test record

- **Default tier**, in this worktree, at 301bfa41:
  `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -p no:cacheprovider`
  gave 2372 passed, 1 failed, 1 skipped, 4 deselected, in 451 s (inside budget,
  recorded). The one failure is `test_viewer_js_suite_is_green`, on the
  worktree's skipped `[real]` tier, which is expected here; that tier is the
  next line.
- **Fast tiers** against a scratch root built from 301bfa41 (all eight
  builders, projection paired at 301bfa41): viewer 605/605, annotate 331/331.
- **Witness:** no guard or spec changed this round.
- **Browser tier:** no suite changed this round, so none was run.

## Re-run 2026-11-19 — review round 2 (REQUEST CHANGES)

The post-merge browser tier found four `[real]` suites red on the new
structure. I had run none: "no browser suite was added or changed" was the
wrong test, because the suites read the model and the model grew 5 parts.
**A stack-data change is a browser-test change.** For each suite, product or
check:

- **The model drawn alone — two product defects, one check assumption.**
  - *Product:* `AA.occurrencePins` kept one occurrence per **mesh**. v2's two
    NAS77A3 flanged bushings are one mesh at two places, and so are its two
    214820-002 straight bushings, so the last part read won and the other was
    drawn nowhere. It now keeps a list, read by `AA.pinnedOccurrences` and the
    sweep's candidate filter. Measured: both shared meshes now draw at 2 places.
  - *Product:* the sweep's rider loop chose among every recorded place of a
    part's mesh. Once the pins kept both 214820 places, `bushing_214820_002`
    was refused as a tie. Before that, it had "passed" by riding at the
    straight bushing's place. A part that declares its occurrence now rides
    there, and a second part on the same mesh is no longer skipped as already
    placed.
  - *Check:* "as many meshes as parts" assumed one mesh per part. It now
    compares the drawn set with the meshes the parts resolve to (18 for 20
    parts) and requires each shared mesh at every declared place. The posed
    check read only rows named by topology part. 215735-001 and both NAS77A3
    bushings are **carried** inside the plate assembly's occurrence, whose
    row names the mesh. They do ride the plate, as the diagnostic row dump
    showed (`carried`, keys under `215177-001.3`), so a carried row now counts
    by mesh and declared occurrence.
- **The DAG zoom — product.** A click on a part's name at the fit moved the
  map by 1px. `VA.mapBringIntoView` counted anything inside its 24px pad as
  off screen. At v2's new fit (k 0.25, wider since the column-4 places), the
  drawing's 40-unit margin is 10px, so an edge box that was wholly visible
  "needed" a pan. Bring-into-view now pans only an axis the rect is actually
  off screen on, and the pad is how far it brings the rect in. A fast check
  pins both cases. `DAG_TOPOLOGY.md` says so.
- **A pattern is bound… (filter count 46 vs 38) — not reproduced.** It was
  46 = 46 here twice at the tip, and once at the round-1 tip `ee6c5861`
  against the same scratch root. That is the same code path the reviewer ran,
  so it is timing: `openAll` gives up after four rounds of 2s-timeout clicks,
  and v2 now nests one level deeper. I added a diagnostic that prints every
  part twisty and feature row when the counts disagree, so a recurrence says
  which rows were missing.
- **3D pane follows the selection ("leaving it takes the light down") — not
  reproduced.** It went 4 of 4 green at the tip and green at `ee6c5861`.
  `integration` has not moved since this branch was cut (`433619e5`), so the
  merged tree is this tree in `apps/`, `scripts/`, `tolerance_stack/` and
  `docs/topologies/`. The reviewer's two reds came from their environment
  (their root, or the load at the time), not from code that differs.

### Round 3 test record

Scratch root `C:/workspace/tolstack/data/scratch/ppr2`, built from
`0717cb0d` with all eight builders and `--data-root`. Kinematic was rebuilt
at `06cbfaa0` after a dirty stamp. Projection paired; the real log still
holds 101 files.
- **Browser, `--only`, at `2560a437`:** the model drawn alone 22/22, a
  pattern is bound 11/11, the DAG zoom 35/35, 3D pane follows the selection
  31/31. Each run wrote its own `partial` ledger row.
- **Fast tiers:** viewer 605/605, annotate 331/331.
- **Witness**, `--changed-since ee6c5861 --budget-min 30 --repo <scratch>`:
  15 reached, 12 WITNESSED. The 3 on "the map" suite are "red before the
  mutation", on its pin-hover check, which is red on `integration` too
  (`ISSUE_20261118_the_map_pin_hover_real_check_is_red_on_integration.md`).
  So the run exits 1. The bring-into-view spec (`…bd77c7ea`) lives on the
  same suite, so I applied its mutation by hand and ran the map suite
  `--only`: its own check went red (28/30, where the clean run was 29/30).
  That run's ledger row is for the mutated tree.
- **Default tier**, in this worktree, at `2560a437`:
  `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -p no:cacheprovider`
  gave 2372 passed, 1 failed, 1 skipped, 4 deselected, in 440 s. The one
  failure is the expected worktree `test_viewer_js_suite_is_green`. The two
  doc sentences landed mid-run, so the 14 test files that read the docs and
  lessons were re-run after them: 1375 passed.
