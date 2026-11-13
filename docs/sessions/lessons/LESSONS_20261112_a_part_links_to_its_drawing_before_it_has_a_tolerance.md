# LESSONS 2026-11-12 — a_part_links_to_its_drawing_before_it_has_a_tolerance

## What shipped

- `scripts/build_topology_projection.py` reads drawing-checker's runs at build
  time (`drawing_checker_runs`, `--drawing-checker-root`, default
  `C:\workspace\drawing-checker`) and writes on every part `drawing_runs` (exact
  number, newest first) and `other_dash_runs` (same base, another or no dash —
  filled only when `drawing_runs` is empty). Row shape `DRAWING_RUN_FIELDS`:
  `run_dir, drawing, revision, date`.
- The Preview's part line (a dimension's "a dimension of …", each side of an
  interface) links the number to `VA.runUrl`, new tab, the run's revision
  beside it, older runs behind one `runsfold` ("N older"). No run → plain label.
- `model_view.py` was **not** touched: the Preview reads `topologies[].parts[]`
  (`VA.topologyIndex`), so a second copy on `model.parts[]` would have been a
  fact written twice.

## Decisions not in the handoff

- **Which drawing a run is** is `build_part_names_projection.drawing_number`
  (title block's `drawing_no`, else the PDF name's leading number), the run
  directory listing is `build_viewer_crops.run_dirs`. No name parser was
  written. Consequence worth knowing: run
  `20261109_151251_546293-002_A.1_INSTRUMENTED_PITCH_LINK_ASSEMBLY…` is filed
  under **546293-003**, because its title block says so (file name -002, title
  block -003). Neither model has a 546293 part today.
- A run with no `*_p01.json` (11 early/failed runs, plus the eval dirs) is not
  offered: it has no number to be filed under.
- The revision shown is the title block's (`A`), not the directory's (`A.1`).
- A bare base (`215177`) counts as "another dash number" for a `215177-001`
  part, marked `(different dash number)`. Three v2 parts land there; whether
  the bare-base drawing *is* their drawing is a model question
  (`ISSUE_20261113_five_end_stop_parts_have_no_drawing_checker_run_of_their_own.md`).
- The older-runs fold is `runsfold`, styled by the same rule as `provfold`:
  two existing tests count `details.provfold` as a pane's one provenance fold,
  and older runs are not provenance.
- A part or body selected in the tree previews **nothing** (no element record
  for a part — `VA.focusElementOf` returns null). The link therefore lives where
  parts are previewed today; a part's own Preview is filed for strategy
  (`ISSUE_20261113_a_part_or_body_selected_in_the_tree_previews_nothing.md`).

## v2, every part's Preview opened once (read off the page)

`node tests/debug_part_drawing_links_20261113.mjs --repo <scratch root>`, grid
row of each part's first dimension; the gas-spring mount also from the tree
(feature row → interface Preview, the part a side) and the DAG (its bar): all
three agree.

| part | number | link shown |
|---|---|---|
| propeller hub | 214373-002 | other dash: 214373-003 rev A |
| tangential link mount | 215175-002 | other dash: 215175 rev A |
| gas-spring mount | 213668-002 | own: rev A, 2026-08-19, "4 older" |
| blade bonded assembly | 216332-001 | none |
| pitch arm | 215071-001 | other dash: 215071 rev C |
| pitch plate | 215177-001 | other dash: 215177 rev A, "1 older" |
| gas-spring piston body | 214700-002 | own: rev A |
| pitch link | 213862-002 | own: rev A |
| pitch-link spherical bearing | — | no row or dot names it: no Preview |
| pitch anti-rotation link | 212956-005 | own: rev A |
| tangential-link bearing, narrow end | — | no row or dot: no Preview |
| tangential-link bearing, wide end | — | no row or dot: no Preview |
| lower piston head | 214699-002 | own: rev A |
| upper piston head | 214698-002 | own: rev A |
| piston cover | 214958-002 | own: rev A |

**7 of v2's 15 parts have a run of their own drawing today**; 4 are offered
another dash number; 1 (216332-001) has nothing; 3 bearings carry no number.
Missing a drawing Jeff would export: 214373-002, 215175-002, 215071-001,
215177-001, 216332-001 (filed with `needs: jeff`). Three hrefs curled against
8000 answered 200.

Shots (3840×2160, looked at): `shots/a_part_links_to_its_drawing_before_it_has_a_tolerance/`
`01_own_run_*` (gas-spring mount, older runs open) and `02_hub_other_dash_*`.

## Environment notes

- The main-checkout edit guard blocks `New-Item -ItemType Junction -Target
  C:\workspace\tolstack\data\inbox` (reads the target as a write to a tracked
  path). I copied `data/inbox` and `data/meshes` into the scratch root with
  robocopy instead (~350 MB); `cmd /c mklink /J` for `docs`/`apps` → worktree.
- The scratch root needed every viewer projection rebuilt from this tree, not
  just the topology one: the freshness gate refused crops/kinematic/results
  built before a `feature_identity.py` change on integration. Contact
  suggestions took 7.5 min.
- This venv has no pytest-xdist; `-n 16 --dist loadfile` errors out.
