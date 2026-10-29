---
priority: high
depends_on: []
model: opus
hitl: false
---

# HANDOFF 2026-10-29 — the_plus72_stop_is_the_travel_datum: the stop-to-stop travel is an x-uncertainty of the −7° stop, the +72° stop is the datum, and the band is continuous

Source: Jeff's ruling and follow-up question, 2026-10-29 strategy session
(`dispatch/docs/strategy/HANDOFF_20261029_strategy.md`), on the open question
the plot handoff surfaced (`the_kinematic_study_reads_like_every_other_study_and_its_plot_shows_both_tolerances`,
landed 2026-10-29; its lesson's "Questions for Jeff" and
`docs/issues/ISSUE_20261028_both_end_stops_carry_the_full_travel_band.md`).
Jeff: *"for now let's make the 72deg feather hard stop the datum, since that's
where the propeller is at rest when the gas spring is charged (and what is
modeled in nominal CAD)."* and, on the jagged ends of the plot: *"either 0mm of
travel corresponds to the worst case … or 0mm is the end stop at CAD nominal and
the x-axis may go negative. That seems more correct but I think is what is
already modeled, which results in the kinks."* Baseline: `master` 2026-10-29.
Scope: `docs/topologies/kinematic_study_vpa_pitch_linkage_blade_pitch_at_the_stops.json`,
`tolerance_stack/kinematic.py` (`_load_study_ref`, `fold_at`, `envelope`,
`check_at_stop`), `scripts/build_kinematic_projection.py`,
`apps/viewer/views/kinematic.js` (`VA.kinematicTravelBands`, the datum note),
`apps/viewer/tests.js` (the kinematic checks, ~line 12890), `tests/test_kinematic.py`,
`docs/DAG_TOPOLOGY.md` (kinematic section). Do NOT touch
`apps/viewer/views/topology.js`, `topology_app.js` or the annotator — owned by
the other handoffs staged from Jeff's 2026-10-29 note.

## What is wrong today (measured from the code, 2026-10-29)

1. The travel study (`vpa_pitch_linkage_travel_between_end_stops`, entered as
   a `study_ref` on `actuator.value`) is folded into the **y-band at every
   sweep point** (`fold_at` adds the group's children terms, scaled by that
   point's J) **and** drawn again as the **x-parallelogram at each stop**
   (`VA.kinematicTravelBands`: `y = J·dx ± d`, `d = stop total − group reach`).
   The envelope's half-width at the stop is the stop total (direct + travel
   reach) while the parallelogram's half-width at `dx = 0` is `total − reach`,
   so where they meet the band steps down by the reach and then widens back to
   the corner. **Those are the kinks.** They are a drawing of one term twice,
   not a mechanism singularity. The "corner identity" (1.707096° at −7°,
   1.339412° at +72°) holds because `d` was defined to make it hold.
2. The travel band is applied at **both** stops as if each stop could sit
   anywhere within ±0.82 mm independently. The stop-to-stop distance is one
   dimension; it moves one stop relative to the other.
3. **Neither stop is anchored to the hub.** No chain in the model runs from the
   blade-root bores (the hub datum the blade angle is physically indexed to)
   to either end stop; the travel study is stop-to-stop only. So "where is the
   +72° stop relative to the blades" has no band at all today — Jeff's remark
   that the stops' nominal locations are indexed to the blade-root bores names
   a **gap**, not something already modelled.

## Decisions (made; implement, do not re-open)

- **The +72° (feather) stop is the datum** of the driver axis: `x = 0` there, as
  the sweep already measures it (S461-610/636, full extension, gas spring
  charged, nominal CAD). Jeff's second reading is the right one.
- **A `study_ref` on the driver is an x-uncertainty of a stop, never a y-term
  of the envelope.** The envelope at every sweep point folds the **direct
  contributors only**. A driver study_ref carries `applies_to: ["minus7"]`
  (stop ids from `stops[]`; the field is required for a driver study_ref so
  the ambiguity cannot recur) and contributes, at that stop, an x-interval
  `x_stop ± h` (`h` = the ref's worst-case half; RSS half for the RSS figure).
  The stop's verdict = the envelope **swept over that x-interval**: worst case
  is the envelope's upper edge at the corner (`|J|·h` + direct half, the same
  1.707° at −7° as today, by construction), RSS is the sheared ellipse already
  drawn. The +72° stop carries no travel term: its worst case becomes the
  direct 0.315°, margin **+0.185** (PASS), as the 10-28 lesson computed.
- **The band is continuous.** The parallelogram/ellipse at the −7° stop starts
  at the envelope's own half-width (direct only) and widens with `|J·dx|`; no
  step where it joins. The x axis extends past 64.466 by `h` at the −7° end
  only, and goes **negative at the +72° end by exactly the anchor
  half-width — which is zero today** (next bullet), so nothing is drawn there
  until the anchor exists.
- **The hub anchor is declared as a gap, not invented.** Add to the study a
  second driver contributor, `hub_to_feather_stop` (working name), a
  `study_ref` to a chain study that does not exist yet, `applies_to:
  ["plus72", "minus7"]` (an anchor error moves both stops together), with the
  study marked incomplete so the gap list and the verdict strip show it the
  way every other untraced term is shown (`check.complete = false`, the reason
  naming the missing chain). The sweep's `frame` text already says the
  assembly frame is "CAD Z = the spindle axis, CAD X = blade 1's pitch axis",
  so the chain is: blade-root bearing bores → hub → actuator mount / cover →
  feather end-stop face. **Do not author its dimensions** — that is a later
  authoring session with the drawings; this handoff makes the hole visible.
  Record Jeff's words in the study's `notes`: *"the nominal location of both
  end stops is really indexed relative to the blade root bores, since
  shifting those features relative to each other along the z-axis actually
  shifts the blade angle."*
- **The datum note changes, it does not disappear.** Under the plot: "The +72°
  stop is the datum (at rest, gas spring charged; nominal CAD). The −7° stop
  carries the stop-to-stop travel band (±0.82 mm). Neither stop is yet
  anchored to the blade-root bores — a declared gap." `VA.KINEMATIC_TRAVEL_DATUM_ISSUE`
  points at the resolved issue, which records the ruling.
- **64.440 vs 64.466**: unchanged, the axis note stays.

## Deliverables

1. `tolerance_stack/kinematic.py`: a driver `study_ref` is excluded from
   `fold_at`'s per-point terms and becomes `StopOffset` (x-interval) data on the
   study; `check_at_stop` sweeps the envelope over it; `applies_to` parsed and
   refused when it names an unknown stop or is missing on a driver ref.
2. The projection carries, per stop, `x_interval` (worst-case and RSS halves)
   and the swept worst case / RSS; the per-point `interval` is direct-only.
3. `kinematic.js`: the band reads the new fields, joins continuously, draws no
   extension where the interval is zero; the note as above; the stops table
   reads the swept numbers.
4. The anchor gap contributor in the study JSON, surfaced as incomplete.
5. `docs/DAG_TOPOLOGY.md` kinematic section: one paragraph on
   x-uncertainty vs y-term and the datum rule.
6. `docs/issues/ISSUE_20261028_both_end_stops_carry_the_full_travel_band.md`
   → `status: resolved`, resolution naming this handoff and the ruling.

## Definition of done

- `scripts/rebuild_projections.ps1` then the kinematic page (hosted through
  drawing-checker at `http://127.0.0.1:8000/tolstack/apps/viewer/`, study
  `vpa_pitch_linkage_blade_pitch_at_the_stops`): stops table reads −7° worst
  case ±1.707 (unchanged) and +72° ±0.315 PASS; the band has no step at either
  end (assert at value level in the browser tier: the band's half-width at the
  −7° stop's x equals the direct half there); the gap list names the hub anchor.
- `PYTHONIOENCODING=utf-8 venv-win/Scripts/python.exe -m pytest -q` green with
  value-level tests: driver ref excluded from per-point terms; `applies_to`
  refusal; swept worst case equals `|J|·h` + direct half at the −7° stop;
  +72° margin +0.185. `node scripts/run_viewer_browser_tests.mjs --only
  kinematic` green; `node scripts/run_mutation_witness_tests.mjs --changed-since
  integration` clean (the corner-identity witness is re-anchored to the swept
  number).
- Lesson: before/after numbers at both stops; the exact kink geometry measured
  on the old build (half-width at x = 64.466 from the envelope vs the
  parallelogram) so the cause is on record; what the hub-anchor chain needs
  from the drawings.
