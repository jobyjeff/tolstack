# LESSONS 2026-11-22 — the_viewer_node_suite_runs_inside_its_default_tier_timeout

## The cause: one commit, one function, re-paid on every repaint

`6f093680` ("the map gives a feature a pin toward each partner, and no two
routes share a run", 2026-11-19) made `VA.mapLayout` (apps/viewer/map.js) a
search: a repair loop of up to 12 whole re-layouts, then a pass that routes
what is left through the grid's corners (`viaCorners`, up to 2000 candidate
routes per connector, each checked against every route already drawn with
`sharedRun`). v1's computed map (`vpa_pitch_linkage`, no authored layout)
cannot be drawn clean, so it spends the whole budget every time.

`VA.mapLayout` on the live projection, current data, measured in isolation:

| map.js at | v1 (`vpa_pitch_linkage`) | v2 (`vpa_end_stop_v2`) |
|---|---:|---:|
| `282807c3` (trunk before the merge) | 6 ms | 19 ms |
| `6f093680` | 440 ms | 78 ms |
| `5c53b7d6` .. `86aa2f33` (later map commits) | 560–650 ms | 23–83 ms |

The budget was deliberate (`VA.MAP.budget`'s comment: "costs a bounded
time") — the cost was not one layout but how many: `VA.renderTopoMap` called
`VA.mapLayout` on **every** `renderTopoPane`, and the four slow [real] checks
render the pane once per study (23 on v1). The CPU profile of the 278-s-class
run: 360 of 405 s under `VA.mapLayout`, 281 s of it in `viaCorners`. The other
suspects the issue named (`8def348c`, `968e743a`/`1c9262fa`, `9c02f5cf`) do not
show in the profile.

A second, smaller cost: `VA.gatherParts` (apps/viewer/topology.js, ~0.3 s on
v1, ~0.6 s on v2, unchanged code since before the range) kept ONE memo slot,
so every check that walks both models re-gathered both each time.

## The page paid it too

The browser tier's whole-run ledger rows (`suite_times.jsonl`) show the same
step, between `89ad5d4e` (2026-11-20T05:12Z) and `6a3b983b` (11:13Z) —
`6f093680` was committed 06:32Z:

| suite | before | after |
|---|---:|---:|
| topology http | 143.5 s | 258.3 s |
| topology file:// | 124.2 s | 218.2 s |
| whole browser tier | 1854 s | 2366 s |

A reader paid ~0.6 s (v1) on every study pick, Groups or Unused toggle. So the
fix is in the product, not the checks.

## The fix

- `VA.mapLayout` remembers its result by the **content** of its inputs
  (`JSON.stringify([model, doc.places, M])`, ~1 ms on the live models; 16
  entries). Content, not identity: the map tests edit fixture models in place
  and lay them out again. The returned geometry is shared and nothing writes
  to it (grepped: only `layOut` itself deletes its two private fields, before
  it is stored).
- `VA.gatherParts`' memo is a `WeakMap` keyed by the projection object, so
  each model keeps its gathered walk while another is drawn.
- New fast guard, "a repaint does not lay out again: …", with a two-mutation
  spec (one per memo); both `WITNESSED`. Fast pin 623 → 624.
- Deliverable 3: `run_tests.cjs` prints `wall time: N s, cpu N s; slowest
  checks:` and the eight slowest, before the total line. Each result carries
  `ms` (tests.js `test()`). CPU time is printed because this box's wall clock
  is mostly other sessions' load: the same tree measured 46 s and 17.5 s wall
  an hour apart.

## Timings, armed (`node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`, from this worktree; projection paired @ c3928f9a)

Before: 623/623, **326 s** wall (issue: 278 s on a quieter box). After:
**623/623 in 17.5 s wall / 18.2 s cpu**, and after the new guard **624/624 in 15.7 s / 15.4 s cpu** (pre-merge trunk was 19 s).

| check | before (issue's table) | after |
|---|---:|---:|
| every mark … resolves to a record | 64.4 s | 2.10 s |
| every study's grid is exactly its chain | 62.4 s | 1.77 s |
| no rendered surface … prints an internal id | 55.9 s | 2.80 s |
| every study's totals reach the page | 53.8 s | 1.51 s |
| every element cell prints its edge's name whole | 7.1 s | < 0.2 s (not in top 8) |
| every merged component cell … NAME | 6.3 s | 0.40 s |
| every linkage row prints a measured nominal | 4.7 s | 1.14 s |

No timeout raise is warranted: 17.5 s against 180 s.

## Gotchas

- The old tree cannot be timed armed against today's projection: the pairing
  refuses it, and a `git archive` export is not a git dir so it cannot be asked
  at all. Bisecting a single pure function in a scratch vm context
  (vocab.gen/config/viewer/topology/model/map.js, `git show <sha>:` each) was
  minutes, not a projection rebuild per commit.
- To run the named pytest files armed from a worktree I junctioned
  `data/projections/viewer` and `node_modules` to the main checkout's and
  removed both after. Read-only use.

## Browser tier after the fix (`--only`, `--repo C:/workspace/tolstack`, box shared)

All green: topology http 152/152 in 175.7 s (258 s before the fix, 143 s
before `6f093680`); topology file:// 106/106 in 163.9 s (218 / 124); the map
32/32 in 174.9 s (123 / 93); the Groups switches 11/11 in 44.2 s (50 / —).
The browser page memoises within one page load only, and most checks load a
fresh page, so each still pays one layout: the browser gain is smaller than
the node tier's, and the map suite's 175 s is box load or that first layout,
not separable from one run. The first layout of v1 (~0.6 s) is still paid on
every page load — filed as
`docs/issues/ISSUE_20261122_v1s_computed_map_spends_its_whole_layout_budget_on_every_page_load.md`.

## Test record

- `node apps/viewer/run_tests.cjs` armed (projection junctioned): 624/624, 15.7 s.
- `node apps/annotate/run_tests.cjs`: 333/333.
- Witness `--only` the new guard: 2/2 witnessed.
- `pytest -q tests/test_viewer_js_suite.py tests/test_mutation_witnesses.py
  tests/test_mutation_witness_shadow_concurrency.py`, armed from the worktree:
  53 passed, 1 failed — `test_two_different_repo_roots_both_still_succeed`
  on MAX_PATH copying lesson shots from this long worktree path
  (`ISSUE_20261104_a_lesson_screenshot_name_overflows_max_path_in_the_shadow_concurrency_test.md`,
  already filed); the three timeouts the issue named passed.
- Full default tier, worktree, viewer tier armed: 1 failed, 2586 passed,
  1 skipped in 500 s. The failure is the known export-runs red
  (`ISSUE_20261119_the_gas_spring_mount_export_has_a_sixth_run_the_pitch_linkage_topology_does_not_list.md`).
