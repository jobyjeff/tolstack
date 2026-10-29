---
priority: med
depends_on: [a_preview_pane_replaces_the_hover_popups_and_one_record_backs_every_mark]
model: sonnet
hitl: false
---

# HANDOFF 2026-10-29 — a_point_exports_its_xyz_against_angle: pick one or more points in the kinematic view and export their XYZ against blade angle (or angle against XYZ) as CSV

Source: Jeff's forge note `20261029T120929_5ysvll` ("Small ask"), consumed by
the 2026-10-29 strategy session (`dispatch/docs/strategy/HANDOFF_20261029_strategy.md`):

> Someone asked for an output (xyz coordinate curve) of the tangential link
> attachment point, same as the pitch link coordinates from the original
> spreadsheet I gave. … Separately let's add an export feature to the app so
> you can choose one or more points and then export their XYZ as a function
> of angle (or vice versa).

The one-off was answered in the session by hand from the P2 sweep:
`C:\workspace\linkage\data\runs\vpa-pitch-p2-20261016-235852\tan_link_attachment_xyz.csv`
(80 rows, blade pitch −7° → +72°, actuator travel, plate rotation, the tan
link's plate end, its mount end, the pitch link's plate end; the pitch-link
column matched the 2025-05-30 motion sheet's G–I node at −7° to 0.04 mm).
This handoff makes that a feature. Baseline: `master` with the preview-pane
handoff landed (the element record gives a point its name). Scope:
`apps/viewer/views/kinematic.js` (an Export control in the results pane),
`apps/annotate/sweep.js` (point picking in sweep mode), a small CSV builder
(JS, in the viewer — no Python needed: the sweep artifact already carries
everything), tests. Do NOT touch the DAG, grid or leaders.

## What the data already holds

The published sweep (`C:\workspace\tolstack\data\inbox\linkage-sweeps\vpa-pitch-p2-20261016-235852.json`,
schema from linkage): `points[i].measures` (`blade_pitch`, `actuator_travel`,
`plate_rotation`, `motor_angle`), `points[i].joints[<joint>].point_a_world /
point_b_world / axis_world`, and `points[i].poses[<body>]` (rotvec +
translation from the as-modelled 72°/0 mm placement), all in the 217755
assembly frame (Z = spindle axis, X = blade 1's pitch axis). So any joint end
is exportable directly, and any bound feature's fitted nominal (a sphere
centre, a bore axis point — `tolerance_stack/feature_geometry.py`) is
exportable by transforming its part-local point through its body's pose per
sweep point.

## Decisions (made)

- **Exportable points** = every joint end the sweep carries (named `<joint>
  · <a|b> end`, with the part it sits on) plus every bound feature with a
  fitted nominal on a moving body. Multi-select in a small picker (checkbox
  list, searchable), remembered per viewer.
- **Two orientations, one file**: "XYZ vs angle" writes one row per sweep
  point with `blade_pitch_deg, actuator_travel_mm, plate_rotation_deg` then
  `X,Y,Z` per chosen point; "angle vs XYZ" writes the same rows sorted by the
  chosen point's Z (or the user-picked coordinate) — the inverse lookup Jeff
  means by "vice versa". The header row carries units and the frame
  sentence; a `#` comment line names the run id, pipeline commit and
  export time. CSV only (Excel opens it); no xlsx dependency.
- **Provenance travels**: the file name is `<run_id>_<points>_xyz_vs_angle.csv`.

## Deliverables

1. The Export control + picker in the kinematic results pane, and in the
   annotator's sweep mode (same code, one module).
2. The CSV builder with a value-level test against the P2 artifact: the tan
   link plate end at −7° = (80.708, 11.329, 144.132) mm and at +72° =
   (80.998, 9.027, 79.666) mm; the mount end constant at (79.428, 62.430,
   110.027) mm — the numbers in the hand-made file above.
3. The hand-made CSV's columns are reproduced byte-for-byte in the values
   (ordering may differ) — assert the three columns above.

## Definition of done

- Browser check: pick two points, export, parse the download, 80 data rows,
  the asserted values present.
- `node apps/viewer/run_tests.cjs`, `node apps/annotate/run_tests.cjs`,
  `node scripts/run_viewer_browser_tests.mjs`, `PYTHONIOENCODING=utf-8
  venv-win/Scripts/python.exe -m pytest -q` green; witnesses `--changed-since
  integration` clean.
- Lesson: which points were exportable on the product model (count), and
  whether any bound feature sits on a body the sweep does not pose.
