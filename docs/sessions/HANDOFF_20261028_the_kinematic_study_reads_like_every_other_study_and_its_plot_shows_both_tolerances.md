---
priority: high
depends_on: [the_scene_pane_is_one_flyout_that_reads_over_http]
model: opus
hitl: false
---

# HANDOFF 2026-10-28 — the_kinematic_study_reads_like_every_other_study_and_its_plot_shows_both_tolerances: results move to the right-hand pane, and the swept plot shows the travel band along x

Source: Jeff's 2026-10-28 review ("vertical screen real estate is precious …
the kinematic study results should use this same [right-hand details] pane
… the kinematic study display and standard display haven't been fully
unified yet"; "both the X and Y axis of the plot have tolerance ranges, the
plot should reflect this (it will look more like a volume/manifold) …
Travel between End Stops is listed as the first contributor, but isn't
taken into account in the plot"). Measured the same day against
`data/projections/viewer/kinematic/kinematic_studies.json` (built 2026-10-28
00:40). Baseline: `master` with `the_scene_pane_is_one_flyout_that_reads_over_http`
merged (so `topology_app.js` and `topology.css` are quiet). Scope:
`apps/viewer/views/kinematic.js` (`renderKinematicHead` ~:784–811,
`renderKinematic` ~:813–835, `kinematicChart` ~:657–745, `chartFigure`
~:887–1003), `apps/viewer/topology_app.js` `paint()` (~:2060–2271, the
kinematic branch and `renderTopoDetail` call ~:2243; `syncSceneColumn`'s
`flyout-replaces-detail`), `apps/viewer/topology.css` (`.tv__scroll--bounded`
~:1445, `body.flyout-replaces-detail` ~:1193–1196, `#detail`), `tests.js`,
the browser spec at ~:9183–9194 and `testKinematicStudyPage`. Do NOT touch
`tolerance_stack/kinematic.py` numbers, the lit-set code, or
`apps/annotate/`.

## What is true today

**Layout.** `paint()` puts the title + verdict chips (`verdictStrip`) in
`#kinematichead` above the toolbar; the DAG in `#topopane`, bounded to
`max-height: 50vh`; and `renderKinematic` puts the driver line, the chart,
the contributor table and the provenance in `#kinematicview` **below** the
DAG — all inside `.tv__main`. The right-hand `#detail` pane is only the
selection preview (`VA.renderTopoDetail`) on topology and kinematic pages,
and **with the scene open it is hidden on every non-stack page**
(`body.flyout-replaces-detail`, `syncSceneColumn`). A chain study's verdicts
live in `#totals` at the foot of its grid. Browser spec ~:9183–9194 pins
"head < DAG < chart, with the preview pane beside it".

**The plot.** `kinematicChart` sets x0/x1 to min/max of
`envelope[].driver_value` — the swept **nominal** range 0 → 64.466 mm (P2
runs 64.466 → 0). y is deviation from nominal, symmetric at 1.15 × max(|worst
case|, limit). Drawn: worst-case and RSS polygons, zero line, limit lines, a
vertical line at each stop's `driver_value`, hover strips.

**The travel term IS in the numbers — Jeff's "isn't taken into account" is
true of the plot only.** `tolerance_stack/kinematic.py`: `fold_at` (~:1130)
builds one Term per contributor; `study_ref_group` (~:1096) adds each travel
leaf as its own Term with sign(J)×own sign and coefficient |J|×own ratio —
the chain rule in the one `fold()`; `check_at_stop` (~:1164) folds limit
against stop total. Measured:

| stop | driver (mm) | J (deg/mm) | travel group reach (deg) | direct contributors (deg) | worst-case half | margin vs ±0.5 |
|---|---|---|---|---|---|---|
| −7° (point 0) | 64.466 | −1.728 | 1.417 | 0.290 | 1.707 | −1.207 |
| +72° (point 79) | 0.0 | −1.249 | 1.024 | 0.315 | 1.339 | −0.839 |

The travel study's total is 63.62–65.26 mm (nominal 64.44, worst-case half
0.82) — `docs/topologies/study_vpa_pitch_linkage_travel_between_end_stops.json`.
So the travel term dominates both margins (filed as
`docs/issues/ISSUE_20261027_the_travel_term_dominates_the_blade_pitch_budget…`).
Two facts for the lesson, not for silent fixing: (a) **both** stops carry
the full ±0.82 mm travel band — if the +72° stop (driver 0) is the datum
from which travel is measured, physically only the far stop moves, and the
current fold may double-count; (b) the travel study's nominal 64.44 is not
the sweep's stop driver 64.466. Surface both on the page (deliverable 3)
and in the lesson for Jeff's ruling; do not change the fold here.

Data available to the chart without new Python: `study_refs[].entries[]` (J
at every point), `study_refs[].total{worst_case_min/max/half, rss_half…}`,
`stops[].groups[].reach`, `stops[].rows[]`, `contributors[].by_point[]`.

## Deliverables

1. **One page shape for every study kind.** The kinematic study's results —
   verdict chips, the swept plot, the stop readouts (driver, nominal
   measure, worst-case/RSS half, margin per stop) and the provenance line —
   render in the right-hand `#detail` pane, above the selection preview. The
   DAG + contributor table keep `.tv__main` and the DAG loses its 50vh bound
   (the previous handoffs made it zoomable/fittable). `#detail` is **never
   hidden by the scene**: retire `flyout-replaces-detail`; the row is nav |
   scene | model+grid | detail, with the detail divider (`#detail-divider`)
   setting the pane's width and a stored default wide enough for the chart
   (measure; ~420 px is the floor). Stack pages keep their `#totals` at the
   grid foot and *also* show the verdict chips in `#detail` so the two kinds
   read alike — the chip is the same component.
2. **The plot shows both tolerances.** For a stop whose position carries a
   travel band, draw the stop as a **vertical band** on x (driver ±
   worst-case half of the travel study, RSS half as an inner band) and
   extend the worst-case / RSS envelope across that band using the local
   Jacobian at the stop (`entries[index]`): at the band's far edge the pitch
   deviation is the direct half ± |J| × Δx, so the region's corner equals
   the stop's folded worst-case half (1.707° at −7°) — assert that identity
   in a test; the chips and the plot then say the same number. Label the
   band once ("travel between end stops 63.62–65.26 mm") and keep the
   nominal-sweep curves inside it as today. Which stops get a band is read
   from the data (a stop with a `groups[]` entry from the travel study), not
   hard-coded — and the page says, in one short line under the chart, that
   both stops currently carry the band (fact (a) above) with a link to the
   issue.
3. **Honest axis notes.** The x axis reads "actuator travel, mm (swept
   0–64.466; travel study nominal 64.44)" when the two nominals differ;
   drop the clause when they agree.

Design rules: `docs/DESIGN_TYPE_AND_COLOUR.md`; tabular readouts, no prose
blocks; the chart's new band uses the existing worst-case/RSS fills at
reduced alpha.

## Definition of done

- Real kinematic page: results in the right pane with the scene open and
  closed; DAG unbounded and fitted; the plot's −7° stop drawn as a band
  whose far-edge envelope corner = 1.707° (value-level test from the
  projection); the +72° stop band present and the one-line note shown.
- Browser spec ~:9183–9194 rewritten to the new order (DAG+grid in main,
  results in `#detail`, `#detail` visible with the scene open); `tests.js`
  ~:11601–11605, 12331, 12357 updated; new value-level tests on the band
  geometry.
- All four main-checkout tiers green after a projection rebuild; `pytest -q`
  green.
- Lesson (`docs/sessions/lessons/LESSONS_20261028_the_kinematic_study_reads_like_every_other_study_and_its_plot_shows_both_tolerances.md`):
  the datum question (which stop should carry the travel band, with the
  physical argument) and the 64.44 vs 64.466 mismatch, each as a question
  for Jeff with the numbers; the detail-pane width measurements.
