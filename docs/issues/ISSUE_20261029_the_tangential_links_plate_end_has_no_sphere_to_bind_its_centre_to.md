---
type: bug
priority: low
status: deferred
area: contact-suggestions
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261029_the_contact_engine_asks_the_ends_what_shape_they_are.md
class: anchor_not_declared
defer_until: 2026-11-29
resolution: triage 2026-10-30: low, deferred by default to a date (class has no program)
---

# The tangential link's plate-end "spherical-bearing centre" has no sphere on the link's mesh, so no face can ever be bound there

Measured 2026-10-29. The contact engine now pairs each end only on faces of
the class its node asks for, and `tan_link_plate_end_centre_is_this_bearing`
went from a "clear" top pair to `no_contact`:

- **Before:** the MS14103-3 OD (e4414548 faces 22/23) in the link's eye (faces
  79/80), cylinder in cylinder, 0.0005 mm clearance. The contact is real, but
  both faces are cylinders, and both ends name ball centres.
- **After:** both ends ask for a sphere. The bearing has one (faces 0–3, r
  6.7318). The tangential link mesh (`tan_link_212956_005`) carries its
  **mount**-end MS14101-3 inside it (race 48/49, ball 64/65), but no sphere
  centred within `centre_mm` of the plate-end bearing's centre. At that end
  the bearing is a separate mesh, and the link carries the eye bore it is
  pressed into. So `tan_link_upper_sphere_centre` ("tangential
  link plate-end spherical-bearing centre") asks for a spherical face that
  the link's mesh does not have. `propose_bindings.py` would refuse every face
  on that end for its shape.

**Options.** (a) Rename the node to what the link's mesh carries at that end
(the eye bore's axis, `cylindrical`), and let
`tan_link_plate_end_centre_is_this_bearing` relate the ball centre to that
axis. (b) Let a node whose part's mesh lacks the feature be bound on another
part's mesh (the bearing's ball). That would cut across the `wrong_part`
refusal. **Recommendation: (a).** The topology then says what the geometry
can witness, and the one-sided "centre" stays on the bearing, where it is.
