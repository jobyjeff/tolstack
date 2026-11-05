---
type: chore
priority: low
status: open
area: feature-identity/proposals
reporter: agent
needs: jeff
ask: In the annotator, reject the proposed pitch plate centre face (face 439): it is the small r 16.5 boss, not the 41.04 pilot
found_by: docs/sessions/HANDOFF_20261103_the_slide_joint_is_the_mounts_bushings_against_the_piston_body.md
todo: 20261104T184024_t8xbuq
---

# Reject proposal 0055 (the plate's r 16.5 boss) on the hub-to-plate coaxiality

`data/inbox/feature-identity/0055_hub_to_pitch_plate_spindle_coaxiality_proposed.json`
proposes plate face 439 for the `to` end of
`hub_to_pitch_plate_spindle_coaxiality`. Face 439 is convex, r 16.5.

Jeff's statement of 2026-11-03 puts the plate's axis feature on the tabs'
broken Ø41.04 boss. That boss is faces 487/521, at r 20.52.

An agent cannot reject a proposal: the schema refuses a `rejected` event
written by an `agent:` actor. The event that counts is a human's Reject in
the annotator.

No replacement is proposed. Faces 487/521 fit `other`, so a proposal on them
is refused for shape
(`ISSUE_20261103_a_two_row_cylinder_band_fits_other_so_the_plate_pilot_boss_cannot_be_proposed.md`).

## Addendum 2026-11-05 (a_two_row_cylinder_band_fits_as_a_cylinder)

Faces 487/521 fit `cylindrical` now (r 20.520 about Z), and face 487 is
proposed (`high`) for all five edges whose end is the pilot-boss node, as
events 0058-0062. Face 439 is proposed for the same five, as 0051-0055, not
only for the coaxiality edge 0055 above.

Both are `high`, so the annotator lists the older one, 439, first on each.
Accepting 487 on an edge turns 439 down for that edge in the same click.
That needs no separate Reject. The contact engine's top candidate on the
coaxiality edge is already 487/521.
