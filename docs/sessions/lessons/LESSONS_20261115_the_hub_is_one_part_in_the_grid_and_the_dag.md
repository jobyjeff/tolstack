# LESSONS 2026-11-15 — the_hub_is_one_part_in_the_grid_and_the_dag

## The bisect: no code commit split the hub; the v2 data did, on 11-08

- I rendered v2 headlessly (`topology.js` + `model.js` in a node vm, the page's
  own pipeline: `gatherParts` → `collapseBodies` → `spineRight` →
  `blockLayout` → `gridPlan`). Every run used the same projection: the main
  checkout's `data/projections/viewer/topologies.json`, built 2026-11-15 17:18.
- **`1fedd8df` (trunk before the merge) and `f43d02ae` both split the hub**,
  with grid groups at plan rows 0+1 and 10+2. So does every commit touching
  `apps/viewer/topology.js` back to `e4ee54e8` (11-06), where `gatherParts`
  was born. Commits before that cannot render a block layout at all.
- The fixed-layout handoff's own 11-14 shot, taken before
  `a_part_may_contain_parts` landed, already shows the split
  (`shots/the_page_is_a_fixed_layout_and_nothing_scrolls_the_document/3840x2160_vpa_end_stop_v2_both.png`:
  two `214373-002` brackets and a `214371…` field at the foot of `ground`).
  The 11-12 chain is not the origin, contrary to the issue's guess.
- **The cause is in the data's shape.** The hub's two dimensions to the
  tangential-link mount (`hub_spindle_to_tan_link_mount_face`,
  `hub_boss_to_tan_link_mount_fasteners`) end on contact faces that are on
  both parts. `VA.partPins` gives those faces to the mount, which has more
  faces. So the two edges are no chords of the hub block, and the old
  `gatherParts` (pins and chords only) left them where the depth-first walk
  closes them, at the foot of `ground`. They have been in v2 since
  `5694df28` / `a8003c79` (2026-11-08), which matches Jeff's 11-09 note.
  His 11-12 "look correct now" cannot have been about this hub, since the
  hub was split on what trunk served that day too.

## The rule `gatherParts` now follows (`gatheredOrder`, `apps/viewer/topology.js`)

**A part's rows are one run.**
- A block's pins and chords move up to where the walk first reaches the
  part, as before.
- Its other edges (`edge.part`, read as the top-level part) follow them.
- A part that is no block gathers its edges the same way.
- An edge moves only to where one of its nodes is already above it, because
  `VA.layWalk` has nothing to draw it down from otherwise. A part with an
  edge that cannot move up yet is **held back, whole**, and laid as soon as
  every one of its edges can. Holding back moves an edge *down*, which is
  always legal.
- Node rows that are no block's pin keep the walk's order.
- `docs/DAG_TOPOLOGY.md`, "One part, one run", says the same.

Not reached, by design: "On the rails" (`partDrawing: "rails"`) draws the
builder's walk untouched, and a kinematic page's band keeps its stack order
(`ISSUE_20261106_a_part_the_kinematic_stack_visits_twice_is_two_blocks`).

## What it changed, per model (the main checkout's projection, no study)

| model | drawn twice before | after | crossings (`layoutCrossings` of the gathered walk) |
|---|---|---|---|
| `vpa_end_stop_v2` | hub `214373-002` (grid 2 brackets, DAG block + stray field) | none | 27 → 24 |
| `vpa_pitch_linkage` (v1) | `pitch_arm`, `blade_root`, `piston_head_lower_214699_002` (each 2 grid brackets / DAG fields) | none | 120 → 121 |

v1's `piston_head_lower` is the held-back case. Its face-flatness edge comes
before the gas-spring piston block, and its thickness edge hangs from that
block's pin. So both now land together, after the block.

## Shots (3840×2160, served by the walk driver with `--tree` pointing at each tree)

`docs/sessions/lessons/shots/the_hub_is_one_part_in_the_grid_and_the_dag/`
- `before_v2_3840_landing.png`, `before_v2_3840_hover_hub.png` (`f43d02ae`):
  the grid shows two hub brackets, and the DAG shows the hub block plus a
  truncated `214371…` field at the foot of `ground`.
- `after_v2_3840_landing.png`, `after_v2_3840_hover_hub.png`: the grid shows
  one hub bracket of three rows, and the DAG shows one `214373-002` block,
  with nothing at the foot.
- `after_v2_dag_hub_crop.png`: a close crop of the hub block.
  `after_v2_hover_moved_hub_row.png`: hovering a moved hub dimension lights
  its bar right under the block.
- `after_v1_3840_landing.png`: v1 renders with no page errors. The only
  console line was a 502 from the proxy to 8000, which was the same before
  the fix.

## Guards

Two fast cases in `apps/viewer/tests.js`, both red on the old code (checked
by swapping `topology.js` back):
- "a block part whose other edges end on another block's pins is one run …"
  is the hub's shape.
- "a part whose second edge cannot move up yet is held back …" is the
  held-back case.

Each has a spec, and both specs were WITNESSED. The fast pin went
699 → 701. Two existing specs anchored on the replaced line
(`byPart[p].forEach…`) were re-pointed at `var order = gatheredOrder(...)`:
- fast "a part the walk visits twice …": WITNESSED;
- browser "[real] the whole walk, as blocks …": WITNESSED, 3m29s.

## Test record

All runs below were from the worktree, borrowing the main checkout's data
with `--repo`.
- `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`: 701/701,
  `[real]` included.
- `node apps/annotate/run_tests.cjs --repo C:/workspace/tolstack`: 316/316.
- `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack --only "parts as blocks"`:
  8/8 sub-checks, 52 s. I added no suite, but this one reads the gathered walk.
- Witness `--only` for the four specs above: 4/4 WITNESSED.
- `PYTHONIOENCODING=utf-8 C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q`:
  **1 failed, 1986 passed, 1 skipped, 2 deselected, 509 s**. Recorded with
  `suite-time record`: inside budget.
  - The failure is the expected worktree red,
    `test_viewer_js_suite_is_green` (no projection in the worktree). The
    same tier ran 701/701 against the main checkout above.
  - The skip is `test_fit_bound_features.py:433`: the pitch-link bearing
    re-extraction is not installed.
  - `xdist` is not installed in the venv, so `-n 16` was not available.
- Off the record: `test_browser_runner.py::test_a_runner_that_ends_leaves_no_chrome[throw-True]`
  passed in the full run but failed twice in a smaller rerun. Filed as
  `docs/issues/ISSUE_20261115_the_kill_witness_throw_case_reddens_again_after_its_fix.md`
  (its predecessor is `resolved`).

## Notes for the next agent

- A headless probe of what the page draws is ~40 lines: load
  `reader_facing_bans, vocab.gen, config, viewer, topology, model` into a vm
  with `window = sandbox`, then call the pipeline above. It is quicker than a
  browser for "is part X one run", and it runs against any commit's
  `git archive … apps/viewer`.
- The walk driver (`tests/debug_walk_merged_page_20261114.mjs`) serves the
  viewer from its own tree. To shoot an old commit, copy it into scratch,
  import `browser_runner.mjs` by `file:///` URL, and set `HERE` from a flag.
  Its `--root C:/workspace/tolstack` is safe as long as you bind nothing.
