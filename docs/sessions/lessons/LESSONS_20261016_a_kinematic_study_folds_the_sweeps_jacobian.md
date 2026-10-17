# LESSONS 2026-10-16 — a_kinematic_study_folds_the_sweeps_jacobian

The first tolerance study over the kinematic model: a
`joby.tolerance_stack/kinematic_study/v0` document that names linkage run P2,
folds its Jacobian through the one `fold()` per sweep point, and checks the
two end stops against S461-607. Code: `tolerance_stack/kinematic.py`,
`scripts/build_kinematic_projection.py`, `tests/test_kinematic.py`. Plot:
`shots_20261016_a_kinematic_study_folds_the_sweeps_jacobian/vpa_pitch_linkage_blade_pitch_at_the_stops.svg`.

## The numbers (P2, `vpa-pitch-p2-20261015-013931`)

Built from this worktree with `--data-root C:/workspace/tolstack/data`.
Pinned to three decimals by `tests/test_kinematic.py::test_real_the_first_study_pins_both_stops_against_p2`.
Every band is about 0.0, so each interval is the deviation from the nominal.

| stop | point (found by value) | driver | nominal blade pitch | worst case | RSS | gap rows | S461-607 (±0.5°) |
|---|---|---|---|---|---|---|---|
| −7° | index 0 | 64.466 mm | −6.992° | ±0.244° | ±0.165° | 2 | pass, **budget**, margin 0.256° |
| +72° | index 79 | 0.000 mm | 72.001° | ±0.242° | ±0.159° | 2 | pass, **budget**, margin 0.258° |

Ranked contributor table at −7° (coefficient in deg/mm, magnitude =
coefficient × half-band, deg):

| rank | contributor (vpa_pitch_linkage edge) | zone | sign | coefficient | band | magnitude | confidence |
|---|---|---|---|---|---|---|---|
| 1 | `pitch_plate_attach_height` | band, plate point Z | −1 | 1.555 | ±0.1 | 0.156 | drawing, traced |
| 2 | `pitch_link_length` | band | +1 | 1.574 | ±0.03 | 0.047 | workbook, untraced |
| 3 | `pitch_arm_radius` | sphere, blade point | +1 | 1.574 | r 0.015 | 0.024 | workbook, untraced |
| 4 | `tan_link_mount_height` | band, base point Z | +1 | 0.172 | ±0.1 | 0.017 | drawing, traced |
| — | `tan_link_length` | band | — | 0.311 | **gap** | — | — |
| — | `pitch_plate_tan_link_attach_radius` | sphere | — | 0.311 | **gap** | — | — |

At +72°:

| rank | contributor | zone | sign | coefficient | band | magnitude | confidence |
|---|---|---|---|---|---|---|---|
| 1 | `pitch_plate_attach_height` | band | −1 | 1.489 | ±0.1 | 0.149 | drawing, traced |
| 2 | `pitch_link_length` | band | +1 | 1.542 | ±0.03 | 0.046 | workbook, untraced |
| 3 | `tan_link_mount_height` | band | **−1** | 0.241 | ±0.1 | 0.024 | drawing, traced |
| 4 | `pitch_arm_radius` | sphere | +1 | 1.542 | r 0.015 | 0.023 | workbook, untraced |
| — | `tan_link_length` | band | — | 0.487 | **gap** | — | — |
| — | `pitch_plate_tan_link_attach_radius` | sphere | — | 0.487 | **gap** | — | — |

**What dominates:** the pitch plate's link-hole height (`pitch_plate_flange_to_link_hole`,
±0.1, the one *traced* drawing band among the large ones), at about two thirds
of the worst case at both stops. It is large for a plain reason: the plate
slides along the spindle axis, and a link hole that sits 0.1 mm high is the
same as 0.1 mm of actuator travel (its coefficient is nearly the motion ratio).
The next, the pitch-link length, is a third of it because its band is a third.

**Did the spheres change any ranking against a band-only reading?** No. The
blade-side pitch-link point's Jacobian is almost all along one component (Z at
−7°, Y at +72°). So a sphere's norm and the largest single component differ in
the fourth significant figure, and `pitch_arm_radius` ranks the same under
either reading. One thing worth knowing: that norm equals the pitch-link-length
coefficient to 1e-14 at both stops. To first order, moving the blade-side
joint centre matters only along the link's own direction. So a positional
tolerance there is worth exactly a length tolerance of the same size. The
sweep's numbers say so; this repo did not derive it.

`tan_link_mount_height` changes sign across the sweep (+ at −7°, − at +72°).
It is the one contributor whose direction a fixed authored transform would
have got wrong at one of the two ends.

**Gap rows:** the two tangential-link contributors have no band anywhere
(`ISSUE_20261016_two_tangential_link_contributors_have_a_sensitivity_and_no_cited_band.md`).
Both have a real sensitivity, and it is larger at +72° (0.487 deg/mm) than at
−7° (0.311). A ±0.1 band on either would rank second at +72°.

## Which `pitch_system` edge each contributor borrowed, and why

Each contributor's `note` in the study carries its argument. In short:

- `pitch_link_length` ← `pitch_system/pitch_link_length`. The same physical
  length, named hole-to-hole there and sphere-centre to sphere-centre here.
- `pitch_arm_radius` ← `pitch_system/pitch_arm_link_hole_to_clocking_hole`.
  This is where the arm puts the link's blade-side joint centre. pitch_system
  carries it as a tangential tolerance with its own rotary transform. Here the
  same ±0.015 is read as a **position zone of that radius**, the worst-azimuth
  reading of a positional tolerance. This is the most judgement-laden pairing:
  if the drawing turns out to control only the tangential direction, it should
  become a `band` on the one component along that direction.
- `pitch_plate_attach_height` ← `pitch_system/pitch_plate_flange_to_link_hole`.
  This is the axial height of the plate's link hole. It perturbs only Z of the
  plate-side point, so the radius half (`pitch_plate_attach_radius`) stays
  unbanded and is not a contributor.
- `tan_link_mount_height` ← `pitch_system/tan_link_mount_height`. Same name,
  same axial quantity; it perturbs only Z of the base-side point.

None of the handoff's pairings was wrong on inspection; all four are as
staged.

> **Review correction, 2026-10-16.** One of the four is narrower than its
> callout. `pitch_plate_flange_to_link_hole` cites `⌖Ø0.2`, a diametral
> position zone. Its own `source_ref.note` says the same callout also serves
> the tangential row, and P2 gives that point a real tangential sensitivity.
> The effect is under 0.006° and no verdict changes. See
> `docs/issues/ISSUE_20261016_a_kinematic_contributor_reads_a_diametral_position_zone_as_a_one_axis_band.md`.

## Which end is which (`point_a` / `point_b`)

**The handoff said the artifact's `mechanism` block lists each joint's two
bodies. It does not.** P2's `mechanism` holds `name`, `sha256`, `provenance`,
`driver`, `relaxed_rows` and `row_labels`, and no per-joint body list. The
`bodies` list maps bodies to parts, and `links` maps joints to parts; neither
says which end is `point_a`. So the sides were read off the artifact's own
motion, checked at all 80 points:

- `pitch_link.point_a_world[2]` equals `geometry pitch_link.point_a[2]` plus
  the driver value exactly (it rides the plate's slide). `point_b_world[0]` is
  83.0 at every point while the other two coordinates turn about CAD X, the
  blade's pitch axis. So **pitch_link point_a = pitch_plate, point_b = blade**.
- `tan_link.point_a_world` never moves and equals
  `provenance.tangential_link.ends.base.centre_world_mm` exactly. So
  **tan_link point_a = base, point_b = pitch_plate**.

This matches the sibling linkage handoff's intended table. Each contributor's
`feature.body` records the side, so a republished run with
`geometry.features[]` is checked against it at load time. P2 has no `features`
list, so every contributor's `feature_source` is `authored` today.

## Decisions not in the handoff

- **A sibling builder, not a section of `topologies.json`.** The kinematic
  study reads a gitignored input (the sweep), and the topology projection is
  read by the viewer's `[real]` tier. Folding the sweep into it would make the
  rails depend on what one checkout's `data/` holds. Output:
  `data/projections/topology/kinematic/kinematic_studies.json` plus
  `<study id>.svg`, gated by `projection_provenance` like every other writer
  (the inventory's count is now eight).
- **The envelope is variation only, and the nominal is carried beside it.**
  The fold's own `nominal` is the 0.0 the bands are authored about. The
  sweep's solved value is `nominal_measure`. A first build wrote both under
  `nominal`, the interval's overwrote the sweep's, and the CLI printed
  "nominal 0.000 deg" at both stops. The test now pins `nominal_measure`.
- **The plot is the deviation, not the absolute blade pitch.** A ±0.24° band
  on an 80° axis is invisible. The plot draws deviation from nominal against
  driver travel, with the ±0.5° limit, so the margin is what the eye reads.
  Type sizes and colours are read from `apps/viewer/style.css`'s `:root` at
  build time.
- **A band must be variation-only (`nominal == 0.0`) and a sphere/disk band
  symmetric**, or the study refuses to load. Re-centring a full-value band
  would mean subtracting the nominal from min/max, which is a second combiner.
- **A zone whose Jacobian is exactly zero at a point** enters no `Term`
  (`Term` refuses a zero coefficient). It shows as a `zero_sensitivity` row.
  P2 has none; the fixture exercises it.
- **One-fold rule, proved rather than asserted.** `tests/test_kinematic.py`
  runs `test_thermal_exception_list`'s combining walker over `kinematic.py` and
  requires zero sites, plus a planted site to show the walker can see one. No
  `DECLARED_COMBINING_EXCEPTIONS` entry was needed.
- `checks[].configuration.stop` names a study-level `stops[]` entry
  (`{id, label, target, context_ref}`). The −7/+72 targets cite S461-241.

## What the viewer will need (for the frontend handoff)

Everything is in `kinematic_studies.json`; nothing needs recomputing:

- **A nav entry per study** (`title`, `description`), in a group of its own.
  A kinematic study has no chain and no `selection`, so it is not a rail
  study.
- **The envelope chart:** `envelope[]` rows with `driver_value`,
  `nominal_measure`, `worst_case_min/max`, `rss_min/max`, `rss_half`. The SVG
  beside the JSON is a static rendering of this. A live chart wants hover per
  point (driver value → nominal pitch, ± worst/RSS), and the sweep's
  `driver.label`/`unit` for the axis.
- **Per stop, the ranked table:** `stops[].rows[]`, already sorted, carrying
  `kind` (`term` / `gap` / `zero_sensitivity` — Python's `ROW_KINDS`, which
  becomes a generated vocabulary via `scripts/js_vocabulary.py`, not a hand
  copy), `zone`, `sign`, `coefficient`, `entries`, `band` (with units),
  `magnitude`, `confidence`, `band_source`, `feature`/`feature_source`, `gap`.
  Gap rows have `magnitude: null` and want the same "untraced/no band" visual
  treatment as gap edges elsewhere.
- **Checks:** `rounded_check`'s shape exactly (verdict, `verdict_scope:
  budget`, margin, `excluded_terms`), plus `stop`, `limit`, `context_ref` and
  the input-confidence scoreboard. These can render with the topology page's
  existing check card.
- **Provenance to fold behind one disclosure:** `sweep.run_id`,
  `pipeline_commit`, `max_finite_difference_disagreement`,
  `features_in_artifact`, and the study's own `provenance` prose.
- **A cross-link:** each row's `edge` is a `vpa_pitch_linkage` edge id, so a
  row can deep-link to that topology's rail and to the annotator's binding.
- Not wired: `scripts/rebuild_projections.ps1` does not run this builder yet
  (`ISSUE_20261016_the_kinematic_projection_has_no_reader_and_is_not_on_the_rebuild_rail.md`).

## What the artifact was not, versus the handoff

- No per-joint body list in `mechanism` (above).
- `points[0]`'s blade pitch is −6.9917°, not −7 exactly, and `points[79]` is
  72.0006°. Finding the stops by value is what makes that harmless.
- The handoff's key table was otherwise accurate: 60 labels, 4 measures,
  80 points, `by_measure[m][j][i]`, and a worst finite-difference
  disagreement of 2.4e-7 (the `motor_angle` column; `blade_pitch`'s own is
  about 1e-9).

## Verification record

- `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q`, in this
  worktree: **1 failed, 1466 passed, 1 skipped** (5m20s). The failure is the
  documented worktree-only red, `tests/test_viewer_js_suite.py` (no projection
  under the worktree's `data/`). The skip is `tests/test_fit_bound_features.py:422`,
  which predates this change (a mesh re-extraction not installed). The kinematic
  `[real]` P2 test ran and passed: the file is read by absolute path from the
  main checkout.
- `node apps/viewer/run_tests.cjs` (worktree): 428/428, node-fs tier SKIPPED as
  in every worktree. `node apps/annotate/run_tests.cjs` (worktree): 189/189. No
  `apps/` file changed.
- Mutation witnesses, python tier, `--repo C:/workspace/tolstack`: all 7 new
  specs (9 mutations) WITNESSED.
- Not run: the browser TRUTH tier and the whole-registry mutation sweep in the
  main checkout. This change touches no app surface and no projection a tier
  reads.
