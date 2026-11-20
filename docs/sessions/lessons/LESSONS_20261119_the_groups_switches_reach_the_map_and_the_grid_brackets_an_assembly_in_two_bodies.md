# Lessons — the_groups_switches_reach_the_map_and_the_grid_brackets_an_assembly_in_two_bodies (2026-11-20)

Link 3 of the chain from Jeff's note `20261119T142516_ci28ci`. The Groups
popover now has three switches: Bodies, Assemblies and Parts. Each hides its
containers on the map as well as in the grid. The grid can bracket an
assembly whose parts sit in two bodies. **Jeff's fallback shipped**: the
grid's outermost bracket is a body or an assembly, never both.

## Which grid behaviour shipped, and the shots that decided it

Shots are in `shots/the_groups_switches_reach_the_map_and_the_grid_brackets_an_assembly_in_two_bodies/`.
They were taken by `tests/debug_groups_switches_20261119.mjs`, which writes
`probe_log.txt` beside them. The fixture is the race-rows one (below): the
link assembly has rows in ground, the link and the arm, and each bearing has
one row per race.

- `fixture_grid_nested_{3840,1536}.png` show deliverable 3 as written: bodies
  outermost, each assembly cut into one bracket per run inside each body.
  It reads badly in both of the ways the handoff named:
  - **Brackets that suggest other assemblies.** In ground and in the arm, the
    link assembly's run is a dotted bracket with **no name**. The race's
    number already holds that row's label strip, and two labels cannot share
    a 26 px row's 96 px strip. Only the link's run, whose first row is the
    assembly's own dimension, says "200-001".
  - **Noise.** On a race's one row, three caps stack: the link assembly's,
    the bearing's and the race's. Their dotted lines run through the race's
    name and description, and the row carries three folds.
- `fixture_grid_assemblies_{3840,1536}.png` show what shipped, with the
  assemblies outermost. "200-001" is one bracket from inner race A to inner
  race B, named in the strip a body's name uses. Each bearing is a dotted
  bracket round its race, with its fold at its head. The arm, which is in no
  assembly, starts on the same line as the other parts.
- `fixture_grid_bodies_*.png` show the bodies outermost. This is the default,
  and it is the grid as it was before this change.
- `fixture_grid_assemblies_folded_*.png` show bearing A folded: one row,
  named, inside the link assembly.

`VA.gridBraces` still models the nested case. Its fast checks pin that
model: one body bracket per body, the assembly once per run with the same
label, a fold that folds every run, and each kind dropped by its own switch.
Only `VA.gridGroupKinds` keeps the grid from drawing it. If a later design
finds a way to name a run (see the issue below), the nested drawing is one
function away.

**Which of the two wins when both are on** is the one switched on last. It
is stored per model under `tolstack.viewer.gridOuter`, and the bodies win
until the reader switches one on. So the default grid is unchanged, and a
stored choice from before reads as before. The popover shows both ticked
because the map draws both. Jeff's own words were "switching one on switches
the other off there; the map still shows both". I read "there" as "in the
grid", so the switch itself does not untick.

## What a hidden container still leaves on the map

The shots are `v2_map_{all_on,bodies_off,assemblies_off,parts_off,all_off}.png`.

- **Bodies off**: the district's border, field and name are hidden. The pins
  keep their body's colour, so ground's pins are still blue.
- **Assemblies off**: every assembly's outline is hidden, both the one round
  an assembly's own box (`rect.map__assembly`) and a box-less assembly's
  outline and name (`g.map__outlinegroup`).
- **Parts off**: every box and part name is hidden. A part's **jumpers**
  (its dimensions) stay drawn as lines between that part's pins. With all
  three off, the map is pins, routes, symbols and those jumpers. That is the
  handoff's "pins, symbols and routes do not move", and the jumpers are
  routes too.
- The probe measured every pin's place to the pixel, with each switch off
  and with all three off. Every pin stayed put and the drawn counts held: the
  layout is always the whole model, and hiding is a `visibility: hidden` on
  the layer. ~~A hidden district's field no longer takes a click, so a press
  there pans and selects no body.~~ **Wrong as first shipped** (corrected in
  round 2, below): `visibility: hidden` hides the ink but not the hits,
  because SVG's `all`, `fill` and `stroke` pointer values ignore visibility.
  A hidden box still lit and selected its part, and a hidden district still
  selected its body. The hidden layers now also take `pointer-events: none`.

## What link 4 will trip on

- **Folding an assembly in two bodies, with the bodies outermost.** The one
  folded row sits in the body of the assembly's first row, so the other
  bodies' brackets lose those rows. A **sub-assembly whose run starts on a
  part's row** (every bearing, because a race starts it) has its name only on
  its fold's hover. Both are filed, with options, in
  `docs/issues/ISSUE_20261120_a_folded_assembly_in_two_bodies_sits_in_one_bodys_bracket_and_a_sub_assemblys_name_is_on_hover_only.md`.
- An assembly in no body gets **no ink** on its grid bracket: `tint` is null,
  so it falls back to the neutral part colour. One in one body wears that
  body's ink. `VA.bodyTint` returns 0 for an unknown body, which would have
  painted every two-body assembly in the first body's colour.
- A real assembly with its **own dimension** (an assembly-level centre to
  centre) puts that row inside its bracket and gives it no part bracket of
  its own. With the assemblies outermost, its PART cell is blank, because
  the strip on the left says the number. Look at this on v2 once link 4
  lands.

## Decisions the handoff left open

- **A second fixture rather than an edited one.** Adding the four race
  dimensions to `topology_assembly_in_two_bodies.json` broke two of link 2's
  `test_topology.py` checks, which index its edges by position and add a race
  dimension of their own. The new file,
  `tests/fixtures/topology_assembly_in_two_bodies_rows.json`, is that model
  plus one dimension per race. Its whole projection rides in
  `apps/viewer/tests.js` between `// BEGIN raceRowsProjection` and its END
  marker. `tests/test_topology_map.py` holds it equal to `project_topology`.
  To regenerate it, re-run the builder call that test makes. (The first
  helper name I chose, `twoBodyProjection`, already existed in `tests.js`.
  Function hoisting let the later definition win, and two unrelated scene
  checks went red with "undefined is not valid JSON".)
- **An assembly bracket is its own kind**, `assembly`, added to
  `VA.GRID_BRACE_KINDS`. It is dotted, with an italic name, like the map's
  outline. It lights and selects as the part does. With Assemblies off, an
  assembly's own rows get a part bracket with its fold, as before.
- **The fast DOM shim** has no compound selectors and no `getAttribute
  ("class")` on HTML elements. Use one class plus `className`.

## The test record

Everything ran from this worktree. The `[real]` tiers ran against a scratch
root, `data/scratch/grp` in the main checkout. It held copies of inbox,
meshes and projections, and all eight builders were run from this tree into
it with `--data-root` (635 s). The tree's `docs/` was copied in too. The
shared `data/` was never written, and the scratch root was removed
afterwards.

- **Default tier**, `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q`
  on `40142801`: **2385 passed, 3 failed, 1 skipped** in 536 s. The ledger row
  is recorded and inside budget. The three failures:
  - `test_viewer_js_suite_is_green`: the worktree has no `data/`. The tier
    below was run instead.
  - `test_every_established_export_lists_exactly_the_runs_the_log_records_for_its_sha`:
    pre-existing, already filed as
    `ISSUE_20261119_the_gas_spring_mount_export_has_a_sixth_run_the_pitch_linkage_topology_does_not_list.md`.
  - `test_every_anchor_resolves_to_exactly_one_place`: two older specs were
    anchored on lines this change rewrote. Both are re-anchored and
    witnessed (below). `tests/test_mutation_witnesses.py` is now
    **49 passed**. I did not re-run the whole tier after that fix.
- **Viewer fast tier with `[real]`**, `node apps/viewer/run_tests.cjs --repo <scratch root>`:
  **617/617**, with the projection paired to this tree.
- **Annotate fast tier**, `node apps/annotate/run_tests.cjs`: **334/334**.
- **Browser**, `--repo <scratch root>`, one `--only` per suite:
  - `the Groups switches` (new): **9/9**, 26 s.
  - `the DAG zoom, Fit and the grid header`: **35/35**, after its Groups
    check was updated to count three switches.
  - `the map (the counts on both models`: **32/32**.
- **Witness**: 17 specs in four runs. That is the 12 new ones, the 3
  re-anchored ones and the 2 whose guards changed.
  - The first run (all 15 then owed) hit the default cap after the four fast
    specs, at about 5 min each, with all four witnessed.
  - The second (the 11 left, `--budget-min 90`) witnessed 9. Two were not:
    - The fold-suppression mutation is invisible on the fixture, because the
      link assembly's own row is said by its bracket.
    - The "layout with no bodies" mutation moved no pin, because an authored
      layout places parts the same with or without bodies; another check
      went red instead.
  - Both were re-pointed (the outermost name's wide strip; a refit to the
    boxes' extent) and are **2/2 witnessed**.
  - Two more rotted anchors turned up in the default tier, as above: the
    grid's kinds line and the bracket inset. Both re-anchored, **2/2
    witnessed**.
- Two browser guards carry no spec, and the browser pin was raised by 10
  with a note. They are the suite's `(skipped: ...)` push and "nothing
  threw on the Groups page".

## Found on arrival

Nothing: the worktree was clean, at the integration tip.

## Round 2 (2026-11-20): a hidden container no longer takes the pointer

The review (`REVIEW_20261120_…`, REQUEST CHANGES) found that a switched-off
container still hovered, lit and selected. The map's hits take the pointer
with `all`, `fill` or `stroke`, and SVG honours those whatever the
visibility. Every check read `getComputedStyle(e).visibility`, which only
says "not drawn", not "not there".

- **Fix**: `apps/viewer/map.css` adds `pointer-events: none` to every
  descendant of a hidden layer, under the same four `tv__map--no-<kind>`
  selectors.
- **Two checks, real pointer**, in `the Groups switches`:
  - On v2, the pointer goes to a place the hub's box hit or ground's district
    field owned with all on. Then the kind is switched off, and the pointer
    is moved there and clicked. Nothing of the hidden layer is under it, and
    the hidden entity neither lights nor selects.
  - With Parts off, a click inside the hub's box lands on ground's district,
    which is drawn, so it selects the body, and a selected body marks its
    parts selected. The check allows that: the selection is a body or
    nothing, never the part alone.
  - On the fixture, with Assemblies off, the hit test at a place an outline's
    hit owned finds nothing of the outline. v2 has no outline group to try.
- **For the next probe:** a district field carries no `data-map-id`. Its body's id is on the `map__districthit`
  beside it.

### The round-2 test record

The browser runs used the main checkout's data (`--repo C:/workspace/tolstack`),
whose topology projection is built from integration. This branch changes no
topology input.

- **Browser**, `--only "the Groups switches"`: **11/11**. Before the check was
  corrected it was 10/11 on the fix, because the part's click selected its
  body.
- **Browser**, `--only "the map (the counts on both models"`: **32/32**.
- **Witness**, two `--only`: **2/2 witnessed** in 2 m 29 s.
  - The pointer check's mutation keeps only the assemblies' rule.
  - The outline check's mutation drops the assemblies' rule.
- **Default tier**: **2385 passed, 3 failed, 1 skipped** in 478 s. The three:
  - `test_viewer_js_suite_is_green`: the worktree has no `data/`.
  - The already-filed export-run failure.
  - `test_the_issue_each_mutation_cites_is_in_the_tree`: the two new specs
    cited the review report, which is not on this branch. They now cite this
    lesson, and `tests/test_mutation_witnesses.py` is **49 passed**.
- **Fast tiers**:
  - Viewer: **517/518**. Its `[real]` tier refused the main checkout's
    projection, which was built from integration. Round 2 changes no file
    that tier loads (only `map.css`, the browser runner, specs, the pin and
    this lesson). So round 1's `[real]` 617/617 at `5e4ca59f`, which the
    review reproduced, still stands for it.
  - Annotate: **334/334**.
- Guard pin: browser `800 / 771`, +2, each with a spec.
