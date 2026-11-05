---
type: bug
priority: med
status: open
area: feature_geometry/fit
reporter: agent
found_by: docs/sessions/HANDOFF_20261103_the_slide_joint_is_the_mounts_bushings_against_the_piston_body.md
---

# A two-row cylinder band fits `other`, so the plate's pilot boss cannot be proposed

Jeff, 2026-11-03: the pitch plate's tabs carry a broken Ø41.04 boss, which
pilots into the piston body's Ø41.072 ID datum.

In `asm217755_215177_001` (37e9f606…), that boss is faces **487** and **521**.
At the plate's occurrence, every vertex of each face sits at r 20.520 ±0.025
from the assembly Z axis:

| | value |
|---|---|
| z | 102.97–105.67 |
| vertices | 31 |
| triangles | 29 |
| area | 67.17 |

That is a cylinder. `feature_geometry.fit_face` returns `other` for both, with
`why: "one band of quads, which lies on a sphere whatever shape it is"`.

That reason comes from the **sphere** guard (`FIT_TOLERANCES`'s row-count
rule), yet the face does not become a cylinder either. The node declares a
cylindrical face, so `scripts/propose_bindings.py` refuses any proposal on
487/521 as `wrong_shape`. The plate's only cylinders on its axis are the
convex r 16.5 faces 439/465, which are not the boss.

**Repro:** `fg.fit_face(fg.read_mesh(<meshes>/37e9f606…), 487)`.

**Expected:** either a cylinder of r 20.52 about Z, or an `other` whose `why`
names the cylinder rule that refused it.

Measure before widening any threshold: the 2026-09-21 sphere-band finding is
why that rule exists.
