---
type: review
handoff: docs/sessions/active/HANDOFF_20261119_the_groups_switches_reach_the_map_and_the_grid_brackets_an_assembly_in_two_bodies.md
reviewer: agent
date: 2026-11-20
verdict: REQUEST CHANGES
blockers: 1
---

# Review — the_groups_switches_reach_the_map_and_the_grid_brackets_an_assembly_in_two_bodies

Branch `handoff/…` at `5e4ca59f`, cut from `integration` at `6a3b983b`. This
is a fast-forward on `review/…`. It is the first review of this slug; no
earlier attempt is on the branch. **Not merged into `integration`**: the
verdict is REQUEST CHANGES.

## What the work does, and what was verified

- **Three switches** (`VA.GROUP_KINDS`: bodies, assemblies, parts). The
  popover counts "n of 3". A stored value from before this change reads
  Assemblies on, because the store keeps the kinds switched off. This is
  pinned fast and `[real]`, and I re-read `VA.readGroupKinds`.
- **The map** hides a kind with `tv__map--no-<kind>` on the svg, which sets
  `visibility: hidden` on its layers (`apps/viewer/map.css`). Pins, the
  counts and the DOM are unchanged: the fast check compares `innerHTML`, and
  the browser checks every pin to the pixel. **What visibility does not stop
  is the pointer — the blocker below.**
- **The grid** shipped Jeff's fallback: the outermost bracket is a body or
  an assembly, whichever was switched on last (`VA.gridGroupKinds`,
  `VA.GRID_OUTER_KEY`). Bodies is the default, so the default grid is
  unchanged. `VA.gridBraces` still models the nested case, and the fast tier
  pins it. I read the shots `fixture_grid_nested_*` against
  `fixture_grid_assemblies_*`. The nested drawing does read badly in the two
  ways the handoff named: unnamed dotted runs in ground and the arm, and three
  caps stacked on a race row. The choice is justified by the shots.
- **No words added** beyond the three labels. A fold's title names its
  assembly only where its bracket draws no name. That is a hover string,
  not page text.
- **Fence**: `git diff integration -- docs/topologies tolerance_stack
  apps/annotate apps/viewer/map.js` is empty.
- **Fixture** in `tests/fixtures/`, held equal to `project_topology` by
  `test_the_fast_tiers_two_body_projection_is_the_builders_own`.
- **Witness enrolment**: there are 12 new specs (4 fast, 8 browser) and 3
  re-anchored ones. The browser pin was raised by 10, and two of those
  guards carry no spec: the suite's skip push, and "nothing threw". That
  claim is reasonable for both, and the guard-set comment states it.
  `git grep` for the changed constants (`GROUP_KINDS`, the grid kinds line)
  over `scripts/mutation_witnesses/` finds no stale `find`.
- **The lesson's arithmetic**: the 12 new specs plus 3 re-anchored plus 2
  re-run make 17, and the ledger rows (536 s default, the `--only` browser
  and witness rows) match the test record. I found no duplicate function
  declarations left in `tests.js` after the hoisting collision the lesson
  describes.

Mandatory stack checks 1–7: **not applicable**. The diff carries no stack,
topology value, band or citation. The traced ratio is unchanged:
**5 traced / 12 inferred / 9 untraced, out of 26** seeded element instances;
30 / 16 / 15 of 61 across all stacks (`debug_report_tolerance_stacks.py --ratio`).

## Findings

### Blocker 1 — a hidden container still takes the pointer: it hovers, lights, shows its title and selects

`apps/viewer/map.css`: the map's hit targets declare
`.map__boxhit { pointer-events: all }`,
`.map__districtfield { pointer-events: fill }`, and
`.map__districthit, .map__outlinehit { pointer-events: stroke }`. Those SVG
values apply **whatever the visibility**; only `visiblePainted`,
`visibleFill`, `visibleStroke` and `visible` respect `visibility: hidden`. So
switching a kind off hides the ink and leaves the control.

Measured on v2 on the merged tree. The page served this worktree's `apps/`
over the scratch root's data, with a real `mouse.move`/`down`/`up`
(probe `hidden_hits.mjs`; it and its shots are committed under the lesson's
shots folder, `review/`):

- **Parts off**, at a point inside the hub's box: `elementFromPoint` is
  `map__boxhit … vis=hidden`, titled "214373-002 propeller hub". The hover
  lit 8 elements: the hub in the tree, its grid rows and the map. The click
  selected the part (3 grid rows). A reader sees empty space light the hub.
- **Bodies off**, at a point inside ground's district (no box there):
  `elementFromPoint` is `map__districtfield … vis=hidden`, and one click
  selected the body (22 grid rows). The lesson says the opposite: "A hidden
  district's field no longer takes a click, so a press there pans and selects
  no body". That sentence is wrong as shipped.
- Assemblies off was not reachable on v2: its three assemblies are
  `rect.map__assembly` (`pointer-events: none`), and v2 has no outline
  groups. `.map__outlinehit` has the same `stroke` value, so the two-body
  fixture's outlines will behave like the boxes.

No tier saw it, because every check reads `getComputedStyle(e).visibility`.
That is a proxy for "not drawn"; it says nothing about "not there".

**Fix (for the author):** under each `tv__map--no-<kind>`, also set
`pointer-events: none` on the hidden layer's descendants. Then add a browser
check that moves a real pointer to a point a hidden box, field and outline
owns (not a jumper or pin), and asserts nothing lights or selects. Witness
it, and correct the lesson's sentence. It is a few CSS lines, but it needs a
real-pointer check to be trusted, so it fails prong 2 of the inline-fix
boundary and is not mine to make.

### Design (filed, non-blocking)

- The popover shows Bodies and Assemblies both ticked while the grid draws
  only one. Which one is a stored state the reader cannot see, and ticking
  an already-ticked switch is impossible, so it takes an off-and-on to bring
  the assemblies into the grid. Filed as
  `docs/issues/ISSUE_20261120_design_groups_popover_shows_bodies_and_assemblies_ticked_while_the_grid_draws_one.md`
  (low, `audience: strategy`, options and a recommendation inside).

### Already filed by the author (checked, not re-filed)

- A folded two-body assembly sits in one body's bracket, and a
  sub-assembly's name is on hover only:
  `ISSUE_20261120_a_folded_assembly_in_two_bodies_…_on_hover_only.md`.

## Tests

The tactical record (default tier 2385 passed / 3 failed / 1 skipped on
`40142801`, the fast tiers, three browser `--only` runs and 17 witness specs)
is consistent with the diff, so it was given the benefit of the doubt.

- **Pre-merge risky subset** (viewer + map + guard + prose rows):
  `pytest -q tests/test_topology_map.py tests/test_topology_projection.py
  tests/test_mutation_witnesses.py tests/test_app_type_scale.py
  tests/test_viewer_readme_doc_facts.py tests/test_js_python_vocabulary.py
  tests/test_js_vocabulary_is_generated.py tests/test_viewer_deep_link_contract.py
  tests/test_tolerance_stack.py tests/test_claims_registry.py
  tests/test_provenance.py tests/test_architecture_inventory.py` → **449
  passed** (176 s). The merge was a fast-forward, so this ran on the merged
  tree.
- **Scratch root** `data/scratch/rv_groups_1120`: inbox, meshes and the
  non-viewer projections copied, the tree's `docs/` copied, and all eight
  builders run from this worktree with `--data-root` (622 s). Every
  projection is paired at `5e4ca59f` or `bae3e64f`.
- **Default tier, post-merge**, `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q`
  in the review worktree: **2386 passed, 2 failed, 1 skipped** (483 s,
  ledger row recorded, inside budget). The two failures:
  `test_viewer_js_suite_is_green` (the worktree has no `data/`; the tier
  below ran instead) and
  `test_every_established_export_lists_exactly_the_runs_the_log_records_for_its_sha`
  (already filed, as
  `ISSUE_20261119_the_gas_spring_mount_export_has_a_sixth_run_…`). The
  author's third red, the rotted anchors, is green. This suite's conftest
  prints no `concurrent pytest processes` / `full-suite lock` header lines.
- **Viewer fast tier with `[real]`**, `node apps/viewer/run_tests.cjs --repo <scratch root>`:
  **617/617**, projection paired.
- **Annotate fast tier**: **334/334**.
- **Browser, whole tier**, `node scripts/run_viewer_browser_tests.mjs --repo <scratch root>`
  at `bae3e64f` (tree `f3db140c`): **48 of 49 suites green**, 2365 s. One
  red: `3D pane follows the selection`, 30/31, on "[real] resting on a body
  row in the nav lights that body in the scene". Run alone with `--only` on
  the same tree and root it is **31/31**. It belongs to the class of the
  deferred `ISSUE_20261105_a_nav_scene_row_rebuilt_under_a_resting_pointer_drops_the_scenes_hover_light.md`,
  and the diff touches no scene code. The new suite `the Groups switches`
  is 9/9 in 28.5 s, and `the map` and `the DAG zoom` are green. The tier is
  **over the 30-minute merge budget by 9 m 25 s**; my two probes ran during
  part of it. The runner recorded the row, and the measurement is appended
  to the open
  `ISSUE_20261106_the_viewer_browser_tier_ran_51_minutes_against_the_merge_budget.md`.
- **Witness gate**, `node scripts/run_mutation_witness_tests.mjs --repo <scratch root> --changed-since 6a3b983b --budget-min 10`:
  selected 42 entries, reached 1, **1/1 witnessed**, and 41 were left to the
  sweep (budget). Exit 0, a pass by the gate's rule. All of the branch's own
  12 browser specs fell to the budget, so the author's `--only` ledger rows
  (13:00–14:00Z, the 17 specs, the tactical record) are what witnesses them.

The probe and its four shots are committed at
`docs/sessions/lessons/shots/the_groups_switches_reach_the_map_and_the_grid_brackets_an_assembly_in_two_bodies/review/`
(`hidden_hits.mjs`; `parts_off_hover.png` shows the hub lit on every surface
by a pointer over empty space).

## Reviewer housekeeping

- Overlay: a new **Recurring bugs** entry, "SVG hidden by
  `visibility: hidden` can still take the pointer".
- Filed: the design issue above. Appended: the browser-tier budget
  measurement.
- The scratch root `data/scratch/rv_groups_1120` (and its logs) was removed
  after the run. Round 2 needs a fresh build from its own tree anyway.

## For the rework

Keep everything else. The grid's fallback, the docs and the fixture are
sound. Round 2 needs: the `pointer-events` fix, a real-pointer browser check
with its witness spec, the lesson's "no longer takes a click" sentence
corrected, and an `--only` run of `the Groups switches` and
`the map (the counts on both models`.
