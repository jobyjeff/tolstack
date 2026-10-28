# Lessons — the_lit_set_closes_over_its_joints (2026-10-28)

## What shipped

- `VA.closeLitSet` (apps/viewer/topology.js): a gap edge whose two ends are
  both lit is lit. Called from `VA.litSetOfEdges` (so the kinematic page) and
  `VA.studyLitSet` (chain studies; it now takes the topology as a second
  argument — both callers updated).
- `VA.bridgeLitSet`: **not in the handoff, and needed for its definition of
  done.** Joint closure alone leaves the real kinematic study in two pieces
  when hidden. See "Does a lit path cross an unlit node?".
- Edges the closure or the bridge lit are named in `lit.closed`; `VA.gridPlan`
  skips them, so the grid still lists contributors only (a joint carries no
  row).
- Glyph CSS **unchanged**. A joint that is lit is `rail__glyph--on`, so the
  `.28` opacity no longer applies; `rail__glyphbg` stays `--bg`. The disc is a
  deliberate break in the bar so the glyph stroke (the bar's own confidence
  colour) has `--bg` behind it in both themes; a disc in the bar's colour would
  put the stroke on its own colour. I did not take a screenshot of either theme —
  the contrast reasoning is from the CSS, and the browser tier pins only the
  class, not the pixels.

## Does a lit path cross an unlit node? Yes, once.

Measured against `data/projections/viewer/*` (169 rows, 95 edges, 22 chain
studies + the one kinematic study):

- Every chain study's lit set is one connected piece before and after.
- The kinematic study is **two pieces** after joint closure: the end-stop
  travel stack (10 rows: piston cover / piston heads) and the linkage
  (27 rows). They meet only through the hub: `gas_spring_mount_datum_a_to_end_stop`
  (structural), `hub_spindle_to_gas_spring_mount_face` (structural), and the
  gap `hub_to_pitch_plate_spindle_coaxiality`, across two unlit nodes. The
  bridge lights those three edges and two nodes (lit edges 18 → 21, nodes
  19 → 21). The path is the shortest by edge count; a tie is broken by the
  projection's edge order, and my Python BFS and the JS BFS picked different
  3-edge paths (the JS one goes through `datum_a`), so the choice among equal
  paths is arbitrary — pinned in tests as `LIVE_BRIDGE`.
- **Design call a strategy session may want to revisit:** the bridge lights
  structural edges that no contributor names. It is displayed, never counted:
  it carries no grid row and no leader. I judged "one connected drawing" (the
  handoff's DoD) worth that.

## Closure effect on all 22 chain studies (lit edges before → after)

| study | before | after | joints lit |
| --- | ---: | ---: | ---: |
| `pitch_link_cotter_hole_clearance` | 7 | 7 | 0 |
| `pitch_link_shank_out` | 6 | 7 | 1 |
| `pitch_link_thread_region_t` | 2 | 2 | 0 |
| `pitch_system_blade_angle_average` | 12 | 12 | 0 |
| `pitch_system_blade_angle_worst` | 12 | 12 | 0 |
| `pitch_system_end_stop_minus7` | 12 | 12 | 0 |
| `pitch_system_end_stop_plus72` | 12 | 12 | 0 |
| `pitch_system_gas_spring_branch` | 7 | 7 | 0 |
| `pitch_system_gas_spring_mechanical_stroke` | 1 | 1 | 0 |
| `pitch_system_vertical_hub_to_pitch_arm` | 10 | 10 | 0 |
| `rotor_fastener_grip_u2h` … `u10h` (9 studies) | 3 each | 4 each | 1 each |
| `tan_link_take2_worst_case_protrusion` | 6 | 7 | 1 |
| `vpa_output_shank_out` | 6 | 7 | 1 |
| `vpa_pitch_linkage_travel_between_end_stops` | 4 | 5 | 1 |
| *kinematic* `…blade_pitch_at_the_stops` | 13 | 21 (5 joints + 3 bridge) | 5 |

A chain study's grid is exactly its chain, so the closed edge is skipped there
too (the existing `[real]` pin "every grid is exactly its chain" caught this
first — the first cut of the closure made `pitch_link_shank_out`'s grid 7 not 6).

## Gotchas

- The first `litSetOfEdges` closure broke the grid on chain studies before the
  `lit.closed` skip existed; `tests.js` ~:9117's guard is what found it.
- `VA.studyLitSet` has a second parameter now; a caller that omits it gets the
  old, unclosed set (closure needs the edge list). Both live callers pass it.
- A worktree's pytest is red on `tests/test_viewer_js_suite.py`,
  `tests/test_annotate_js_suite.py` and the two
  `test_mutation_witness_shadow_concurrency.py` tests regardless of this change
  (no projections; a lock-file EPERM). I ran the node tiers with
  `--repo C:\workspace\tolstack` instead, and junctioned `node_modules` from the
  main checkout for the browser tier (gitignored; removed before handing back).
- Four new guards (2 fast, 2 browser) are enrolled in this change, pins moved
  595/638/671, and the `gridPlan` anchor in the "selecting a study dims…" spec
  was re-pointed (it rotted on the new skip clause).

## Not done / follow-ups

- Glyph disc contrast at both themes was reasoned, not screenshotted.
- Layout/positions, `apps/annotate/` untouched as fenced; `the_dag_is_zoomable…`
  depends on this and can read `lit.closed` if it wants to style bridge edges
  differently.

## Verification record

Run from this worktree (no projections or `node_modules` here), data tiers
pointed at the main checkout with `--repo C:\workspace\tolstack`; `node_modules`
was junctioned in for the browser tier and removed after.

- `venv-win/Scripts/python.exe -m pytest -q`: 1590 passed, 1 skipped, 1 failed
  in 318 s (inside the 10 min budget). The one failure is
  `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`, the
  deliberate worktree red (no projection here).
- `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`: 594/594 (the
  [real] tier ran against the main checkout's projections, built 2026-10-28).
- `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`
  (browser slot): the kinematic suite is 17/17 including the new checks. Two
  whole-tier runs each had 1–3 *different* suites red (the lit-set seam
  leaders pick check; 3D pane hover; crop lightbox launcher; a
  topology hover card; a height-budget refit) — all hover/focus/timing
  checks. Each of those suites, re-run alone, passed 3/3 here and on the
  main checkout (baseline `master`). Treat as load flake, not a pass: the
  reviewer's post-merge full run is the authority.
- `node scripts/run_mutation_witness_tests.mjs --changed-since master --repo C:/workspace/tolstack`:
  23 entries reached, 12 min; the fast pair first ran NOT WITNESSED (the bridge
  lit the fixture's joint anyway, so the closure-off mutation changed nothing) —
  repaired (the fixture test now exercises the closure alone) and re-run
  `--only`: 2/2 WITNESSED. The other 21 were witnessed in the full run.
- Not run: `apps/annotate/run_tests.cjs` (annotate untouched).
