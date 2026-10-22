# LESSONS 2026-10-21 — the_kinematic_study_checks_its_run_its_units_and_shows_its_limit

Handoff: `docs/sessions/active/HANDOFF_20261021_the_kinematic_study_checks_its_run_its_units_and_shows_its_limit.md`.
Seven issues taken as one class: the blade-pitch study, its sweep run and the
surfaces that read it could disagree without anything noticing.

## The 1015 → 1016 margin deltas: zero

`vpa-pitch-p2-20261015-013931` and `vpa-pitch-p2-20261016-235852` are
**bit-identical** in everything a kinematic study reads: the max absolute
difference over the whole `sensitivity.by_measure.blade_pitch` table, every
point's solved blade pitch and every driver value is `0.0`, and
`geometry.values` and `max_finite_difference_disagreement` (2.433e-07) are equal.
What differs is `pipeline_commit` (`5fc848f9…` → `8a476946…`), the new
`pipeline_dirty_paths: []`, and `geometry.features[]` (absent → 61 entries).

So nothing moved, not even in the sixth decimal:

| stop   | index | nominal | worst half | RSS half | S461-607 margin |
|--------|-------|---------|------------|----------|-----------------|
| minus7 | 0     | -6.992  | 0.244      | 0.165    | 0.256 (0.256376 both runs) |
| plus72 | 79    | 72.001  | 0.242      | 0.159    | 0.258 (0.257626 both runs) |

The `REAL` table in `tests/test_kinematic.py` is unchanged; `REAL_RUN` now
names the 1016 file. Every existing browser `[real]` check that pins a margin or
a tip value stayed true, which is why no existing block of
`run_viewer_browser_tests.mjs` needed touching.

## Every feature join reconciled

The projection reads `sweep.features_in_artifact: true`, and all six
contributors are `feature_source: "artifact"`. Per contributor, against the
1016 run's own `geometry.features[]`:

| contributor | labels | artifact says | authored |
|---|---|---|---|
| `pitch_link_length` | `pitch_link.length` | edge `pitch_link_length` | same |
| `pitch_arm_radius` | `pitch_link.point_b[0..2]` | node `pitch_link_lower_sphere_centre`, body `blade` | same |
| `pitch_plate_attach_height` | `pitch_link.point_a[2]` | node `pitch_link_upper_sphere_centre`, `z`, body `pitch_plate` | same |
| `tan_link_length` | `tan_link.length` | edge `tan_link_length` | same |
| `tan_link_mount_height` | `tan_link.point_a[2]` | node `tan_link_lower_sphere_centre`, `z`, body `base` | same |
| `pitch_plate_tan_link_attach_radius` | `tan_link.point_b[0..2]` | node `tan_link_upper_sphere_centre`, body `pitch_plate` | same |

No finding: the study author's 2026-10-16 reading of which end is which, made
from the artifact's motion alone, is what linkage later published. A new
`[real]` test asserts every contributor label has an entry, because
`_reconcile_feature` silently skips a label the list lacks and still reports
`"artifact"` (filed: `ISSUE_20261021_a_kinematic_label_missing_from_geometry_features_still_reads_as_identified_by_the_artifact.md`).

## The unit vocabulary and the refusal wording

`tolerance_stack/kinematic.py`, `PARAMETER_KINDS = ("length", "direction", "driver")`:

- **length**: attribute `point_a`, `point_b` or `length` → `LINKAGE_LENGTH_UNITS = "mm"`.
  The artifact never states it. The evidence is that its provenance spells
  lengths `*_mm` and its drivers declare `mm`.
- **direction**: `axis_a`, `axis_b`, `u_a`, `w_a`, `u_b`, `w_b` → `DIRECTION_UNITS = "rad"`.
  A small change in a unit-vector component is a small tilt, so the band is an
  angle in rad. `deg` is refused, because folding it as rad is wrong by 57.3x.
- **driver**: whichever label `mechanism.driver.parameter` names, in
  `mechanism.driver.unit`.
- Any other attribute has no known unit, and a band on it is refused. A gap row
  on it needs no unit.

The refusal, at load, names the contributor and the label:

> kinematic study 'fixture': contributor 'link_length''s band is in 'in', but
> label 'link.length' is a length parameter in 'mm' (sweep 'kin-fixture-run'),
> so the sensitivity it scales is per mm and the fold would be dimensionally wrong.

For a direction label it adds: *"A clearance in mm becomes a tilt only over a
cited length (a bushing's, a guide's); cite both and author the band as the
tilt, in rad."* An inline band with no `units` is refused separately ("states no
units"). Negative controls: inch-on-mm, mm-on-direction (the bushing case),
deg-on-direction, deg-on-driver, no units, unknown attribute. Each has its own
test, plus a positive control (a rad disk folds to √2·0.002).

**Suggestion recorded, not built (handoff item 4):** if linkage ever publishes
`geometry.units[]`, `parameter_unit` should prefer it and refuse on a
disagreement with the vocabulary. Filed so it outlives this handoff:
`ISSUE_20261021_prefer_a_published_geometry_units_over_the_kinematic_label_vocabulary.md`.

The same correction went into three sentences. `docs/DAG_TOPOLOGY.md` (the
bushing-tipping sentence now names the bushing length as the second value) and
the study's two `excluded_terms` rows said the same thing in the same words.

## Item 7, the exit-code decision: stay 0, end the output by name

`build_kinematic_projection.py` now ends its output with
`kinematic studies: N of M built` and one `NOT BUILT <id>: <type>: <message>`
line per failed study. `--report` prints the same lines from the projection
already on disk, and `rebuild_projections.ps1` calls it as its very last
command, after the provenance stamps, so the failure is the last thing a caller
reads.

The exit code stays **0**, on purpose. A worktree, or a batch-merge candidate
whose gitignored sweep inbox was not bridged, has no sweep to fold. That is a
normal state of a checkout, not a defect in the tree, and the study is already
carried as `error`, which the viewer and the `[real]` tier both surface. A
non-zero exit would redden every such rebuild, and a rail that is red for normal
reasons teaches its readers to ignore red. A study refusing for an authored
reason (a unit mismatch, a disagreeing join) is caught by `pytest` on the tracked
document regardless.

## Item 6, the layout choice: move the label to the bottom-left end

The handoff offered either one: anchor the tip below the line, or move the label
to an end the stop labels do not use. I moved the **label**, to just under the
**lower** limit line at the plot's **left end** (`labelX`/`labelY` in
`VA.kinematicChart`, pinned in the fast tier). Reasons:

- The stop labels hold the two top corners, and the tip is anchored at the top.
  Moving the tip down would just cover the band instead.
- The first attempt put the label mid-plot under the lower line. The screenshot
  showed a mid-plot hover's cursor line running through it, so it went to the
  left end.

`td.kmrow__3d` got `white-space: nowrap`. Measured at 1100 px: every `3D ↗` link
box is 15 px tall (one line). Screenshots, from this branch's tree over a
scratch projection, served over HTTP:

- `docs/sessions/shots_20261021_kinematic_study_checks_its_run/kinematic_page_1100px_newtab_links_hover_midplot.png`
  (the `3D ↗` link variant, forced by failing the mount probe)
- `.../kinematic_page_1600px_hover_midplot.png`
- `.../kinematic_page_1100px_limit_citation.png` (the card the limit opens)
- `.../annotate_sweep_vpa-pitch-p2-20261015-013931.png` (no contributor group,
  and the banner says why)
- `.../annotate_sweep_vpa-pitch-p2-20261016-235852.png` (the study's own run:
  the group is there)

At both widths the tip's box does not intersect the limit label's box.

## Item 5: what a verdict leads to

`VA.kinematicVerdicts` carries `limitCard` (`VA.citationCard(limit.source_ref)`)
and `contextCard` (the check's `context_ref`, else the stop's). In the strip, the
limit text and the stop label are `cardtrig`s, so they open the same citation
hover card the topology rail's confidence chip opens, on hover, focus or click.
With no card host, the where-line becomes the native tooltip. `topology_app.js`
passes `onCardShow` into the kinematic ctx. That is one line in a file outside
the handoff's scope list, and it is the only way to wire it.

**A finding the screenshot made:** the card shows a note's *lead sentence* and
folds the rest into "Data source". The live limit notes opened with "c_status:
draft." and put the adoption reasoning third, so the card said nothing about the
borrowing until a second click. Both limit notes are reordered so the adoption
reason leads. Same words, nothing added. The card now reads "Adopted here as the
closest available numeric acceptance criterion…". Watch for this anywhere a
note's first sentence is bookkeeping.

## Item 3: the run/study mismatch

`AA.sweepStudyFor(study, runId)` in `apps/annotate/sweep.js` (pure, so the node
tier can plant a mismatched pair). `cmdSweep` drops a study whose
`sweep.run_id` is not the run being loaded, sets the `warn` banner and adds a
`contributors` key to the verb's console result. The text: "Contributors left
out: Blade pitch at the end stops was folded on run vpa-pitch-p2-20261016-235852,
not on vpa-pitch-p2-20261015-013931." A study that did not build (no
`sweep`) is refused the same way. `testAnnotateSweepRail` now boots on
`study.sweep.run_id` read from the projection. A new check pins that it equals
`SWEEP_RAIL_RUN`, and another boots the older P2 run and asserts there is no
group and the banner names the folded run.

## Things that cost time

- **`git checkout <file>` to undo a planted mutation threw away uncommitted
  work.** It restored the last commit, not the pre-mutation file, and I had a
  hand backup only by luck. Commit before you mutate, or mutate a copy.
- The Bash tool's heredoc choked on a long Python patch with nested quotes
  ("unexpected EOF"). Writing the patch to a scratch file and running it worked.
- Python's `write_text` on Windows writes CRLF. `core.autocrlf=true` normalises
  it back in the blob, so the diffs are clean, but `git` warns on every add.
- The browser screenshot script needs `launchBrowser(chromium, { channel: "chrome" })`.
  The default looks for Playwright's own headless shell, which is not installed.

## Scope notes for review

- `scripts/guard_enumeration.mjs`, which the handoff fenced off: only the three
  `DECLARED_GUARDS` pin lines changed. Enrolling a guard *is* raising those
  pins (the census test names that file as where they live), and the DoD
  requires every new guard enrolled. Nothing else in that file was touched. The
  staged `mutation_tier_gates_on_every_pin_and_survives_a_board_move` depends on
  this handoff, so it lands after and rebases over three lines.
- `tests/test_title_style.py` gained one banned shape, a trailing genre suffix
  (`, kinematic|topology|study|stack`). That fixes the class, not just the one
  title. Witnessed by hand against the old title.
- One new browser guard has no spec: `[real] a run the study did not fold
  (skipped: only one P2 run is on disk)`, a skip arm that always pushes `true`.
  The same convention applies to the suite's other skip lines.

## Verification, as recorded

Every `[real]` and browser run read projections built **from this branch's
tree at `eaef7cb`** into `C:\workspace\tolstack\data\scratch\kinematic_units\`
(gitignored): a copy of `data/inbox`, `data/meshes` and `data/projections`,
with the topology, viewer, part-names, crops (drawing-checker's interpreter)
and kinematic projections rebuilt there. The freshness check paired them with
the tree. The main checkout's `data/` was not written to. The temporary
`docs`/`venv-win` junctions in that root, and the `node_modules` junction in the
worktree, are removed. The root holds only copied data and built projections:
delete it after review.

- `C:\workspace\tolstack\venv-win\Scripts\python.exe -m pytest -q` (worktree):
  **1 failed, 1529 passed, 1 skipped, 6:04**. The failure is the documented
  worktree-only `tests/test_viewer_js_suite.py` (no projection under the
  worktree's `data/`). Its tier ran directly, below. The skip is
  `test_fit_bound_features.py`'s re-extraction, which is not installed.
- `node apps/viewer/run_tests.cjs --repo <scratch>`: **546/546**, no tier skipped.
- `node apps/annotate/run_tests.cjs` (worktree): **206/206**.
- `node scripts/run_viewer_browser_tests.mjs --repo <scratch>`, full: **28/28
  suites**, 164 s. That includes `annotate sweep rail` 15/15 (2 new) and
  `kinematic study page` 10/10.
- `node scripts/run_mutation_witness_tests.mjs --repo <scratch> --only <spec>`
  for each of the six new specs: **6/6 WITNESSED** (2 fast, 1 annotate, 2
  browser, 1 python). The full registry was not run: it belongs to the batch
  merge (CLAUDE.md). Every existing spec whose file this branch touched still
  finds its snippet exactly once (scanned). Census now: fast 76/546, annotate
  61/206, browser 92/533 enrollable (565 declared).
- **Not run, and why:** the main checkout's own `pytest -q` after a rebuild,
  and the four node tiers from the main checkout. The main checkout is on
  `master` and does not carry this branch until the merge, so those runs belong
  to the review/batch merge, with `scripts/rebuild_projections.ps1` first.
