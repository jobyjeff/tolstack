# LESSONS 2026-11-17 — the_walk_reads_the_portrait_map_and_the_joints_on_the_merged_page

The review page is `REVIEW_20261117_the_portrait_map_and_the_joints.md`:
**28 counted rows, 9 does it, 16 partly, 3 does not.** Three of Jeff's
sentences are answered elsewhere (K1 by the next handoff, K3 by the page's
opening, K4 by the product-structure page) and are not counted. Two inventories
sit beside the counted rows: 16 joints (28 constraints, 28 symbols drawn, 12 of
56 feature ends bound) and 5 solver joints (the model's word matches the
solver's at all 6 contacts).

- **Shots:** `shots/the_walk_reads_the_portrait_map_and_the_joints_on_the_merged_page/`
  (44 PNGs, every one cited on the page read with vision).
- **Issues:** one new,
  `ISSUE_20261117_small_findings_of_the_portrait_map_and_joints_walk` (low,
  F1–F3). One addendum, on
  `ISSUE_20261117_the_blade_and_piston_joints_leave_questions_for_jeff`, saying
  its two questions now sit on the review page as Q1/Q2.

## How the merged tree was served

- **Walked tree: `integration` = this branch's base, `b9475a88`.** It carries
  all four baseline handoffs. `master` (`38a0693b`) carries none of their code
  (no `placeName` in `map.js`, no `revolute`), and is 52 commits behind. 8000
  serves the main checkout on `master`. Its `map.js` is master's (CRLF on disk,
  so the bytes hash differently from `git show`), and it draws hub ↔ blade as a
  seat. That seat is the "flange joint" Jeff saw. Shot `r_21` is 8000 itself,
  opened read-only from the driver's page.
- **Scratch root:** `C:/workspace/tolstack/data/scratch/walk1117`. `cp -r` of the
  main checkout's `data/inbox`, `data/meshes` and `data/projections` (397 MB).
  Then the eight builders ran from this worktree with
  `--data-root …/walk1117/data --allow-older-tree`, crops with drawing-checker's
  venv. The log of the run is `walk1117/build.log`. All exited 0, and the
  kinematic step took ~6 min, as before.
- **Driver:** `node tests/debug_walk_merged_page_20261114.mjs --root <scratch>
  --port 8873 --shots <shots dir>`, unchanged. A Python client posts one op per
  call. `playwright-core` resolves from the main checkout on its own
  (`loadPlaywright` tries both roots), so no `node_modules` junction was needed.

## The feature-identity log

**Jeff's real log (`data/inbox/feature-identity/`): 83 events before and 83
after** (84 files with the README). The sorted listing's sha256 was `4471ab5a…`
both times. This walk wrote nothing anywhere, not even to the scratch copy (83
there too). The "bound ends" column is a fold of that copy, which is
byte-identical to the real log.

## What the next walk should know

- **Pass `-X utf8` to the client.** A `▾` in the page text crashes a cp1252
  stdout. Keep JS probes in files (`js:<file>` ops). Quoting JS inside JSON
  inside bash is where the time goes.
- **The view controls:** `localStorage tolstack.viewer.paneView` is `both` or
  `dag`, and the pane opens with `#pane-handle`. Once opened, the flyout reopens
  itself on reload, so a region run's "open the pane" step reads "already open"
  from the second load on. The collapse button is `#assemblies-collapse` (an
  id, not a class).
- **The 3D pane is blank for ~10 s after it opens.** The meshes stream in. A
  shot taken at 5 s shows an empty pane.
- **`AnnotateApp.exec(["isolate", sha])` then `["camera","face",sha,id]`
  returns success and changes nothing visible** without an armed pick. To frame
  a face, arm a pick first (`tests/debug_blade_piston_joints_20261117.mjs`,
  `frameFace`). Even then the heads hide the piston body's top, which is why Q2
  has no shot that shows its pockets.
- **A hover lights only the one constraint under the pointer**, not the joint's
  bundle. One `eval` of `[class*=--lead|--hot|--selected]` gives the lit set,
  which is how the joint table was checked.
- **The viewer's armed `[real]` tier needs a `docs` junction in the scratch
  root.** Without it, five worksheet checks fail (717/722). With one pointed at
  this worktree's `docs`, it passed 722/722. Removed afterwards with
  `cmd /c rmdir` from PowerShell, and the worktree's `docs` was checked to be
  intact.

## Test record

All runs were in this worktree on `037c1204` (docs-only on top of
`b9475a88`). No code was changed, so no browser suite or witness spec was
added or changed, and neither runner was run. A review of a docs-only diff runs
the two fast tiers only.

- **Fast node tiers:**
  - `node apps/viewer/run_tests.cjs`: 599/599, with the node-fs tier skipped
    (no projection in a worktree).
  - `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack/data/scratch/walk1117`,
    with the temporary `docs` junction: **722/722**, `[real]` armed.
  - `node apps/annotate/run_tests.cjs`: **324/324**.
- **Default tier:**
  `C:/workspace/tolstack/venv-win/Scripts/python.exe -X utf8 -m pytest -q -p no:cacheprovider`
  gave **1 failed, 2114 passed, 1 skipped, 4 deselected in 494.45 s**, single
  process. It is recorded with `suite-time record --tier default --seconds 495`
  and is inside budget.
  - The one failure is the documented worktree red,
    `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`: its
    node-fs tier finds no projection here. That tier ran on its own, 722/722
    against the scratch root (above).
  - The skip is `tests/test_fit_bound_features.py:433` (the pitch-link bearing's re-extraction is not installed), the same one the joint handoffs' records carry.
- **Not run:** the browser runner and the witness runner, because no suite,
  guard or spec changed.

## Found on arrival

Nothing. This is a worktree session, and the main checkout was not written:
every write went to `data/scratch/walk1117` (gitignored). That root is safe
to delete after the review.

## Blocked actions

None.
