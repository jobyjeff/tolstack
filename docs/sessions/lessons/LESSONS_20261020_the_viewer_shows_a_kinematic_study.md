# LESSONS 2026-10-20 — the_viewer_shows_a_kinematic_study

A kinematic study is a page of the viewer now (`apps/viewer/views/kinematic.js`,
`topology.html?kinematic=<id>`, a **Kinematic studies** section of the nav).
What follows is what the code and the diff do not say.

## Which directory the data mount serves, and where the projection landed

- drawing-checker's `webui/analyses.py`: `viewer_data_dir()` is
  `<tolstack>/data/projections/viewer`, mounted as `DATA_MOUNT`
  (`/tolstack/data`) by `tolstack_mounts()`, which the hosted bake walks too.
  So anything the viewer reads has to sit **under `data/projections/viewer/`**.
- The builder wrote to `data/projections/topology/kinematic/` — outside it.
  It now writes `data/projections/viewer/kinematic/kinematic_studies.json` (and
  its evidence SVG beside it). A subdirectory, not the root, because the
  builder wipes its own `*.svg` on every run and the root is shared.
  `apps/viewer/config.js`'s `kinematicProjection` names the file;
  `tests/test_kinematic.py::test_the_projection_lands_inside_the_directory_the_viewer_is_served_from`
  pairs that line, the builder's constants and the freshness check's input
  list, so the three cannot part. No drawing-checker change was owed.
- The old directory is still in the main checkout's `data/` — a worktree may
  not tidy it (`ISSUE_20261020_the_superseded_kinematic_projection_directory_is_still_in_the_main_checkout.md`).

## Decisions the handoff left open

- **The chart's axes.** x = the sweep's driver (actuator travel, mm), in
  ascending order whatever order the sweep runs in (P2 runs 64.466 → 0 mm, so
  the −7° stop is at the RIGHT). y = **deviation from nominal**, symmetric
  about zero, reaching 1.15× the larger of the widest worst-case edge and the
  limit — so the ±0.5° limit is always on the chart even where the band is
  half of it. Worst case outer band, RSS inner, both in a neutral `--ink`
  tint: `docs/DESIGN_TYPE_AND_COLOUR.md` reserves the accent for selection,
  and the builder's own SVG (accent-filled) predates that reading. Hover is a
  per-point strip covering the whole plot height (nearest point wins), so a
  reader never has to land on a 1-px line.
- **One table per stop, stacked, not tabs.** Two stops × six rows is short;
  stacked, the two rankings read against each other down the page (the
  order changes between stops — `tan_link_mount_height` and `pitch_arm_radius`
  swap), and neither hides behind a control a reader has to discover.
- **Three decimals is decided in Python.** The handoff asked for "three
  decimals as the lesson pins", and `ARCHITECTURE.md` says the browser never
  decides how a number reads. Both hold: the builder carries
  `DISPLAY_DECIMALS = 3` as `display_decimals` in the projection, and
  `VA.kinematicNumber` formats with it, printing verbatim (VA.fmt) when a
  projection carries no such field. The JSON keeps every figure unrounded.
- **The model row reads "Kinematic model"**, under the group label that is
  already the topology's title — the handoff's example ("Pitch linkage —
  kinematic model") would print the topology's name twice in two lines.
- **The preview pane stands down on the kinematic page.** There is nothing to
  preview; a contributor row follows its edge to the rail instead (in place,
  with the edge selected), and its `href` is the same `?topology=…&edge=…`
  link for a reader who opens it in a new tab.
- **The 3D control on a row is gated on the part's MESH, not on a binding.**
  The handoff said "when a binding exists"; the viewer's projections carry no
  binding facts at all (bindings live in the annotator's identity projection),
  so the gate is `VA.partHasMesh` — the same proxy the rail's "attach to 3D"
  uses. The pane handoff's `highlight` command resolves the binding on the
  annotator's side, which is where the fact is.
- **On real data no model row renders.** `vpa_pitch_linkage` is the only
  topology with sweep runs and it has a study, so the handoff's rule ("runs
  but no study") suppresses it. The model row is exercised by the fast tier
  (inline data) only; it appears for real the day a second mechanism publishes
  a sweep before anyone writes its study.

## Found on the way

- **The handoff names the wrong run.** It says the study is "from run
  `vpa-pitch-p2-20261016-235852`"; the study JSON names
  `vpa-pitch-p2-20261015-013931`, and the margins it pins (0.256 / 0.258) are
  that run's. The newer run is the first P2 that carries
  `geometry.features[]`, so re-pointing the study would also turn its feature
  joins from authored into checked
  (`ISSUE_20261020_the_blade_pitch_kinematic_study_folds_the_older_p2_run.md`).
- **A sweep names its topology only since linkage's 2026-10-16 republish**
  (`geometry.features[].topology`). The older runs name none and are left out
  of `models` rather than guessed at from body part ids, which several
  topologies share.
- **The freshness check cannot see the sweep.** The kinematic stamp's source
  directory is `docs/topologies`, so a study edit or an untracked study file is
  caught; a replaced sweep under `data/inbox/linkage-sweeps/` is not — the same
  blind spot `crops.json` has for the datasheet pile, written into
  `projection_freshness.cjs` beside the input list.
- **The deep-link contract test mutates the README's literal count word** —
  it now replaces "seven" with "eight". The next param added edits that test
  too.

## Verification, and why it ran against a scratch data root

The DoD asks for the `[real]` and browser tiers in the main checkout. The main
checkout is on `master`, whose projections were built from `03ed055` — already
stale against this branch before any change here — and rebuilding the shared
`data/projections/viewer/` from a worktree overwrites it for every other
session. So every projection was built **from this branch's committed tree**
into `C:\workspace\tolstack\data\scratch\kinematic_viewer\` (gitignored) —
`data/inbox`, `data/meshes` and the other projection dirs junctioned
read-only to the main checkout's, `docs/` junctioned to this worktree's — and
every tier was pointed at it with `--repo`. The freshness check paired all
four files with the tree. The browser tier also needs `node_modules`, which
exists only in the main checkout: a junction in the worktree (ignored by
`node_modules/` in `.gitignore`, though `git check-ignore` does not report a
junction as matched).

Delete the scratch root after the review; it is not anyone's data.

## What the pane handoff needs from this page

`HANDOFF_20261020_the_3d_pane_opens_in_the_mode_the_study_wants` drives the
annotator from the selection. What this page offers it:

- **Mode and subject:** `state.mode === "kinematic"`, `state.kinematicId`;
  `VA.findKinematicStudy(state.kinematic, id)` gives the study, whose
  `sweep.run_id` is the run to open and `topology` its topology.
- **The launch params to post** go through the one shared pair, never a
  second table: the study page → `{ topologyId: study.topology, sweep:
  study.sweep.run_id }`; the model row → `{ topologyId, sweep:
  model.newest_run_id }` (`onNavKinematicModel` already does this);
  `VA.annotateLink` turns either into `../annotate/index.html?sweep=<run>` and
  `VA.annotateExecCommands` into `[["sweep", <run>]]`. A sweep launch carries
  no topology on purpose — the run names its own (the rail handoff's
  "sweep arrival selects its topology").
- **The contributor rows** are `tr.kmrow[data-edge=<edge id>]` inside
  `section.kmstop[data-stop=<stop id>]`; the topology is the study's. The
  row's 3D control already calls `ctx.onAttach3d({ topologyId, edgeId, part })`
  (= `launchAnnotate`), which is the `goto`/`isolate` pair — the hover
  highlight wants a debounced `mouseenter`/`mouseleave` on the same `tr`.
- **The page hides `#detail` and its divider** in kinematic mode; a pane that
  docks beside the page must not assume the preview pane is there.
- `respine()`'s serialisation now includes `kinematicId`, so a switch between
  two kinematic studies is a real repaint, not a no-op.

## Guards and their witnesses

Every guard added has a mutation spec, except three, and the census pins in
`scripts/guard_enumeration.mjs` are raised to cover them:

- `[real] every contributor names an edge the topology projection declares…`
  and `[real] every topology the kinematic projection names a model for…` are
  **data** guards over two live projections. The only code they call is
  `VA.topologyIndex` / `VA.findTopology`, which the whole page stands on, so a
  mutation would witness the page, not the guard.
- `[real] kinematic study page (skipped: …)` is the browser suite's skip arm —
  a `push(…, true)`, which no mutation can turn red.

Browser checks wait for something WEAKER than what they assert (the rail, not
the selected row; the page or the notice, not the page alone): a guard whose
suite dies on a `waitForSelector` timeout never prints its own name, so its
witness is unattributable.

## Gotchas

- A `<<'EOF'` heredoc passed through the Bash tool turned a Python `"\\"` into
  `"\"` once — write edit scripts to a scratch file and run that instead.
- In a browser harness that boots the page twice (the real-data seam calls
  `VA.bootTopology()` after the page's own boot), the first boot's late
  repaint can detach nodes a Playwright locator holds; screenshot or assert on
  a fresh locator, or use `?mock=1`, which boots once.
- The global `h3` is an uppercase section label (`style.css`); a stop's name
  is a title, so `.kmstop__title` undoes the transform.

## The verification run, as recorded

All against projections built from this branch (`e4d7738`) into the scratch
data root above; the freshness check paired all four files with the tree.

- `node apps/viewer/run_tests.cjs --repo <scratch root>` — **541/541**, no
  tier skipped (the `[real]` tier ran, the five kinematic `[real]` checks
  among it). In the worktree alone: 442/442 plus the documented SKIP.
- `node apps/annotate/run_tests.cjs` — 189/189.
- `node scripts/run_viewer_browser_tests.mjs --repo <scratch root>` — 24/26 on
  the first full run: both `topology` suites failed one check, **"[real] no
  live row is silent"**, because the kinematic nav row had the study row's
  class and no status mark. Fixed (`8180b49`: the row wears the chain
  studies' one mark, through `VA.studyVerdict` over its checks); the two
  topology suites then re-ran 235/235 and 40/40, and the kinematic suite is
  10/10.
- `node scripts/run_mutation_witness_tests.mjs --repo <scratch root>` —
  **208/208 declared mutations witnessed**, 42 minutes. (`venv-win` was
  junctioned into the scratch root for the python witnesses.)
- `venv-win/Scripts/python.exe -m pytest -q` (worktree) — 1 failed, 1502
  passed, 1 skipped, 5:07. The failure is the documented worktree red
  (`tests/test_viewer_js_suite.py`, no projection in the worktree); the skip
  is `test_fit_bound_features.py:422`, a re-extraction not installed. That run
  started before the nav-mark fix; the census, vocabulary, deep-link,
  inventory, type-scale, kinematic, rebuild-rail, title and claims modules
  re-ran on the final tree: 206 passed.
- Not run: `scripts/rebuild_projections.ps1` itself. It refuses from a
  worktree by design, and from the main checkout it would rebuild the shared
  projections out of `master`, which does not have this change. Its step
  order is pinned by `tests/test_rebuild_projections_script.py`.

The junctions are removed again (so deleting the scratch root or this
worktree cannot follow one into the main checkout); the scratch root holds
only the built projections. To re-arm it for a review, junction `data/inbox`,
`data/meshes`, `venv-win` and the other projection dirs back in, and `docs`
to the tree under test.
