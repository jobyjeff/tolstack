# LESSONS 2026-10-23 — the_pitch_plate_link_hole_states_its_axis

Outcome: **deliverable 3** (the drawing does not settle the axis). The study,
topologies and tests are unchanged. The evidence went into an addendum on
`ISSUE_20261022_the_pitch_plate_link_hole_has_no_axis_so_its_position_zone_stays_a_band.md`,
and two issues were filed:
`ISSUE_20261023_bind_the_pitch_plate_link_hole_in_the_annotator.md` (`needs: jeff`)
and `ISSUE_20261023_a_kinematic_disk_spans_two_frame_axes_so_an_off_axis_hole_cannot_be_one.md`
(`audience: strategy`).

## Which view establishes the axis, and how far

- **215735-A settles half of it.** Section A-A (sheet 2) is cut normal to the spindle
  by the A-A line on sheet 1's edge view. It shows the 5X ⌀7.950 holes cut lengthwise
  through the corner-pocket walls. The composite frame's lower segment, `⌀0.1 A`,
  refines orientation to datum A alone, and datum A is the plate face. Together these
  put the hole axis **parallel to datum A, normal to CAD Z**. Sheet 1's bottom view
  agrees: the holes draw as ellipses on the rim faces.
- **It does not give the direction within that plane.** Neither sheet has a basic
  dimension or angle; both text layers were dumped to check. Note 5 defers to the 3D
  model. The holes draw near-radial, but scaling a drawing is not a citation.
- drawing-checker's per-page JSON (`215735_A_p0N.json`) carries no callouts, only the
  title block, notes and parts list. The callouts are in the PDF text layer
  (`pymupdf`, in drawing-checker's venv; tolstack's venv has neither PIL nor pymupdf)
  and in the `page_N.png` renders.

## The measured delta (P2, `vpa-pitch-p2-20261016-235852`)

At `pitch_link.point_a`, J (deg/mm) is −7°: (−0.0428, −0.2376, −1.5555) and +72°:
(−0.0287, −0.3988, −1.4893). Converting the band to a disk would raise the worst case
by **+0.0018° / +0.0052°** with the axis parallel to X, **+0.0019° / +0.0052°** with it
radial, and at most +0.0019° / +0.0053° for any axis in the plate plane. No verdict
moves. The 2026-10-21 estimate (+0.002° / +0.005°) holds. It was re-measured here,
not copied.

## Surprise worth knowing

`point_a` sits at azimuth **−11.4°** from CAD X, so "radial" is not a CAD axis. The
study's `disk` takes two coordinate labels, so a radial axis would not have been
expressible even if the drawing had said "radial". The numbers make it moot here, but
not in general. That is the strategy issue. A side fact: the worst case over *every*
in-plane axis is `r·‖J_xyz‖`, numerically the sphere closed form. That gives a cited
upper bound with no axis guessed, if strategy ever wants one.

## F4 (describe, do not decide)

The disk would fold the plate-hole position's vertical component (CAD Z) and its
in-plane component, the one normal to the axis, as **one** zone of radius 0.1. Those
are the quantities the worksheet carries as rows 32 (vertical) and 48 (tangential),
with row 37 also vertical at 0.20. A disk makes F4 concrete: the single callout would
appear once, as a disk, rather than as two rows. If row 48 is the in-plane component,
"tangential" holds only when the axis is radial. If the axis is parallel to the blade
axis, the in-plane direction is CAD Y, about 11° off tangential at that point.
Whether rows 32/37 double-count is still Jeff's call. Nothing here touched F4.

## Verification

See the report. The viewer `[real]` tier was not re-run against a rebuilt
projection, because nothing that feeds a projection changed (only `docs/issues/` and
this lesson).

Recorded runs (2026-10-23, this worktree, bridged with `dispatch bridge-test-inputs`):
`venv-win/Scripts/python.exe -m pytest -q -rs` gave **1 failed, 1563 passed, 1 skipped**
in 537 s, inside budget. The one failure is `tests/test_viewer_js_suite.py`, red by
design in a worktree because it has no projection. The one skip is
`test_fit_bound_features.py:422`, because a mesh re-extraction is not installed.
`node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` gave 451/452, with the
node-fs `[real]` tier **NOT RUN**. It refused the main checkout's projection as built
from another tree, and the projection must not be rebuilt from a worktree. So the DoD's
"viewer [real] tier against a projection rebuilt from this tree" was not met. The
batch merge's rebuild-then-run covers it, and this branch changes no projection input.
