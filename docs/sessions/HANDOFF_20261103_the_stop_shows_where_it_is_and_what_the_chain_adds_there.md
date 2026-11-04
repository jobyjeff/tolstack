---
priority: med
depends_on: []
model: sonnet
hitl: false
---

# HANDOFF 2026-11-03 — the_stop_shows_where_it_is_and_what_the_chain_adds_there: a stop's position uncertainty is drawn as where the stop can be, not as a fan, and the readout splits the two terms

Source: Jeff's forge note `20261102T160334_ozaumx` → `20261103T165357_43vf96`:
*"tolstack study for kinematic study seems incorrect. We changed the index
location to be the 72 deg feather end stop, and the pitch uncertainty changed
dramatically (it went from greater than +/-1 deg to less than 0.5 deg). The
jagged region of the plot I noted last time just moved to the -7 deg side
rather than being on both sides, and that jagged region is apparently where
the flat side max envelope (-1.207) is coming from."* His screenshot
(`C:\workspace\forge\data\inbox\atomic-notes\attachments\20261102T160334_ozaumx\paste-20261102T160240.png`)
shows the −7° band as a steep sheared parallelogram past the sweep's last
point, reading as a drawing fault.

The strategy session checked the numbers (2026-11-03, against
`docs/sessions/lessons/LESSONS_20261029_the_plus72_stop_is_the_travel_datum.md`
and `data/projections/viewer/kinematic/kinematic_studies.json`): **the −7°
verdict is by construction and unchanged** — swept worst case 1.707096° before
and after the datum change; margin −1.207 against ±0.500. It is
`|J|·h + direct` = 1.7279 deg/mm × 0.82 mm + 0.290 = 1.417 + 0.290. The 0.82 mm
is the travel-between-end-stops stack (mount flange-to-end-stop 8.667 ±0.5 =
61% of it; upper piston head ±0.25 = 30%; both `traced` to drawings). So the
plot is *right* and *unreadable*: the fan is the stop's x-uncertainty sheared
by J, and nothing on the page says "the stop can be anywhere in this 1.64 mm
window, and the pitch there varies by ±1.42°". Jeff's physical question (is
±0.5 on 213668-002 the drawing's band; is the −7° stop the cover shoulder
through that stack) goes to him in the strategy handoff, not here.

Baseline: `master` with `the_plus72_stop_is_the_travel_datum` landed. Scope:
`apps/viewer/views/kinematic.js` — the chart (`VA.kinematicTravelBands` ~673,
the polygons at ~1217 `kmchart__worst` / `kmchart__rss`, the stop readouts,
`VA.kinematicDatumNote` / `datumNote`), its CSS, `apps/viewer/tests.js`, the
browser checks. Do NOT touch the results table (`renderKinematicResults` and
below — owned this batch by `the_kinematic_grid_is_a_stack_of_sub_stacks`),
the fold (`tolerance_stack/`), or the projection's numbers.

## Deliverables

1. **The stop's position is drawn as a window on x.** At a stop whose
   `x_interval` is non-zero, draw a shaded vertical **x-window** of width 2h
   centred on the stop's x, spanning the plot height at low opacity, with a
   horizontal error bar on the stop marker at y = 0 (whiskers at x ± h) and
   the label `stop position ±0.82 mm` beside it. Inside the window the worst
   and RSS bands continue as the **swept envelope**: the band's half-width at
   each x in the window is the direct half at the stop plus |J|·|dx|, drawn
   as a band that widens linearly toward the stop's far edge — a wedge whose
   top edge is the same line the parallelogram drew, but filled as a band and
   bounded by the window, not a free polygon. No vertex of any shape lies
   outside the window or past the plot frame. The +72° datum stop (interval
   zero) draws no window, as today.
2. **The readout says both terms.** Each stop's readout line splits the
   margin's worst case into `where the stop is` (|J|·h, with h in mm) and
   `what the chain adds there` (the direct half), e.g.
   `−7 deg stop · worst 1.707 = 1.417 (stop position ±0.82 mm × 1.73 deg/mm) + 0.290 (chain)`,
   reader words, numbers to three decimals, units on every number.
   Hover on the stop-position term names the sub-stack and its largest row
   (mount flange-to-end-stop ±0.5, 61%).
3. **The datum line fits one line.** `VA.kinematicDatumNote` keeps the first
   sentence (which stop is the datum and its basis) visible; the band-width
   sentence is now on the chart (deliverable 1) and the gap sentence is the
   gap row's chip — both move behind a disclosure, per
   `docs/issues/ISSUE_20261029_design_the_kinematic_datum_line_is_over_the_one_line_prose_budget.md`
   (resolve it here). ≤160 characters visible.
4. **A legend line under the chart** names the three marks once: swept
   envelope (worst), RSS, stop position window. Words only, no paragraph.

## Definition of done

- `http://127.0.0.1:8000/tolstack/viewer/` → Kinematic studies → Blade pitch
  at the end stops: at −7° the chart shows the shaded window with its error
  bar and label, the swept band inside it, nothing past the frame; at +72°
  no window; the readouts carry both terms; the datum line is one line.
  Screenshot at 1600×1000 in the lesson, side by side with Jeff's.
- `node apps/viewer/run_tests.cjs` green with value-level pins on the live
  study: window width = 1.64 mm in plot units, error-bar whiskers at
  x ± 0.82, readout text for both stops, datum line length ≤ 160;
  `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack --only kinematic`
  green with the 10-29 join check (dx 0.005 px) still holding at the window's
  inner edge; `node scripts/run_mutation_witness_tests.mjs --changed-since integration`
  witnesses the new guards.
- Issue routed here: `ISSUE_20261029_design_the_kinematic_datum_line_is_over_the_one_line_prose_budget.md`
  (`triaged` + `handoff:` first, `resolved` after).
- Lesson (`docs/sessions/lessons/LESSONS_20261103_the_stop_shows_where_it_is_and_what_the_chain_adds_there.md`):
  the geometry of the window vs the old parallelogram in one table; the two
  readout terms for both stops on the live study.
