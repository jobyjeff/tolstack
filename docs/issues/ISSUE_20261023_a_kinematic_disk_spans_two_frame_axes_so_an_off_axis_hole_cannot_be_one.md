---
type: feature
priority: low
status: deferred
area: tolerance_stack/kinematic
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261022_the_pitch_plate_link_hole_states_its_axis.md
class: zone_kind_cannot_express_the_callout
defer_until: 2026-11-26
resolution: deferred 2026-10-27 (triage) -- low by default
---

# A kinematic `disk` spans two frame axes, so a hole whose axis is not a CAD axis cannot be one

`tolerance_stack/kinematic.py`'s `disk` zone takes two coordinate labels (for
example `pitch_link.point_a[1]` and `point_a[2]`) and folds `r·‖(J₁, J₂)‖`. That is
the right worst case only when the feature's axis is the third CAD axis. A position
zone `⌖⌀w` is a disk normal to the feature's axis (SOP, "What a term cites when its
drawing does not band it"). When that axis is oblique to the frame, the zone spans
Z and a rotated in-plane direction `n`. No pair of labels expresses that.

**The case that found it.** 215735-A puts the pitch plate's link-hole axis in the
plane normal to the spindle (see the 2026-10-23 addendum on
`ISSUE_20261022_the_pitch_plate_link_hole_has_no_axis_so_its_position_zone_stays_a_band.md`).
`pitch_link.point_a` sits at azimuth −11.4° from CAD X, so a *radial* hole axis is
not CAD X. P2's Jacobian makes the numerical difference negligible here, under
0.0001° worst case between a radial axis and one parallel to X. A tighter callout or
a larger tangential sensitivity would not be negligible.

**Options (design, not a patch):**

1. **A disk authored with its axis.** The contributor carries a unit `axis` (cited,
   from a drawing or a fit). The zone's coefficient is `r·‖J − (J·â)â‖` over the
   point's three components: the support function of a disk normal to `â`. It is
   still one `Term`, with no second combiner. This is the general form.
   **Recommended**, once an axis is available to cite.
2. **Keep two labels and refuse oblique axes.** A disk is legal only when its axis
   is a CAD axis, and any other zone stays a band plus an `excluded_terms` line.
   This is what the repo does today, implicitly.
3. **Bound it when only the plane is known.** Here the drawing gives only "axis in
   the XY plane, direction unknown". The worst case over every such axis is
   `r·‖(Jx, Jy, Jz)‖`, numerically the `sphere` closed form. That is a cited
   *bound*, not a reading of the zone, and it would need its own row kind so the
   reader is not told the callout is a ball.

Whichever is chosen, `ZONE_KINDS` / `ZONE_PARAMETER_COUNTS` and the SOP's rule move
together, and the viewer's kinematic page renders the new row.
