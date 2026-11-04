---
type: bug
priority: low
status: open
area: kinematic study / correlated terms
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261103_each_stop_is_its_own_stack.md
---

# One drawing band, 215198's 79.00 ±0.10, enters each stop twice as two independent terms

Since 2026-11-03 each stop of `kinematic_study_vpa_pitch_linkage_blade_pitch_at_the_stops.json`
folds the linkage at its pose and its axial stack. Two of those terms are banded
by one callout, 215198-A's `79.00 ±0.10`:

- the direct contributor `tan_link_mount_height` (the mount's hub face to the
  tangential link's bore; it borrows that band by `dimension_ref`
  `tan_link_mount_overall_height`), perturbing `tan_link.point_a[2]`;
- the feather stack's leaf `tan_link_mount_overall_height` itself (the mount's
  hub face to its gas-spring seat), moving the driver at both stops.

The fold treats them as independent. They are two features of one part, so the
question is physical: does a tall mount lift its tan-link bore and its
gas-spring seat together? If yes, the two are one variate with coefficient
`J_bore + J_driver` (signed), and the sum of two absolute values overstates the
worst case wherever the two act in opposite directions. Which way the leaf acts
is not established: `tan_link_mount_overall_height` is a pitch-system-era edge
authored about 0 (seat to hub face), so its walk sign carries no physical
direction. The overstatement is at most twice the smaller term: 2 × 0.0241 =
0.048 deg at +72 (bore 0.241 deg/mm, driver 1.249, on ±0.1 mm) or 2 × 0.0172 =
0.034 deg at −7 (0.172 and 1.728), at whichever stop the signs truly differ.

Small (≤0.048 deg on bands of ±0.784 and ±2.355), but it is the one place in the
study where a band is counted twice. Options: (1) keep them independent, which is what the band
borrowing says and what the bore's own missing dimension forces; (2) let a
contributor and a stack leaf declare one variate and fold their coefficients
signed. Recommendation: 1 until 215198 dimensions the bore's height, then cite
the bore's own band.
