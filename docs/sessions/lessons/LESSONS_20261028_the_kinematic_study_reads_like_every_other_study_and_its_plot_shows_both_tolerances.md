# LESSONS 2026-10-28 — the_kinematic_study_reads_like_every_other_study_and_its_plot_shows_both_tolerances

## What landed

- **One page shape.** The kinematic study's results (name, verdict strip,
  driver line, chart, a readout row per stop, the provenance fold) render at
  the top of `#detail` (`VA.renderKinematicResults`), the selection's preview
  under them in a `.detail__preview` child. `VA.renderKinematic` is now only
  the contributor table, in `.tv__main` under the DAG. `#kinematichead` is
  gone from the HTML. A chain study's verdicts render at the top of the same
  pane through the same component (`VA.verdictStrip` fed by
  `VA.chainVerdictItems`); its `#totals` stay at the grid foot.
- **The DAG is unbounded** (`bounded`/`scrollToGrid` no longer passed;
  `.tv__scroll--bounded` CSS gone; `paneToGrid` deleted). The views/topology.js
  half of the bounded machinery is now dead and filed
  (`ISSUE_20261028_the_bounded_dag_pane_is_dead_code_since_the_kinematic_results_moved.md`)
  rather than deleted, because the parallel
  `the_active_study_is_a_compact_band_…` handoff is rewriting that file.
- **`flyout-replaces-detail` is retired** (`syncSceneColumn` deleted with it).
- **The right-hand pane is sticky** (`position: sticky; top: 47px; height:
  calc(100vh - 47px); overflow-y: auto; align-self: flex-start`) on every
  topology.html page. Not asked for in as many words; without it the results
  scroll off the top the moment the reader scrolls the now-unbounded DAG,
  which defeats deliverable 1. A judgement call — the reviewer may want it
  scoped to study pages.
- **The travel band.** `VA.kinematicTravelBands` reads, per stop, each
  `groups[]` entry whose study ref's `parameter` is the sweep's own driver
  parameter: x half = the ref's `total.worst_case_half` (RSS:
  `total.rss_half`), slope J = `entries[stop.index]`. Worst case is the
  parallelogram `y = J·dx ± d`, `d = stop.worst_case_half − group.reach`;
  RSS is the sheared ellipse `dx = a cos t, y = J a cos t + b sin t`,
  `b = sqrt(rss² − (J a)²)`. Corner identities are asserted at value level
  (fixture and live: 1.707096 at −7°, 1.339412 at +72°).

## Decisions not in the handoff

- **The corner identity is not a tautology** even though `d` is derived from
  the stop's total: the corner is `|J|·h + d`, so it equals the stop total
  only if the builder's `group.reach` is exactly `|J|` times the ref's
  `worst_case_half`. A band drawn at the wrong width (RSS half, or the stop's
  own driver) fails it — that is the mutation the live spec uses.
- **RSS is an ellipse, not a second parallelogram.** A parallelogram with the
  RSS halves would put its corner at `|J|·a + b` = 1.139°, not the stop's RSS
  0.985°. The ellipse is the statistically right shape and its top is the
  chip's number.
- **No auto-Fit on arrival.** "DAG unbounded and fitted" was read as Fit works
  in the unbounded page (the zoom suite checks it), not "zoom on arrival":
  arrival often animates a respine, and fitting against a mid-animation frame
  is wrong. The lit grid can therefore arrive well down the page until the
  compact-band handoff lands.
- **The link to the open question** is a module constant
  (`VA.KINEMATIC_TRAVEL_DATUM_ISSUE`, a repo path), offered only where
  `canReadWorksheets` (the transport reaches `docs/`); elsewhere the same
  words with no link. `tests/test_kinematic.py` checks the file exists.

## Questions for Jeff (filed:
`docs/issues/ISSUE_20261028_both_end_stops_carry_the_full_travel_band.md`)

1. **Which stop carries the travel band?** Both stops currently take the whole
   ±0.82 mm (worst case; ±0.5616 RSS), each scaled by its own motion ratio:
   −7° gets 1.728 × 0.82 = 1.417°, +72° gets 1.249 × 0.82 = 1.024°. The sweep
   measures actuator travel from 0 mm at full extension (S461-610/636), which
   is the +72° stop. If that stop is the datum, only the −7° stop moves by
   the stop-to-stop tolerance, and the +72° worst case is the direct 0.315°
   (margin +0.185 against ±0.5, instead of −0.839). The stop-to-stop distance
   is one dimension shared by two stops; applying its whole band at both
   treats it as two.
2. **64.44 vs 64.466.** The travel study's nominal is 64.440 mm (Jeff's
   2026-10-20 CATIA correction from the section's 64.465); run P2 solves the
   −7° stop at driver 64.466. The band is drawn about the sweep's stop; the
   axis now says "(swept 0.000–64.466; travel study nominal 64.440)".

## Detail-pane width measurements (1600×1000 and 1920×1080)

- Pane default 560 px (unchanged; `.tv .detail`), content 527 px after its
  16 px padding. The chart's viewBox went 720 → 520 px so it draws at ≥1:1
  there (rendered 527 px); the verdict strip and readout table are 527 px
  with no horizontal overflow.
- The chart keeps its text at the token sizes for a pane ≥ ~552 px. At
  420 px it scales to 0.75 (`--t-micro` ≈ 8 px); at the divider's 320 px
  floor ≈ 6 px. Filed:
  `ISSUE_20261028_the_kinematic_chart_scales_its_text_below_the_type_scale_in_a_narrow_pane.md`.
- On the live study the worst-case travel band is ~11 px wide and the RSS one
  ~8 px on the 66 mm axis: drawn to scale and outlined, but the slope is hard
  to read. Filed:
  `ISSUE_20261028_a_stops_travel_band_is_a_few_pixels_wide_on_the_whole_sweeps_axis.md`.

## Gotchas

- **The shared projection was older than this tree's kinematic builder**
  (built from `28c6f783`; `ade6ee9c` since changed
  `scripts/build_kinematic_projection.py`), so `run_tests.cjs --repo
  C:\workspace\tolstack` refused the `[real]` tier. Rather than overwrite the
  shared projection from a branch, I built a scratch root at
  `data/scratch/kinband/` (copied `projections/viewer` and
  `inbox/linkage-sweeps`, the worktree's `docs/`, junctions for the other
  read-only data) and rebuilt only the kinematic projection there, from a
  **committed** tree — the gate refuses a dirty-tree stamp too. Removed at
  hand-back.
- The scratchpad path is too long for the builder (`WinError 206`);
  `data/scratch/` is short enough.
- The fast tier's DOM shim's `querySelectorAll` takes one compound selector,
  not descendant selectors (`"p.kmchart__note a"` finds nothing).
- A bash heredoc containing JS template literals failed to parse in the Bash
  tool; writing the edit script to a file worked.
- `pytest-xdist` is not installed in `venv-win`, so `-n 16 --dist loadfile`
  is not available; the suite ran single-process.

## Found on arrival

Nothing: the worktree was clean, and I touched the main checkout only under
gitignored `data/scratch/`.

## What the unbounded page did to older checks

- Leaders suite: after a contributor click the check scrolled the page to the
  top, where the tangential link's dots no longer are (the old box had
  scrolled itself to the row). It now scrolls to the selected grid row, and
  so does the scene-pick comparison. At hide the window shows 12 leaders where
  the 50vh box showed 6–10, so the check reads "at least six" (renamed, its
  spec moved).
- Two older witnesses showed their defect only because a closed scene used to
  leave the preview pane hidden: `c85739df` was re-aimed (the closed scene
  laid out anyway), and `09a1cf0a`'s second mutation (clamping the stored
  width at boot) was retired with the reason in its spec.
- `annotate flyout`'s "whole live drawing is clear of the panel" failed twice
  in four runs on an exact-adjacency comparison (860 against 860, sub-pixel).
  It is now within 1 px.
- `d42adbc7` stays NOT WITNESSED: a pre-existing decay already filed on
  integration (`ISSUE_20261028_the_contributor_row_highlight_witness_aborts_before_its_check.md`).

## Integration moved while this ran: the merge conflicts, for the reviewer

`the_active_study_is_a_compact_band_…` landed on integration mid-session. It
kept the 50vh box and made a study arrival **frame** the lit set
(`fitDagTo(true)` after the respine settles). This handoff removed the box.
The two compose: `fitDagTo` falls back to the window when the pane is not
bounded, and the results pane is sticky, so the arrival frame scrolls the
model and leaves the results in view. `git merge-tree HEAD integration`
reports three textual conflicts (topology_app.js auto-merges):

1. `scripts/guard_enumeration.mjs`: both re-pinned. Re-measure after the
   merge (`node scripts/run_mutation_witness_tests.mjs --unenrolled`) and keep
   both comments.
2. `scripts/run_viewer_browser_tests.mjs` ~:4277: integration's "bounded box
   that arrives with the study framed" against this branch's "no box of its
   own". Keep the unbounded check and fold in integration's framing
   assertion against the window: `!kinStart.bounded && kinStart.lit > 0 &&
   kinStart.litTop >= kinStart.paneTop - 2 && kinStart.litBottom <=
   kinStart.paneBottom + 2` (`kin()`'s pane rect is the window here).
3. The "at least six leaders" spec: both branches renamed the same guard to
   the same name (add/add plus rename/delete). Keep one file and either note.
   ~:11783 is comment-only.

I did not merge integration into this branch. No merge is this session's to
make.

## Verification record

Run from this worktree. The data tiers ran against the scratch root
`C:\workspace\tolstack\data\scratch\kinband` (kinematic projection rebuilt
there from this branch's committed tree, other projections copied, the rest
of `data/` and `node_modules` junctioned read-only from the main checkout):

- `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q`: 1594
  passed, 1 skipped, 1 failed, 309 s, single process (no xdist in venv-win).
  The failure is `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`,
  the deliberate worktree red (no projection under the worktree). That tier
  ran separately, below. After the last pin and spec edits I re-ran
  `-k "guard or witness or enumeration or kinematic"`: 131 passed.
- `node apps/viewer/run_tests.cjs --repo <scratch>`: 605/605, `[real]` tier
  included, final commit.
- `node apps/annotate/run_tests.cjs --repo <scratch>`: 246/246.
- `node scripts/run_viewer_browser_tests.mjs --repo <scratch>`: the full run
  was 33/35 suites in 336 s (zoom and leaders red, above). After the fixes,
  those two plus `annotate flyout` (twice) were re-run with `--only` and are
  green: 26/26, 17/17, 46/46. The kinematic suite is 19/19 plus my two new
  checks. I did not repeat the full tier after the last test edits.
- `node scripts/run_mutation_witness_tests.mjs --repo <scratch>
  --changed-since integration`: 38/45 witnessed, 45/45 reached, 0 left to
  the sweep, 25m46s. The six misses this diff caused were repaired, and each
  was re-checked with `--only` and is WITNESSED: `fb0d661d`, `671f9aed`,
  `e93b7a99`, `30676e29`, `c85739df`, `09a1cf0a`. `d42adbc7` is pre-existing
  (above).
