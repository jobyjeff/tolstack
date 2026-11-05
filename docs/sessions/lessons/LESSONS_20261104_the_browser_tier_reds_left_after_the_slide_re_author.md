# Lessons -- the_browser_tier_reds_left_after_the_slide_re_author (2026-11-04)

Every red was the check, not the product. One of them sits on top of a real
reader-facing layout defect, which is filed rather than fixed (red 2). The
dependency (`the_viewer_real_tier_follows_the_slide_re_author`) did **not**
clear the topology reds. It moved the fast-tier pins, and the browser tier
keeps its own copy.

## Per red

| # | Red | Verdict | Evidence | Caused by |
|---|-----|---------|----------|-----------|
| 1 | `topology file://` / `http`: four `[real]` leader/band checks | stale pin (second copy of a number) | The checks pinned 61 leaders / 62 bands. The plan has 63 / 64, which the fast tier pins (`d3a7afae`). | `6d23015d` (62 leaders), `b4b641db` (63) |
| 2 | `real render path` / `crop lightbox` ABORT on a row `click()` | check clicks a point no reader can | `elementFromPoint` probe, below | `6d23015d` widened the rails 606->672px and `682a89b6` to 678px. That moved Playwright's click point under them. |
| 3 | `3D pane follows the selection`: tint and row-click checks | stale precondition; racy before | `openedBySweep` is `[]` while the scene holds all 47 parts | `4c0b7c62` (`isolate parts` loads the whole assembly) |
| 4 | `the scene pane reads over HTTP`: "shows the mechanism" | same as 3 | it waited on `openedBySweep.length > 0` | `4c0b7c62` |

### Red 2: what covers the row

A probe at 1600x1000 with the Preview open (the suite's own size): `.tv__hscroll`
is 737px and `svg.tv__rails` is 678px of it, so 59px of grid is left. Playwright's
`click()` scrolls the row's box into view. A row 1218px wide in a 737px pane
scrolls the grid sideways by 678. The rails are `position: sticky; left: 0`
(by design, `topology.css`), so the row slides **under** them. Playwright's
click point, about x=910, is then the rails, a `rail__leaderhit`, or the
top bar on a retry. All three interceptors in the logs are one mechanism.
On 11-02 the rails were 606px wide (measured by building `dfc020b3`'s
`docs/topologies` with today's builder). The same click point landed 3px
right of them, which is why the suite passed until the each_stop landing. The
leader hit-area is not wrong: it's a 14px stroke inside the rails' own box.

`clearPoint`, the helper `fd4e733d` introduced for exactly this, had the same
flaw. `scrollIntoView({block:"center"})` also scrolls sideways, so on the name
cell it found no clear point and fell back to a synthetic `dispatchEvent`.
Now the helper puts the grid's sideways scroll back, and only when the cell
is still covered does it scroll the grid until the cell starts beside the
rails, which is what a reader does. The two aborting sites, and the
companion-preview hover beside the first, go through it on the ELEMENT cell.
(Not the row: the 59px a reader can reach is the merged COMPONENT cell,
whose click deliberately selects nothing.)

The reader-facing half, a 59px grid at 1600 wide, is a layout decision:
`ISSUE_20261104_at_1600_wide_the_product_graphs_rails_leave_the_grid_a_59px_slit.md`
(audience: strategy). Shots: `shots/browser_tier_reds_1104/`.

### Reds 3 and 4: the field changed meaning under the checks

The synthetic binding (`installRealAnnotatorReads`) was "faces of the first part
the sweep opened", and three waits required `openedBySweep.length > 0`.
`openedBySweep` means "parts this sweep loaded, which leaving it unloads". The
sweep skips any part already open (`apps/annotate/app.js`, the open loop). Since
`4c0b7c62` the page's `isolate parts` scope loads every installed mesh,
usually before the sweep reaches that loop. So on a real run the field is
empty, the binding names nothing, and nothing is tinted. That's a race, and
it explains why "the failing subset moves from run to run" after 11-03.
Whichever side won decided the checks. The product is consistent: the scope
owns the parts it loaded. The checks now read `sweep.anchored`, the meshes
the sweep placed, and the HTTP check requires every one of them in the scene,
which is more than "at least one opened". It is deterministic whichever side
wins.

Before changing anything I instrumented the hover check. It dumped
`opened:false`, all 18 body rows `matched`/`ground`/`carried`, 47 parts in the
scene, and `openedBySweep: []`. Without that dump this looked like the
hover-timing flake and would have been "fixed" with a wait.

## Also fixed, because the DoD needs both node tiers green

`an archetype with no loader says so…` (filed as
`ISSUE_20261104_the_no_loader_test_throws_in_the_node_tier_on_integration.md`)
was a hoisting bug. The test ran `surfaceIsClean` about 1750 lines before the
`var`s it reads (`BANNED_IN_RENDERED_TEXT`, `VERBATIM_PROSE_CLASSES`) are
assigned, so it threw before scanning. I moved it below them unchanged. The
browser tier's two app suites run the same file, so they were red on it too.

## Gotchas

- **The main checkout's projection is master's, and integration is ahead.**
  `--repo C:/workspace/tolstack` compares this tree with master's topology. I
  bridged the inputs into the worktree
  (`dispatch bridge-test-inputs C:/workspace/tolstack <worktree>`), rebuilt
  with `scripts/rebuild_projections.ps1 -RepoRoot <worktree>` (stamps
  `dirty=False`), and passed `--repo <worktree>`.
- **The bridge refused the interpreter** because a stray `venv-win` file was
  tracked (`29b8ee0b`). The directory pattern `venv-win/` doesn't ignore the
  link the bridge makes, so it gets committed. I removed it and filed
  `ISSUE_20261104_the_bridged_venv_win_link_is_not_ignored_and_gets_committed.md`.
  Do not `git add -A` in a bridged worktree.
- To find which commit moved a layout number, build an old tree's
  `docs/topologies` with today's builder (`--topologies-dir`, `--data-root`
  into a scratch dir) and probe it. That is seconds per commit, against
  minutes for a suite run.
- Running `tests/test_mutation_witness_shadow_concurrency.py` in the
  background takes the repo's witness lock, so the witness gate refuses
  (`REFUSED: another witness run`) until it exits.

## Verified

All runs were from this worktree, with inputs bridged, the projections
rebuilt from the committed tree (`dirty=False`), `node_modules` junctioned,
and `--repo <worktree>`.

- Alone, `--only`: real render path 11/11; crop lightbox pass; 3D pane 32/32;
  the scene pane reads over HTTP 9/9; topology file:// 205/205 (+ respine
  44/44); topology http 205/205.
- Full browser tier (`node scripts/run_viewer_browser_tests.mjs --repo
  <worktree>`, 1425 s): **39/41**. Every suite named in the handoff passed.
  The two reds were `suite file://` and `suite http`, the in-browser copy of
  the no-loader test, which ran before its fix was committed. Re-run with
  `--only "suite "` they were 2/2.
- `node apps/viewer/run_tests.cjs --repo <worktree>` 635/635;
  `node apps/annotate/run_tests.cjs` 280/280.
- `pytest -q` (492 s, inside budget, recorded): 1721 passed, 1 skipped, 3
  failed. `test_the_enrollment_census_holds` was mine: a renamed guard. The
  pin moved, and `tests/test_mutation_witnesses.py` is now 44/44. The other
  two are `test_mutation_witness_shadow_concurrency.py`, which is the filed
  MAX_PATH defect (`WinError 3` on an 11-03 lesson screenshot name,
  `ISSUE_20261104_a_lesson_screenshot_name_overflows_max_path_in_the_shadow_concurrency_test.md`).
- `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack
  --changed-since integration`: 4/4 witnessed, 8m14s, 0 left to the sweep.
