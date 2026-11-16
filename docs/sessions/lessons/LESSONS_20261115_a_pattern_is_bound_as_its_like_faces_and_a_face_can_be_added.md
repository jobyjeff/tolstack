# LESSONS 2026-11-15 — a_pattern_is_bound_as_its_like_faces_and_a_face_can_be_added

## The tolerance table (v2's fifteen installed meshes, measured 2026-11-15)

Every cylindrical face of every v2 part was fitted (`fit_part_faces`). Faces
were grouped into holes by `same_surface`, and every pair of holes within 2 %
radius and 5° axis was tabulated. "Members" are holes the final rule joins.
"Nearest non-member" is the closest hole the rule must refuse on that one
measure while passing the others. Axial offset is measured along the mean of
the two axes, as a fraction of the radius. Measured along one face's own
axis, the mount's 0.06–0.18° axis wobble times a 230 mm spacing read as
0.1 r, so the mean axis is the one that works.

| measure | members, worst | nearest non-member | threshold | margin |
|---|---|---|---|---|
| radius fraction | 3.2e-5 (tan link mount 2.4998/2.4999) | 0.0999 (tan link 7.94 vs 7.14 bores) | 1e-3 | ×31 / ×100 |
| axis angle | 0.185° (tan link mount, fitted axes) | 9.3° (hub, 1.26 holes) | 1.0° | ×5.4 / ×9.3 |
| axial offset / r | 0.0085 (tan link mount 3.35 holes) | 0.106 (hub, two 1.85 holes 0.195 mm apart) | 0.03 | ×3.5 / ×3.5 |
| a hole's arc sum | 360 (halves) / 720 (two seats) | 273 (pitch-link clevis) | 300 | — |
| centres off the circle / R | 8.1e-5 (tan link mount) | 1.9e-2 (the mount's 20-hole sets, two circles) | 1e-3 | ×12 / ×19 |

Two rules came out of the measurement, and the handoff did not name either:

- **A hole must be whole** (arc sum ≥ 300°). Without that rule the tier
  joined fillets: 90° arcs of one radius at one height are everywhere. The
  first all-cylinder census found 2-to-30-member "patterns" of fillets on
  every part.
- **Two holes do not overlap** (axes more than a diameter apart). This is a
  geometric fact, not a threshold. The hub carries offset bores: two Ø80
  cylinders 0.8 mm apart on one plane, five times over, plus Ø214/Ø132/Ø130/
  Ø122/Ø125 pairs. Every other test calls them a "2-hole pattern".

`circle_max_spread` (circle radius ≤ 10 × the largest centre spacing) is
argued rather than measured. No installed pattern is a straight row. Every
on-circle set has R/spread ≤ 0.58.

## Every pattern the tier finds in v2's parts

`pattern_siblings` was run from every cylindrical face. It is consistent
from every member: each member's pick yields the same set. Ø and the circle
come from `hole_pattern`.

| part | holes | Ø | circle |
|---|---|---|---|
| hub | 10 | 5.5 | Ø240 (**Jeff's 744/743 hole is one of these**) |
| hub | 15 | 5.3 | Ø388 |
| hub | 5 | 8.077 | Ø164.77 |
| hub | 2 | 3.52 | — |
| tan link mount 215175-002 | 10 | 5.0 | Ø240 |
| tan link mount | 10 | 5.8 | Ø240 |
| tan link mount | 10 | 3.307 | Ø240 |
| tan link mount | 10 | 6.693 | Ø240 |
| tan link mount | 10 | 6.299 | Ø240 |
| tan link mount | 20 | 2.51 | not on a circle |
| tan link mount | 20 | 2.489 | not on a circle |
| tan link mount | 20 | 1.92 | not on a circle |
| tan link mount | 20 | 4.183 | not on a circle |
| tan link mount | 20 (80 faces, two seats each) | 2.4 | not on a circle |
| gas-spring mount 213668-002 | 5 | 4.75 | Ø81.57 |
| gas-spring mount | 10 | 2.51 | Ø82.43 |
| gas-spring mount | 3 | 6.4 | Ø92 |
| gas-spring mount | 10 | 5.0 | Ø240 |
| pitch plate 215177-001 | 5 | 5.2 | Ø72 |
| gas-spring piston 214700-002 | 6 | 2.515 | not on a circle |
| gas-spring piston | 5 | 4.9 | Ø72 |
| gas-spring piston | 3 | 7.0 | Ø24 |
| gas-spring piston | 3 | 5.3 | Ø22.4 |
| pitch link | 2 | 14.288 | — |
| pitch link | 2 | 14.282 | — |
| pitch link | 2 | 4.82 | — |
| upper piston head 214698-002 | 3 | 5.2 | Ø22.4 |
| piston cover 214958-002 | 5 | 5.0 | Ø81.57 |
| piston cover | 2 | 13.2 | — |
| piston cover | 2 | 11.462 | — |

**Wrongly joined:**

- **The tangential link mount's 20-hole sets.** Each is two circles of ten
  at one height (centres at r ≈ 118.8 and 121.2 around the hub axis). The
  plane rule cannot split them. The fit says "not on a circle", which is
  true. Jeff takes the circle he wants with **Just this one** plus
  Shift-clicks, or re-picks.
- **The hub's ten Ø5.5 holes.** They are one circle, and the fastener
  clocking may mean only the holes one mount uses. The offer lights all ten
  and Jeff decides.

**Split:** none seen. **Read from the pick:** a hole that overlaps one member
of a circle joins the pattern read from the other members (the fixture's
offset cylinder, faces 19/20, documents it).

## Decisions not in the handoff

- **`fit_face_set` now refuses any mix of surfaces that is not a pattern**,
  planes included. Two planes at different heights are `other` ("the faces
  are not one planar surface"), not one plane through both. The 2026-11-13
  issue asked for this. Today's real log has no such set: its multi-face
  features are 744+743, one surface.
- **A pattern's fit is surface `hole_pattern`** (`PATTERN_SURFACE`), not
  `cylindrical`. Its geometry has no `axis_point`, so linkage (which reads
  `local.surface`) cannot take N holes for one cylinder.
  `fit_bound_features.place_geometry` moves `centres` and `circle_centre`.
- **The pane computes the fit line itself** (`setFitWords`, beside the mate
  ranking in `refreshMates`) from its own classes, and posts it in the tree
  (`fits`). The body and the Preview read it from there. `fits.json` is not
  served to the page, and a just-written set has no rebuild behind it yet.
- **Shift-click adds to whatever the feature holds**, in any armed mode, and
  keeps the pick. On a feature with nothing bound yet it binds through the
  ordinary answer path, so an open proposal is answered as a plain click
  would answer it. A plain click in Add mode adds and ends the pick. A plain
  click in Pick/Correct still replaces.
- **Take on a ranked mate that is a hole of a pattern** shows the same bar
  before it writes. A Take of a single face still writes at once.
- **The filter covers the Parts hierarchy** (bodies → parts → features, and
  the unbodied Parts section). Interfaces and joints are unfiltered. The
  control sits on the first section that lists parts ("Rigid bodies" on v2).
- **Every change of a set goes through `writeFeatureSet`**, one event in
  Remove's shape. Remove was refactored onto it, so no second event shape
  exists.
