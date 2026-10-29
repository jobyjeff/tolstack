# LESSONS 2026-10-29 — the_contact_engine_asks_the_ends_what_shape_they_are

Handoff: `docs/sessions/HANDOFF_20261029_the_contact_engine_asks_the_ends_what_shape_they_are.md`.
Four engine fixes in `tolerance_stack/interface_contact.py` and
`scripts/build_contact_suggestions.py`. Every number below was read from two
projections. **Before** is the main checkout's live
`data/projections/feature-identity/contact_suggestions.json`, built 2026-10-29
09:54. **After** was built from this branch @ `43a45961` into a scratch data
root, with meshes read from `C:\workspace\tolstack\data\meshes`. The shared
projection was **not** written: the DoD's rebuild happens in the main checkout
after merge.

## What changed, and the call behind each

1. **The ends pick the pairing.** Each end node's class comes from
   `fg.end_surface_class(edge.name or edge.id, node.name or node.id)`, called
   exactly as `propose_bindings.py` calls it. The two classes give the pairing
   (`ic.END_PAIRINGS`, all six sorted pairs of the fitted classes), and each
   side is filtered to its own class. The interface word is the tiebreak
   (`ic.end_pairing`, `PAIRING_BASES` = ends / one_end / interface).
   **A planar end with a cylindrical end had no pairing at all**, which is
   exactly the shank-out shape. So there is a fourth kind,
   `plane_across_axis` (relation `across`, new in `RELATIONS`). It is a flat
   whose normal runs along a cylinder's axis, with the axis crossing the
   flat. Its evidence `end_mm` is where the cylinder ends past the flat (+)
   or short of it (−), and it ranks a washer's far face first. `clear_top`
   counts `across` as the relation that pairing is for. The JS words table
   needed both new words; `vocab.gen.js` was regenerated.
2. **A ball's cylindrical seat must be a bore (concave), ranked by radius
   against the ball's own radius.** The concavity filter did most of the
   work. The plate's r 5.5499 (bushing flange OD) and r 3.9827 (bushing OD)
   are convex, and so are the pitch arm's r 6.35 and r 6.0. **The handoff's
   other option, the ball's own bore radius, was measured and rejected.** The
   ball's bore is r 2.41, and it would rank the plate's pressed bushing bore
   (r 2.413) first, which the drawing's lug holes refute. A planar seat must
   touch where the sphere is: a ray from the centre toward the flat has to
   pass through the ball's own facets (`_ray_hits`). Mount faces 810/1594,
   both at −0.0186 mm, fail that test on all four face pairs (checked
   directly at the old occurrence pair).
3. **`cylindrical_slide` edges are judged as axes** (`ic.AXIS_INTERFACES`).
   Every occurrence pair and every face of both parts is compared, with no
   reach gate. The pitch plate's only on-rotor-axis cylinder (439/465, r 16.5
   convex) is 42.17 mm from the hub's box, which is why no reach near 1 mm
   could see it. The 10-28 lesson's "widened to 150 mm, found one pair 2.6 mm
   off" was a face-level gate. The 2.54/2.64 mm pairs are r 4 bolt holes.
   A coaxial pair also gets a size term (`|Δr| / max r`), because the hub has
   ~50 cylinders on the rotor axis, all at offset 0.000.
4. **Own slots first.** `best_of` now ranks (relation, −own, score). Before,
   it was (relation, score, −own). `edge_candidates` returns `own`, and
   every candidate's evidence carries `own: {from, to}`.

## Before → after, the DoD's four

**The four old `single_clear_top` pairs** (summary 4 → 3; the 3 are now
`pitch_arm_link_joint`, `shank_out_pitch_link` and `shank_out_vpa_out`):

| edge | before (refused by the shape rule) | after |
|---|---|---|
| `tan_link_mount_end_centre_is_this_bearing` | bearing OD 0/1/20/21 in eye 83/84, cyl/cyl | sph/sph: race 10/11 on ball 64/65, and ball 26/27 in race 48/49, both centre 0.000 mm. A tie, so not clear |
| `tan_link_plate_end_centre_is_this_bearing` | MS14103-3 OD 22/23 in eye 79/80 | **`no_contact`**: the link's mesh has no sphere at that bearing's centre. Filed: `ISSUE_20261029_the_tangential_links_plate_end_has_no_sphere_to_bind_its_centre_to.md` |
| `shank_out_pitch_link` | washer bore 2/3 round shank 7/9/36/37 | `across`: washer face **5** on shank 7/9/36/37, end_mm **+0.0234**, score 0.0174; runner-up face 4 at −0.836. Clear |
| `shank_out_vpa_out` | bushing bore 4/5 round shank | `across`: bushing face **12**, end_mm **−0.0109**, score 0.0106; face 13 at −4.73. Clear |

No candidate in the rebuilt projection names a face its end would refuse
(`test_real_no_candidate_names_a_face_its_end_would_refuse_for_its_shape`).

**Ball seats:**

| edge | before rank 1 (rank 2) | after rank 1, 2, 3 |
|---|---|---|
| `pitch_arm_link_joint` | r 2.413 (78/79/275/276) 1.693589, tied with r 6.35 1.693595 | r 2.413, the same faces, 2.224773, **alone**: r 6.35 and r 6.0 are convex |
| `pitch_plate_link_joint` | r 5.5499 (1559/1560) | **r 4.26** (1410/1411) 2.0759; r 3.975 (1415/1416) 2.2281; r 2.413 (1566/1567) 2.3735 |
| `tan_link_plate_joint` | r 5.5499 (1502/1503) | **r 4.26** (1420/1421) 2.3675; r 3.975 (1425/1426) 2.4099; r 2.413 (1471/1472) 2.5795 |
| `tan_link_mount_joint` | r 2.415 (1569–1572); planar 810, 1594 at ranks 3/4 | r 4.5 (722/723) 2.6266; r 6.145; r 3.795; r 2.415 (1447–1450) 2.8027; no planar seats |

The plate joints' face ids changed because the winning occurrence pair
changed, from pitch link `.4` to `.3` and tangential link `.2` to `.3`: a
different blade's lug, by key order, among equal scores. That is the open
which-blade question
(`ISSUE_20261028_contact_suggestions_cannot_say_which_blade_a_topology_edge_means.md`).
**`tan_link_mount_joint`'s rank 1 moved from r 2.415 to r 4.5, and no
drawing was checked for the mount.** By analogy with the plate, a lug hole
holding a bushing would be the larger bore. But the pitch arm's seat is its
bare .190 hole, so the next proposal pass should look at the mount's drawing
before proposing either.

**Coaxiality:** `hub_to_pitch_plate_spindle_coaxiality` went from
`no_contact` (nearest 1.04 mm, reach 1.0) to `ok`, relation `coaxial`. Hub
3460/3461 (r 47.5, a bore) is on plate 439/465 (r 16.5) at axis offset
0.000 mm and 0.000°. All ten candidates are at offset 0.000, so which hub
cylinder "the gas-spring bushing bore" is is a size ranking, not a finding.

**Own slots:** every candidate carries `own`. The borrowed ones in the
rebuilt projection are the two `pitch_link_*_centre_is_this_bearing` edges
(link at `213862-002.1`, the instrumented variant's slot): `own: {from: true,
to: false}`. **The issue's measured case was not a borrow.** The U11D bolt's
`NAS6403U10D.3` slot is in its own sidecar (`own: true`). It is the CAD's
instance name, nothing more.

## The coaxiality issue's data half (out of scope; refiled)

`gas_spring_rod_to_pitch_plate` is still `no_contact` at 51.54 mm (the gas
spring is at another stroke). `gas_spring_bushing_coaxiality` is still
`no_occurrence` (`gas_spring_mount_213668_002` has no placement). Refiled as
`ISSUE_20261029_the_gas_spring_sits_at_another_stroke_and_its_mount_has_no_placement.md`.
The issue's feature gap (interface nodes that name two parts are never
compared) is refiled as `ISSUE_20261029_contact_suggestions_run_on_gap_edges_only.md`.

## The 90 open ends — what the next proposal pass gets

The 10-28 lesson does not enumerate its 90, and they cannot be rebuilt
exactly. My reconstruction is: every edge end, the node's parts resolved
through the alias table, minus the 55 proposed events in the inbox. That
gives **111 open meshed ends** (24 with no mesh, against the issue's 45; with
`parts[0]` only, 87 and 49). The measure is the same either way. Of those
open ends, counting a gap-edge row on the end's own edge or at its node whose
top pair puts a face of this end's asked class on this end's mesh:

| | clear top pair | any rank 1 |
|---|---:|---:|
| before | 5 | 13 |
| after | **9** | **19** |

The **new usable clear tops** are `pitch_arm_radius.to` and
`pitch_arm_link_hole_to_clocking_hole.from` (pitch arm bore 78/79/275/276,
clear now that the bosses are gone), `shank_out_vpa_out.from` and
`straight_bushing_vpa_out.to` (bushing face 12, the far face). The shank
ends of `fastener_grip_*`, `shank_out_*` and `thread_region` were already
counted, and they still name the shank cylinder, not its end.

The **new rank-1s that are not clear**: the hub's on-axis bore 3460/3461
for `hub_blade_axis_offset.from`, `hub_spindle_to_gas_spring_mount_face.from`,
`hub_spindle_to_tan_link_mount_face.from` and the coaxiality edge itself; and
the plate's lug holes, which are now drawing-consistent, for the
`pitch_plate_attach_*` / `pitch_plate_flange_to_link_hole` /
`pitch_plate_tan_link_attach_radius` ends.

## Gotchas

- **The build went from 13 s to ~2 m 18 s**, almost all of it fitting all
  3473 hub faces and 1621 plate faces for the one axis edge. It is fine on
  the rebuild rail. Do not put the real builder in a pytest test.
- **`end_surface_class` falls back to the edge's name.** The synthetic
  fixture's `pin_joint` therefore asks for cylinders through the word "pin"
  (`basis: ends`) even though its nodes are bare ids. `loose_joint` is the
  one that exercises the interface fallback.
- The four new `[real]` checks skip while the live projection has no
  `pairing_basis`, and the skip reason names the rebuild. They passed (14/14
  in the file) against the after build, copied into this worktree's `data/`
  for the run and removed afterwards.
- A bash heredoc holding Python with `''` in it broke the Bash tool's parser
  ("unexpected EOF while looking for matching `''`"). I wrote the snippet
  with the Write tool instead.
- `ISSUE_20261028_contact_suggestion_rules_that_pick_the_live_top_pair_are_unpinned.md`
  is deferred onto this handoff and wakes when it lands. Of its four rows,
  this change pins only the `own` ordering
  (`test_an_own_slot_is_preferred_to_a_borrowed_one_and_the_result_says_which`),
  and it changed that row's premise: own now outranks score. The other three
  rows (ball convexity, the coaxial-only-when-nothing-touches filter, the
  interference bound) are still unpinned.

## Found on arrival

Nothing: the worktree was clean. Nothing tracked was written into the main
checkout. The only main-checkout reads were `data/` (meshes, the live
projection and the inbox).

## Verification, as recorded

| tier | where | result | wall |
|---|---|---|---:|
| `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -rfs` | worktree @ `751ae9ae` | **1666 passed, 1 failed, 5 skipped, 2 deselected.** The failure is `test_viewer_js_suite`, the by-design worktree red (no viewer projection here). Skips: the four new `[real]` ends checks (the live projection predates `pairing_basis`; they passed 14/14 in their file against the rebuilt one) and the pitch-link bearing re-extraction test. This venv has no xdist, so the run is single-process | 439 s, inside budget (`suite-time record`) |
| `node apps/annotate/run_tests.cjs` | worktree | 255/255 | — |
| `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` | main data | 506/507. The one FAIL is the freshness gate, and it is correct: this diff changes `tolerance_stack/interface_contact.py`, an input of results/topologies/crops/kinematic, so the node-fs `[real]` tier did NOT run. It runs after `scripts/rebuild_projections.ps1` at merge | — |
| `node scripts/run_mutation_witness_tests.mjs --changed-since master --repo C:/workspace/tolstack` | main data | **3/3 witnessed, 3/3 reached**, 0 left to the sweep; exit 0 | 123 s, recorded (merge tier) |
| browser TRUTH tier | not run | Merge-only. The diff's only browser-visible change is two words in the contact bar and one `describeContact` branch, both pinned in the annotate fast tier | — |

**At merge:** run `scripts/rebuild_projections.ps1` in the main checkout,
**before** the viewer and browser tiers. It rewrites the shared projections
every worktree reads, so run it once the review's own tier runs are finished.
The four new `[real]` contact checks then arm.
