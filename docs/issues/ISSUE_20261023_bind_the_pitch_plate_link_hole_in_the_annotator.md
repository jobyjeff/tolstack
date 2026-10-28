---
type: chore
priority: med
status: open
area: topologies/kinematic
reporter: agent
needs: jeff
ask: Bind the pitch plate's link hole in the annotator on the machined plate (215735-001, asm217755_215735_001)
found_by: docs/sessions/HANDOFF_20261022_the_pitch_plate_link_hole_states_its_axis.md
todo: 20261027T170625_swz3mn
---

# Bind the pitch plate's link hole in the annotator so its bore axis can be fitted

The kinematic study's contributor `pitch_plate_attach_height` still folds 215735-A's
`5X ⌀7.950 … ⌖⌀0.2 A B C` as a one-axis band on `pitch_link.point_a[2]`. The SOP
("What a term cites when its drawing does not band it") makes it a `disk` of radius
0.1 normal to the hole's axis. 215735-A was read on 2026-10-23. It puts that axis
parallel to datum A, in the plane normal to the spindle. It does not give the axis's
direction within that plane: there is no basic angle, and note 5 defers to the 3D
definition. The evidence is in the addendum to
`ISSUE_20261022_the_pitch_plate_link_hole_has_no_axis_so_its_position_zone_stays_a_band.md`.

**The person step.** In the annotator, on the installed machined plate
`asm217755_215735_001`, bind the bore of the link hole for blade 1 (the one the P2
sweep's `pitch_link.point_a` sits at, nominal (84.972, −17.139, 79.666) in CAD) to
`vpa_pitch_linkage`'s `pitch_plate_link_attach_bore`. No feature-identity event
exists yet: `data/inbox/feature-identity/` holds only its README.

**What an agent does after.** Run `scripts/fit_bound_features.py` for the bore
axis. State the axis on `pitch_system`'s `pitch_plate_link_hole` and
`vpa_pitch_linkage`'s `pitch_plate_link_attach_bore`, citing the fit and naming
215735-A for the in-plane constraint. Convert the contributor to a disk over the two
components normal to that axis, and drop the second-component line from both checks'
`excluded_terms`. Re-pin
`tests/test_kinematic.py::test_real_the_first_study_pins_both_stops_against_p2`.
If the fitted axis lands parallel to CAD X, the disk is over `point_a[1]` and
`point_a[2]`. If it does not, see
`ISSUE_20261023_a_kinematic_disk_spans_two_frame_axes_so_an_off_axis_hole_cannot_be_one.md`
first.

The stake is small: at most +0.0019° at −7° and +0.0053° at +72° in worst case,
with no verdict change, measured 2026-10-23.
