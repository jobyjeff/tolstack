---
priority: high
depends_on: []
model: opus
hitl: false
---

# HANDOFF 2026-11-03 — each_stop_is_its_own_stack: a stop's blade pitch is a stack of its own — the linkage terms at that pose plus the axial chain to its contact face — and the chart draws stops as error bars, never as a swept wedge

Source: Jeff, 2026-11-03, on the live chart (the −7° band fanning out past the
last sweep point): *"it doesn't seem possible to even define the X-axis when
that dimension itself is subject to tolerances … If you start with the geometry
at CAD nominal, against the feather hard stop, and then you reduce the piston
head thickness, the pitch system can move even farther towards feather … your
blade pitch is >72deg, which isn't even within the nominal pitch range, so it's
not even clear what blade pitch corresponds to 'zero error' … there are two
independent variables: the housing end stop width and the piston end stop
thickness … report the range of actual possible blade pitches at each
[stop]. Then your final output is the range of total pitch ranges (something
like 70-74deg) … if the hub (blade root bore to tan link mount surface) or tan
link mount 'thickness' changes, then both housing end stops move the same
amount … Because we agreed that the hard datum was the feather end stops
contacting, all of that should fall out of the kinematic tolerance stack."*
And on mock-up C: *"that is what a kinematic study resolves to. Assuming it
fits in a 2d grid like that such that it is as simple as summing the final
column (sensitivity x value for each contributor)."*

**This supersedes the 2026-10-29 ruling** encoded by
`the_plus72_stop_is_the_travel_datum` (a driver `study_ref` is an x-uncertainty
of the −7° stop only; the datum stop has `x_interval` 0). That rule put all
four travel terms at the −7° stop and none at +72°, which is physically wrong
for the two piston heads: at the feather contact the lower head's bottom face
is on the mount's end-stop surface and the plate sits lower + upper + c above
it, so a head tolerance moves the plate **at the feather stop**. The mount
thickness and the cover move the plate at the **low** stop. The hub-to-mount
chain moves both. The old "pass +0.185" at +72° was the datum rule hiding the
feather stop's own position band.

Baseline: `master` with `the_plus72_stop_is_the_travel_datum` (10-29)
landed. Scope: `tolerance_stack/kinematic.py` (the stop fold: `fold_at`,
`stop_offset`, `fold_at_stop`, `check_at_stop`, `StudyRef.applies_to`, the
`datum` loader), `docs/topologies/kinematic_study_vpa_pitch_linkage_blade_pitch_at_the_stops.json`
and two new axial-position studies, the kinematic projection builder, the
chart and stop readouts in `apps/viewer/views/kinematic.js`
(`VA.kinematicTravelBands` ~673, the polygons ~1217, `VA.kinematicDatumNote`),
`docs/DAG_TOPOLOGY.md` (the datum rule, ~858–871), tests and browser checks.
Do NOT restructure the results table (owned by
`the_kinematic_grid_is_a_stack_of_sub_stacks`, which depends on this handoff
and reads the per-stop groups you emit) and do not touch `apps/annotate/`.

## The model (the ruling, in the fold's terms)

1. **The datum is a contact pose, not a zero-error point.** `datum.stop`
   keeps one meaning only: the pose where the sweep's driver is 0 (feather
   contact, as nominal CAD models it). It no longer zeroes anything.
2. **Every stop has an axial position stack.** For stop S, the plate's axial
   position at contact is a linear chain in mm from the ground (today: the
   hub's tan-link mount face, with the blade-root-bore gap declared in front
   of it) to the plate attachment, through S's contact faces:
   - **+72° (feather) stop** — tan link mount height
     (`tan_link_mount_overall_height`, 0 ±0.1) → mount seat
     (`gas_spring_mount_position`, 0 ±0.1) → mount datum A to end-stop
     surface (`gas_spring_mount_datum_a_to_end_stop`, 76.86 ±0.1) → lower
     head (`piston_head_lower_thickness`, 2.491 ±0.05) → upper head
     (`piston_head_upper_thickness`, 6.556 ±0.25) → step face to plate (a
     constant of the piston body `gas_spring_piston_214700_002`; author it
     from its drawing or declare it a gap — never invent it).
   - **−7° (low) stop** — the same ground chain → mount datum A to end-stop
     surface → cover flange seat (`gas_spring_mount_flange_to_end_stop`,
     8.667 ±0.5, sign per the face order) → cover flange to shoulder
     (`piston_cover_flange_to_end_stop`, 82.154 ±0.02) → step face to plate
     (the same constant).
   Face order and signs: `docs/tolerance_stacks/WORKSHEET_gas_spring_end_stop_travel.md`
   is the one statement; read it before assigning a sign. Author these as
   two `study/v0` chains in `docs/topologies/`
   (`vpa_pitch_linkage_feather_stop_axial_position`,
   `vpa_pitch_linkage_low_stop_axial_position`); the existing
   `vpa_pitch_linkage_travel_between_end_stops` stays as the derived stroke
   for S461-617 and is no longer a contributor of this study.
3. **Each stop's pitch band = linkage terms at that pose + its axial stack
   through J there.** `fold_at_stop(S)` folds the direct contributors at S's
   sweep point (as today) plus each term of S's axial stack at ratio |J(S)|
   (first order; J at the stop's nominal driver value — record in the lesson
   how much J changes over the stack's half-width, to show first order is
   enough). The blade-root-bore gap stays a declared gap on both stops. The
   `applies_to` word goes from "which stops a travel ref moves" to the study
   field that names each stop's axial stack; refuse a stop with no stack.
4. **Three result rows.** Pitch at the feather stop (nominal 72.0 from the
   sweep, ± worst, ± RSS, vs S461-607 ±0.5), pitch at the low stop (−7.0, the
   same), and **total pitch range** = feather − low: 79.0 ± the fold of the
   terms that *differ* between the stacks (shared ground terms enter with
   J(+72) − J(−7), so they nearly cancel; state the residual). Jeff's "70–74"
   is this row's reader.
5. **No `x_interval`, no swept band.** The projection's per-stop block drops
   `x_interval`/`direct`-as-envelope and carries `groups[]` = the linkage
   terms group and the axial stack group (each child with `coefficient`,
   `magnitude`, `confidence`), plus `shared_with_other_stop: true` on the
   ground terms.

## Deliverables

1. The fold, loader and projection per the model above; the old driver-ref
   `applies_to` form is refused with a message naming this handoff.
2. The two axial-position studies authored and cited (every band a drawing's
   or a gap; the step-face-to-plate constant found or declared).
3. **The chart**: x = the nominal actuator position; the envelope along it
   is the **linkage terms only** (valid at each nominal x); each stop is a
   **point at its nominal x with a vertical error bar** (worst case, with the
   RSS as a heavier inner bar) and its three-decimal pitch beside it; the
   total-range row drawn as a bracket between the two bars in the margin, or
   as text under the chart. No polygon extends past the sweep's last point.
   The datum line becomes one line: which stop the sweep's zero is, nothing
   else (resolves
   `ISSUE_20261029_design_the_kinematic_datum_line_is_over_the_one_line_prose_budget.md`).
4. **The readouts** say, per stop, `worst ±a = ±b (linkage at this pose) + ±c (stop position, n terms)`,
   reader words; the range row says what cancelled.
5. **`docs/DAG_TOPOLOGY.md`** rewrites the datum paragraph (~858–871) to the
   model above in one paragraph, and the 10-29 lesson's rule is marked
   superseded there with the date.

## Definition of done

- `venv-win/Scripts/python.exe -m pytest -q` green; value-level pins on the
  live study for both stops' worst/RSS halves, the three result rows, and
  the refusal of the old `applies_to` form. Record the before/after table
  (10-29 figures: −7° 1.707 / +72° 0.315) in the lesson.
- `http://127.0.0.1:8000/tolstack/viewer/` → Kinematic studies → Blade pitch
  at the end stops: the chart shows two error bars and no wedge; the
  readouts carry both terms; a total-range row exists. Screenshot in the
  lesson beside Jeff's.
- `node apps/viewer/run_tests.cjs`, `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack --only kinematic`,
  `node scripts/run_mutation_witness_tests.mjs --changed-since integration`
  green; projections rebuilt before the tiers (`scripts/rebuild_projections.ps1`).
- Lesson (`docs/sessions/lessons/LESSONS_20261103_each_stop_is_its_own_stack.md`):
  the per-stop stacks with signs and sources; the before/after table; the
  J-variation check; what the step-face-to-plate constant turned out to be
  (or the gap filed); the residual on the range row.
