# LESSONS 2026-11-10 — the_gas_spring_mount_sits_on_the_tan_link_mount_in_the_end_stop_model

Model v2's base is now a stack, hub → tangential link mount → gas-spring
mount → piston cover (Jeff, 2026-11-10: "Yes, mount on mount."). The hub
reaches the gas-spring mount nowhere. Scope held: v1, viewer and annotator
code, the sweep and other joints are untouched. The one viewer file changed
is `apps/viewer/README.md`, whose crossing figures are re-derived by the
`[real]` tier.

## The base body, before and after

| | before (integration `25765f23`) | after |
| --- | --- | --- |
| the gas-spring mount's seat | node `gas_spring_mount_hub_face`, parts `[gas_spring_mount, hub]` | node `tan_link_mount_gas_spring_seat` (v1's id), parts `[gas_spring_mount, tan_link_mount]`, name "gas-spring mount base face" |
| hub → gas-spring mount | `hub_spindle_to_gas_spring_mount_face` (boss → hub seat) | none |
| tangential link mount → gas-spring mount | none | `tan_link_mount_overall_height` (v1's id and ends: seat → hub face; v1 cites 215198-A 79.00 ±0.10) |
| base → bushing bores | `gas_spring_mount_height` (hub seat → bores) | `gas_spring_mount_seat_to_bushing_bore` (seat → bores), a v2-only id |
| base → stop / flange | `gas_spring_mount_hub_face_to_cover_seat` (hub seat → cover flange), then `gas_spring_mount_flange_to_end_stop` (flange → stop) | `gas_spring_mount_datum_a_to_end_stop` (v1's id and ends: seat → feather stop; v1 cites 213668-002 76.86 ±0.10), and `gas_spring_mount_flange_to_end_stop` unchanged |
| cover | `piston_cover_mount_flange_seat`, `piston_cover_flange_to_end_stop` | unchanged |
| counts | 25 nodes, 30 edges, 7 branch points, cycle rank 6, 8 gaps; view 34 features, 22 dimensions, 17 interfaces, 15 joints | all the same |
| per part (features, dimensions) | hub 5/4, tangential link mount 4/3, gas-spring mount 4/3, cover 2/1 | hub 4/3, tangential link mount 5/4, gas-spring mount 4/3, cover 2/1 (pinned in `tests/test_model_view.py`) |
| branch points in the base | boss, hub seat, flange seat, feather contact | boss, tangential-link-mount hub face, the new seat, feather contact |

v2 stays valueless. No dimension was copied in, and each edge's note names
what v1 cites.

**Why two edges got new ids.** `test_a_model_that_reuses_anothers_ids_means_the_same_feature_by_each`
holds every id v2 shares with v1 to v1's kind, ends and part. v1 still runs
`gas_spring_mount_height` and `gas_spring_mount_hub_face_to_cover_seat`
from v1's hub seat. Re-anchoring them in v2 under the same ids would carry
a v1 binding onto a different pair of features. So the bushing dimension is
`gas_spring_mount_seat_to_bushing_bore` (v2-only, v2's identity key). The
cover-seat edge went altogether (item 2). None of the removed or renamed
edges had a binding (item 4).

## Item 2 — datum A reaches the stop in one edge

213668-002 A.1 sheet 1, SECTION C-C (drawing-checker run
`20260819_150314_213668-002_A.1_MOUNT,_GAS_SPRING,_PROPELLER`, `page_1.png`,
read by eye) dimensions **76.86 ±0.10** from the base to the top face. The
base is datum A, carried by the side view's flatness 0.1 frame. The top
face is the feather stop. The other axial callouts on the sheet are
`5X 4.00 ±0.10 FLANGE THICKNESS` and a `(85.36)` reference. Neither puts the
cover flange relative to datum A. The flange-to-stop 8.667 has only note
12's general profile (`docs/tolerance_stacks/WORKSHEET_gas_spring_end_stop_travel.md`
§3 read sheet 2 the same way: "none is an axial flange-to-stop length").
Jeff's 2026-10-20 note says the same from the other side: a datum-A to
cover-flange tolerance "would improve the absolute flat pitch end stop
accuracy", which is a tolerance the drawing does not carry today.

So v2 now runs **seat (datum A) → feather stop** in one edge (v1's
`gas_spring_mount_datum_a_to_end_stop`). The cover flange is reached from
the stop (`gas_spring_mount_flange_to_end_stop`). v2's base → flange edge
was dropped, which leaves one route to each face. A study of where the
feather stop sits sums the datum-A edge. The travel study sums the
flange-to-stop edge and never the datum-A edge. A bonus: the datum-A edge's
two open proposals (v1-keyed, 0033 and 0034) now read through on v2.

## Item 4 — the two re-measurements (after the change, 2026-11-10)

- **Sweep:** `data/inbox/linkage-sweeps/vpa-pitch-p2-20261105-204957.json`'s
  `geometry.features` names **9 distinct node ids**, all present in v2 and
  none removed: `gas_spring_mount_bushing_bore`,
  `gas_spring_piston_body_od`, `hub_blade1_root_bearing_bore`,
  `hub_spindle_bore_axis`, `pitch_link_lower_sphere_centre`,
  `pitch_link_upper_sphere_centre`, `pitch_plate_spindle_bore_axis`,
  `tan_link_lower_sphere_centre`, `tan_link_upper_sphere_centre`. The
  handoff and v2's provenance say ten. That is the count of (node, body)
  pairs, because `hub_blade1_root_bearing_bore` is named on both `base`
  and `blade`. Either way, none of the removed ids is in it.
- **Bindings:** `data/projections/feature-identity/bindings.json` (rebuilt
  from this tree: 12 bound, 62 proposed, 1 rejected, 54 open). It carries
  **0** records on `hub_spindle_to_gas_spring_mount_face`,
  `gas_spring_mount_height`, `gas_spring_mount_hub_face_to_cover_seat`,
  `tan_link_mount_overall_height` and
  `gas_spring_mount_seat_to_bushing_bore`. `gas_spring_mount_datum_a_to_end_stop`
  carries its two v1-keyed proposals, still `proposed`.

## The surprise: the walk's layout, not the model, turned the tier red

The first full `[real]` run after the change was 674/676. Two checks were red:

1. `drawn as blocks, … crossing itself no more than the builder's walk does`:
   v2 drew 32 crossings as blocks against 31 on the builder's walk.
2. The README's crossings sentence, a prose figure the tier re-derives
   (260 → 276).

For (1) I built a scratch harness: the tier's own modules in a `vm`, with
the projection's v2 layout or a variant built by
`build_topology_projection.project_topology`. Neither the datum-A choice
nor node order nor edge direction caused it. The base → flange shape
crossed worse (36 vs 34). What moves it is **authored edge order**. With
the hub's blade-bore edge first among its edges it fails, and after the
hub's three tangential-link-mount edges it passes (27 drawn vs 36 builder).
That order also reads up the stack, so it is committed, with a `notes`
line saying why. The guard holds by authoring and not by construction:
`VA.gatherParts` keeps its re-laid walk even when it crosses more. A second
effect of the new in-body loop is that the hub draws as **two** brackets.
Its two tangential-link-mount dimensions land after the cover as closures.
All 24 hub-edge orders give the same gathered runs, so no data change fixes
it. Both are filed in the layout class (below). Neither was fixable here
under the viewer fence.

For (2) the README now says 276 → 37, v2 57 → 15, with v2's rail
allocations at 15 over 8. Those are computed with the test's own arithmetic.

**Gotcha for the next person tuning v2's walk:** every variant has to rebuild
the *kinematic* projection too. The tier's freshness gate names
`kinematic/kinematic_studies.json` as stale the moment the topology file
moves.

## The shots (`docs/sessions/lessons/shots/the_gas_spring_mount_sits_on_the_tan_link_mount_in_the_end_stop_model/`)

`node tests/debug_base_stack_20261110.mjs` serves this tree's `apps/` over
the main checkout's `data/`, which was rebuilt from this tree at `1c5b427b`.
Shots are 3840×2160 and were read before this section was written.

| shot | what it shows |
| --- | --- |
| `d1_v2_page`, `d2_v2_dag_base_body` | the DAG: ground's blocks top-down 214373-002 hub, 215175-002 tangential link mount, 213668-002 gas-spring mount, 214958-002 cover, then the hub's second small block (the issue below); the hub has no rail to the gas-spring mount |
| `t1_v2_tree_ground_parts_and_interfaces` | ground open: hub 4 features (none on the gas-spring mount), tangential link mount 5 (its last "gas-spring mount base face"), gas-spring mount 4, cover 2; Interfaces: the hub/tangential-link-mount joint (3 constraints), "gas-spring mount base face" contact, "piston cover flange" contact |
| `g1_v2_grid` | the grid's ground rows: hub, tangential link mount, gas-spring mount ("gas-spring mount base face to bushing bores / … to feather stop face"), cover, then the hub's two tangential-link-mount rows |
| `s_low_stop`, `s_mid`, `s_feather_stop` | the P2 run at its first, middle and last point: the four base parts at the identity translation each time, the pitch plate and the lower head together at z 41.13 / 10.72 / -23.33, and 15 of 15 parts placed |

What I looked for and did not find: a console error on any shot, a part
left unplaced in the sweep, and any feature on the hub naming the
gas-spring mount.

## Any other wrong neighbour

I read every v2 contact and gap. Only one candidate: blade 1's root seats on
the hub directly, while the node's own name says "root bearing bore" and
no root bearing is a part or on the "left out" list. Filed with `needs: jeff`.

## Filed

- `ISSUE_20261110_v2s_whole_walk_draws_the_hub_twice_and_its_block_guard_holds_only_by_edge_order.md`
  (strategy, `dag_layout_policy`).
- `ISSUE_20261110_v2_seats_blade_1s_root_on_the_hub_with_no_root_bearing_between.md`
  (`needs: jeff`).
- Already filed, recurrence appended: `ISSUE_20261104_a_lesson_screenshot_name_overflows_max_path_in_the_shadow_concurrency_test.md`.
  `test_two_different_repo_roots_both_still_succeed` was red once from this
  worktree at basetemp `pytest-13373` and green in the three full runs.

## Suite record

The projections were rebuilt from this tree into the main checkout's
`data/`. Every builder was run by hand from the worktree with
`--data-root C:/workspace/tolstack/data`, in `rebuild_projections.ps1`'s
order, at `1c5b427b`. The later commits change only tests, docs and shots,
none of them a projection input. The viewer tier's freshness gate passed
after them.

| tier | command (from the worktree) | result | wall |
| --- | --- | --- | ---: |
| default | `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -p no:cacheprovider -rfs` at `9bc97d94` | 1 failed, 1927 passed, 1 skipped, 2 deselected. The one red is `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`, the deliberate worktree red. The skip is `test_fit_bound_features.py:424` (the 2026-10-01 bearing re-extraction is not installed). | 424 s, inside budget, recorded with `dispatch suite-time` |
| viewer fast + `[real]` | `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` | 676/676 | ~25 s |
| annotate fast | `node apps/annotate/run_tests.cjs` | 307/307 | ~20 s |
| browser TRUTH | `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` (through a `node_modules` junction, removed afterwards) | 44/44 | 1870 s |
| mutation witnesses | `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack --changed-since integration` | 0 of 879 entries reached by this diff | 0 s |

`-n 16 --dist loadfile` is not available: this venv has no xdist
(`unrecognized arguments: -n`), so the default tier ran single-process.
Nothing the repo names went unrun. The browser tier and the witness run
were run from the worktree against the main checkout's data, not in the
main checkout, because the point was this tree's code. The review merge
runs both again there.
