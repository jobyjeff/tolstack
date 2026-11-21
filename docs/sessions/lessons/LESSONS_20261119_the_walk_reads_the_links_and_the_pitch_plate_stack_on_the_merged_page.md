# LESSONS 2026-11-19 — the_walk_reads_the_links_and_the_pitch_plate_stack_on_the_merged_page

The review page is `REVIEW_20261119_the_links_and_the_pitch_plate_stack.md`.
It has 29 counted rows (22 does it, 5 partly, 2 does not), eleven "only you can
decide" rows (D1–D11), a re-pick table, the before/after map counts, the
end-stop table and the v1 → v2 table. Shots are in
`shots/the_walk_reads_the_links_and_the_pitch_plate_stack_on_the_merged_page/`:
27 PNGs. Each was read with vision before the row citing it was written. Shots
that turned out mislabelled or uninformative were deleted rather than cited.

## How the tree was served

- **Walked tree: `integration` = this branch's base, `8082bad0`**, all seven
  links merged. The main checkout is on `master` (`3e733425`), which carries
  none of them.
- **Scratch root: `C:/workspace/tolstack/data/scratch/walk1119`.** It is a
  `cp -r` of `data/inbox`, `data/meshes` and `data/projections`. The eight
  builders then ran from this worktree with `--data-root …/walk1119/data`
  (crops with drawing-checker's venv); all exited 0 without
  `--allow-older-tree`, in about 11 minutes. The log is
  `data/scratch/walk1119.build.log`, and `walk1119/pristine_fi` is an
  untouched copy of Jeff's log.
- **Driver:** `node tests/debug_walk_merged_page_20261114.mjs --root <scratch>
  --port 8879 --shots <shots dir>`, unchanged, driven over HTTP by a
  scratchpad client. A `node_modules` junction to the main checkout's was
  made in the worktree for it and removed at the end.
- **8000 was up** this time. The driver proxies unmounted GETs to it
  (drawing links, `/tolstack/rebuild/status`). So the "Data is older than the
  latest code" banner in every shot is the main checkout's state, not the
  walked tree's. Never press its Rebuild from a walk.

## Jeff's log

`C:\workspace\tolstack\data\inbox\feature-identity\`: **101 files before and
after.** Listing sha256 `f1e06978…` both times (the same as on 11-18: Jeff
has bound nothing since). The sha256 of all file contents was `0cdc8fc8…` both
times. The scratch copy went from 101 to 102 (one Take).

## What the walk could not check, and why

- **Jeff's exact 11-19 page could not be re-served.** The "before" counts
  come from re-running his tree's `map.js` (`git show aa8f4ee4:apps/viewer/map.js`,
  master at the time of his note) over the main checkout's projection. That
  projection is still the one built from `f510260e` at 10:09 on 11-19, before
  his note. Today's `VA.mapRouteNotes` judged both trees, so the two columns
  use one rulebook. His own page's rules reported 0 notes on that geometry:
  the through-own-box and shared-run rules did not exist then.
- **"Crossings" are counted by my scratch scorer** (`score.cjs`: proper
  segment intersections between two connectors, excluding shared end
  points). The page has no crossing rule; link 5's lesson used a similar
  scorer. Jumpers (a part's own dimensions) are not counted against routes.
- **The 1536 shots are at device scale 1.** Link 5's probe used scale 2, so
  its 1536 shots are sharper than mine. The finding (a 274-px strip in Side
  by side) does not depend on it.
- **Which lug faces 1370/1371 and 1445/1446 belong to** I took from earlier
  pages' measurements (11-18 walk, link 5's table), not from a fresh fit. The
  identical-candidate finding stands either way: both lugs are offered the
  same faces.
- **The 3D hover wash for the bore suggestion** was too small to see at the
  pane's framing, so that shot was dropped. The write itself (event 0101) is
  the evidence.
- **Whether an empty Preview for a selected part is designed** is not
  settled here; it went into the small findings (F5) as a question.
- **The whole browser tier and the witness gate** are the review's. This diff
  touches only `docs/`.

## Traps for the next walk

- **The Groups switches persist** (`tolstack.viewer.groupKinds`,
  `tolstack.viewer.gridOuter`, per model, in localStorage). A popover click
  closes the popover, so a scripted sequence of Playwright clicks on the
  checkboxes falls out of step and leaves a stored state the next `goto`
  inherits. My first set of switch shots was mislabelled because of it. Toggle
  in-page (`input.click()` only when `checked` differs), print the three
  states after every toggle, and set all on before each shot.
- **Map box colour depends on hover history** (filed). A box hovered by any
  probe keeps its body's ink. Do not read box colour off a shot as a fact
  about the model.
- **A click at a box's middle selects the jumper crossing it.** To select the
  part, click its name.
- **`c.py` needs UTF-8 stdout.** The page's text has `▾` and `·`, and the
  Windows console codec raised on them.
- **Don't fall back to a bare `python` in a Bash heredoc.** It hit the Store
  stub and hung until the 2-minute timeout. Edit with the Edit tool instead.

## Issues

- **New:**
  - `ISSUE_20261120_a_map_box_wears_its_bodys_colour_only_after_the_pointer_has_passed_over_it` (bug, med);
  - `ISSUE_20261120_the_links_leave_four_questions_for_jeff_the_swage_the_machined_numbers_ms14103s_one_solid_and_the_ball_faces` (chore, med, strategy: link 4's questions that were in its lesson only);
  - `ISSUE_20261120_small_findings_of_the_links_and_pitch_plate_stack_walk` (low, F1–F5).
- **Addenda** (both on this branch's HEAD, both `deferred`):
  - `ISSUE_20261028_contact_suggestions_cannot_say_which_blade_a_topology_edge_means`:
    on v2 both lugs get the same candidate, and a Take wrote the other lug's
    faces. It asks triage to raise it;
  - `ISSUE_20260930_a_valueless_structural_edge_is_invisible_to_the_gap_list`:
    v2 reads "Nothing is recorded as missing" with 0 of 104 edges valued.
- **Seen again, not refiled:** the pin-label pile-up, the crossed outline
  name, the race listed twice, the folded two-body assembly, and the Groups
  popover ticks (all cited in the small-findings issue).

## Test record

All runs were in this worktree. The diff is docs only: the review page, this
lesson, 27 shots, 3 new issues and 2 addenda. No suite, guard or spec
changed, so neither the browser runner nor the witness runner was run.

- **Default tier**, at `7e2363cf` (the walk's commit; this lesson's commit
  adds only this file):
  `C:/workspace/tolstack/venv-win/Scripts/python.exe -X utf8 -m pytest -q -p no:cacheprovider -rs`
  gave **2 failed, 2585 passed, 1 skipped, 4 deselected in 535.59 s**, single
  process. It is recorded as `suite-time record --tier default --seconds 537`,
  inside budget. The two failures:
  - `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`, the
    documented worktree red. That tier was run armed (below).
  - `tests/test_export_runs_match_the_run_log.py::test_every_established_export_lists_exactly_the_runs_the_log_records_for_its_sha`,
    live drawing-checker data, already filed as
    `ISSUE_20261119_the_gas_spring_mount_export_has_a_sixth_run_the_pitch_linkage_topology_does_not_list`.

  The skip is `tests/test_fit_bound_features.py:433` (the pitch-link
  bearing's re-extraction is not installed), the same as the earlier walks.
- **Fast node tiers:**
  - `node apps/viewer/run_tests.cjs`: 523/523, node-fs tier skipped
    (worktree).
  - `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack/data/scratch/walk1119`,
    with a temporary `docs` junction into this worktree: **623/623**,
    `[real]` armed. The junction was removed with `cmd /c rmdir`, and the
    worktree's `docs` was checked to be intact.
  - `node apps/annotate/run_tests.cjs`: **333/333**.

## Found on arrival

Nothing. This is a worktree session, and the main checkout was not written:
every write went to `data/scratch/walk1119` (gitignored). That root and
`data/scratch/walk1119.build.log` are safe to delete after the review.

## Blocked actions

None.
