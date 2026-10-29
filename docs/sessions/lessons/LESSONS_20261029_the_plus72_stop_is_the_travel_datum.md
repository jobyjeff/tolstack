# LESSONS 2026-10-29 — the_plus72_stop_is_the_travel_datum

## What landed

- **A `study_ref` on the sweep's driver is a stop's x-interval, never a
  y-term.** `fold_at` folds the direct contributors (and any ref on a
  geometry parameter, still a per-point term) only. A driver ref must carry
  `applies_to` (stop ids). It is refused when that is missing, empty, names
  an unknown stop or lists one twice, and refused on a non-driver ref.
  `stop_offset` folds the leaves once at their own ratios in mm (the
  x-interval). `fold_at_stop` folds the direct terms plus the leaves at
  `|J| x` ratio (J at the stop) through the one `fold()`. `check_at_stop`
  reads that.
- **The datum is declared** (`datum: {stop, basis, note}` on the study) and
  refused at load unless the sweep's driver is exactly 0 at that stop.
- **A declared gap is a `study_ref` with `gap` + `title`** and no study
  behind it. It has no terms and no total, is never complete, sits on
  `gap_rows` (`edge: null, study: …`) and leaves every check at its stops
  incomplete. It is refused once the named study exists, so it cannot
  outlive the chain that closes it. Filed the authoring work:
  `ISSUE_20261029_the_feather_stop_is_not_anchored_to_the_blade_root_bores.md`.
- **Projection, per stop:** the top-level interval fields are the *swept*
  total (what the check and the readout use). `direct` is the envelope at the
  stop, `x_interval` (mm) is where the stop is, `driver_entry` is J, and
  `groups[]` carries offset groups with `x_offset: true` (and `gap`).
  `study_refs[]` carries `applies_to`, `gap` and `total: null` for a gap.
  `gap_count` is now `len(gap_rows)`.
- **Viewer:** `VA.kinematicTravelBands` reads `x_interval` / `direct` /
  `driver_entry`, with `d` = the direct half. So the parallelogram's top edge
  at the stop's x *is* the envelope's top there, and a zero interval draws
  nothing. `sharedBandNote` / `VA.kinematicSharedBands` are gone.
  `VA.kinematicDatumNote` + `datumNote` write the one line, with "the datum"
  linking the resolved issue. A declared-gap group renders as a gap row: no
  toggle, a gap chip whose card reads `gap_rows` by `study`, ranked after
  every row, and no DAG sub-stack.

## Before / after

| stop | envelope half (direct) | x-interval | swept worst / RSS | margin | verdict |
|---|---|---|---|---|---|
| −7° before | 1.707096 | (both stops) ±0.82 | 1.707096 / 0.984961 | −1.207 | marginal |
| −7° after | 0.290224 | ±0.82 / ±0.561605 mm | 1.707096 / 0.984961 | −1.207 | marginal |
| +72° before | 1.339412 | ±0.82 | 1.339412 / 0.721295 | −0.839 | marginal |
| +72° after | 0.315393 | 0 (datum) | 0.315393 / 0.168512 | +0.185 | pass |

J at −7° = −1.727892 deg/mm, so |J|·h = 1.416872. The swept −7° worst case
is that plus 0.290224, which is the same 1.707096 as before, by construction.

## The kink, measured on the old build

Read off the main checkout's projection (built from `8a2ae880`, the old
semantics) before anything here was rebuilt:

| stop | x (mm) | envelope half at x | parallelogram half at dx = 0 | step |
|---|---|---|---|---|
| −7° | 64.466 | 1.707096 | 0.290224 | 1.416872 |
| +72° | 0.000 | 1.339412 | 0.315393 | 1.024019 |

The step is exactly the group's reach, because the old `d` was defined as
`stop total − reach`. The envelope already held the travel term, and the
parallelogram drew it again on x. So the envelope dropped by the reach where
the band began and climbed back to the corner: one term drawn twice, not a
mechanism feature. After the change the browser tier measures the join on
the live page at dx 0.005 px, dy 1e-14 px.

## What the hub-anchor chain needs from the drawings

See the issue. In short: a `study/v0` chain along CAD Z from the blade-root
bearing bores (`hub_blade1_root_bearing_bore`) through the hub and the
actuator mount / cover to the feather end-stop face, in mm, with id
`vpa_pitch_linkage_hub_to_feather_stop` on `actuator.value`. The hub's axial
location of the root bores is the dimension to find first. The existing
`hub_blade_axis_offset` edge is the bore's offset from the spindle, which is
not the same thing. When it lands, delete `gap`/`title` from the contributor
(the loader insists).

## Decisions not in the handoff

- **"Swept" is first-order at the stop's own J.** Exactly the handoff's
  `|J|·h + direct half`, and the RSS is the sheared ellipse's top. It does
  not re-read the envelope at `x ± h`. The −7° band extends 0.82 mm past the
  sweep's last point, where there is no sweep to read.
- **A ref on a geometry parameter still folds at every point.** No document
  has one. The rule only moves driver refs, and it refuses `applies_to`
  anywhere else.
- **Stop words in the datum line come from `target` + units**
  ("+72 deg stop"), not the label ("+72 deg stop (high pitch)"). Using the
  label put two parentheticals in one sentence. The words come from data:
  `datum.basis`, the ref's title, the gap's `gap`.
- **The datum line is ~210 characters**, over the ~160 one-line budget. The
  handoff specified its three sentences, so I kept them. A reviewer may want
  the gap sentence behind the disclosure.
- **The stop's top-level fields went to the swept total rather than staying
  the point's.** Every reader of `stop.worst_case_half` (readouts, the
  column-group summary, the SVG label) meant "the stop's total" before, and
  still gets it. The envelope's value is `direct` (== `envelope[index]`).
- The `[real]` corner check compares three rounded projection figures with
  one. It is held to 5e-6, not 1e-9: the projection rounds to six places.

## Gotchas

- `node_modules` is not in a worktree. The browser runner needs a junction
  (`mklink /J <worktree>\node_modules C:\workspace\tolstack\node_modules`).
  It is gitignored, so it is not dirt.
- drawing-checker's interpreter is `venv-win`, not `.venv`.
- The fast-tier DOM shim has no descendant selectors (`"tbody tr"` finds
  nothing). The lesson of 10-28 said so too, and I hit it anyway.
- The chart's pixel `bands[]` objects carry no `direct`. Read it off
  `VA.kinematicTravelBands`.
- The mutation-witness shadow-concurrency tests failed once when I ran
  `--unenrolled` at the same moment, then passed alone (4/4). Do not run the
  witness runner while `pytest` is running.

## Found on arrival

Nothing: the worktree was clean. The main checkout was touched only under
gitignored `data/scratch/plus72/` (removed at hand-back) and through the
read-only junctions into it.
