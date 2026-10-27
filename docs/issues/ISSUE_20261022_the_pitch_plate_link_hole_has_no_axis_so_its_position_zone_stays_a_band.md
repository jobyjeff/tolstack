---
type: chore
priority: med
status: resolved
area: topologies/kinematic
reporter: agent
found_by: docs/sessions/HANDOFF_20261022_a_general_profile_note_bands_a_model_defined_term.md
handoff: docs/sessions/HANDOFF_20261022_the_pitch_plate_link_hole_states_its_axis.md
resolution: handoff completed 2026-10-23 -- closed automatically by dispatch when handoff `the_pitch_plate_link_hole_states_its_axis` moved to completed/; not independently verified.
---

# The pitch plate's link hole has no axis in either topology, so its ⌖Ø0.2 stays a one-axis band

The 2026-10-22 SOP rule ("What a term cites when its drawing does not band it")
says a position zone `⌖Øw` is a kinematic `disk` of radius w/2 over the two
components normal to the feature's axis, and that an agent must not guess the
axis.

`docs/topologies/kinematic_study_vpa_pitch_linkage_blade_pitch_at_the_stops.json`,
contributor `pitch_plate_attach_height`, applies 215735-A's `⌖Ø0.2 A B C` (via
`topology_pitch_system.json`'s `pitch_plate_flange_to_link_hole`) as a `band` on
`pitch_link.point_a[2]` only. Neither topology states the hole's axis:
`vpa_pitch_linkage`'s `pitch_plate_link_attach_bore` and `pitch_system`'s
`pitch_plate_link_hole` carry none. So handoff
`a_general_profile_note_bands_a_model_defined_term` kept the band and named the
missing second in-plane component in both checks' `excluded_terms`; nothing was
converted and the verdicts did not move.

What would close it:

- a bore-axis fit of the plate's link hole (`scripts/fit_bound_features.py`),
  once the hole is bound in the annotator on `asm217755_215735_001` or the plate
  installation; or
- 215735-A's own views naming the hole's direction (radial or axial).

Then convert the contributor to a `disk` over the two components normal to that
axis and report the verdict delta. The 2026-10-21 brief estimated about +0.002°
at −7° and +0.005° at +72°, no verdict change; that figure is not re-measured.

Still open alongside it: F4 of `docs/tolerance_stacks/WORKSHEET_endstop_vision_baseline.md`
(one callout serving the plate's vertical and tangential rows, counted twice?).
It is Jeff's call. A disk over both in-plane components would make that question
concrete, because it would fold the vertical and the tangential row as one zone.

## Addendum 2026-10-23 (handoff the_pitch_plate_link_hole_states_its_axis)

215735-A was read for the hole's direction. **It states half of it.** The study is
unchanged.

What was read: the PDF in `data/inbox/drawings/215735-A.pdf`. That is the same
sha256 as both drawing-checker runs, `20260813_180734_215735-A` and
`20260819_153213_215735-A`. Their `page_1.png`/`page_2.png` renders were read view
by view, and both sheets' text layers were read for every callout string. The
per-page JSON carries only the title block, notes and parts list, with no callouts.

- **What the drawing establishes: the axis lies parallel to datum A, in the plane
  normal to the spindle.** Section A-A (sheet 2) is cut by the A-A line on sheet 1's
  edge view, so it is a plane normal to the spindle axis. It shows the 5X Ø7.950
  holes cut lengthwise through the rim walls at the five corner pockets: the axis
  lies in the section plane. The callout's own lower segment, `⌀0.1 A`, is an
  orientation refinement to datum A alone. Datum A is the 0.1-flat plate face on
  sheet 1's edge view. Sheet 1's bottom view agrees: the holes draw as ellipses on
  the rim's outer faces, with the axis in-plane and oblique to the view. So CAD Z is
  one of the zone's two components, and the band already folded is a true component
  of the disk.
- **What it does not establish: the axis's direction within that plane** (radial,
  parallel to the blade axis, or anything between). Neither sheet carries a basic
  dimension or an angle for the 5X holes. The text layers hold none, and the
  sheet-2 dimensions (5X 9.39, 5X 3.00, 5X 4.06) are toleranced offsets along the
  hole, located from datum G. Note 5 leaves unspecified geometry to the 3D
  definition, 215735-001 / -002. The holes *draw* near-radial, but a direction
  scaled off a drawing is not a citation.

**Why the second half matters, and how little.** `pitch_link.point_a` sits at
azimuth −11.4° from CAD X (P2's nominal, (84.972, −17.139, 79.666)), so "radial" and
"parallel to CAD X" are different axes. Re-measured off P2 this session:

| stop | J at point_a [x, y, z] (deg/mm) | band now | disk, axis ∥ X | disk, axis radial | any in-plane axis (max) |
| --- | --- | ---: | ---: | ---: | ---: |
| −7° | −0.0428, −0.2376, −1.5555 | 1.5555 | 1.5735 | 1.5741 | 1.5741 |
| +72° | −0.0287, −0.3988, −1.4893 | 1.4893 | 1.5418 | 1.5412 | 1.5420 |

Worst case would rise by at most 0.0019° at −7° and 0.0053° at +72°, against
today's 0.2436° / 0.2424°. No verdict moves under any in-plane axis. The whole
spread between the candidate axes is under 0.0001° in worst case.

The open conversion now continues in
`ISSUE_20261023_bind_the_pitch_plate_link_hole_in_the_annotator.md`, which is
person-blocked: the annotator binding is the only route left. The modelling gap the
table exposes is filed as
`ISSUE_20261023_a_kinematic_disk_spans_two_frame_axes_so_an_off_axis_hole_cannot_be_one.md`:
a radial axis is not a CAD axis, so it is not expressible as a `disk` over two
coordinate labels.
