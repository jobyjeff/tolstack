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
  planes included. The 2026-11-13 issue asked for this.
  - **What changed:** until now, a set of one class was fitted as one
    surface whatever it was. Two non-coplanar planar faces fitted as one
    least-squares plane through both. Two cylinders that are not coaxial
    fitted as one bad cylinder. Two spheres that are not concentric fitted as
    one sphere. Each is now `other` with the reason ("the faces are not one
    planar surface"; for cylinders, "...and not one pattern of like holes").
    `fit_bound_features.py` lists such a feature as `unresolved` / `unreadable`
    instead of writing a number about nothing.
  - **Who it reaches:** nobody today. The real log's only multi-face features
    are 744+743, which are one surface. A set built through the UI before
    this change could only be one surface (the sweep and the group offer
    both use `same_surface`). Any other mix could come only from Correct
    followed by Shift-click or Add a face, which arrive in this same change.
- **Every hole of a fitted pattern must be whole** (`hole_pattern`, both
  readers), which is the rule the offer already applied. The review agent
  caught this before review: without it, a Shift-click set of two half holes
  fitted as "2 holes". Such a set is now no pattern, and so `other`. The
  fixture carries the case (faces 0 and 2) and the spec carries a mutation
  for it.
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

## The definition of done, walked (scratch root, real log copied)

Every write went to `data/scratch/hole_pattern_20261115/` in the main checkout.
That folder held a copy of the viewer projections and the inbox log, served by
`tests/debug_hole_pattern_20261115.mjs` (the 11-12/11-15 probe's server and
folder grant). **The real log had 83 events before and 83 after**, printed by
each of the four probe runs (3840 ×3, 5120 ×1). The browser suite writes only
to the pane's in-memory store.

- **Face 744 offers the whole pattern.** The hub's Ø5.5 holes: **N = 10**,
  counted from the mesh by `pattern_siblings` and by `AA.surfaceSiblings`.
  The two readers agree on the installed hub
  (`test_real_the_hub_fastener_hole_offers_ten_holes_and_both_readers_agree`).
  The bar reads "10 like holes on one plane · Take all 10 holes · Just this
  one". The suite counts 20 faces on offer and 20 tinted.
  - Shot `02_…` shows the bar. From that side-on framing the ten lit holes are
    only the orange band along the flange, so the count above is the evidence.
  - **Face 744 has no screen point a real click can reach.** Framed, the ray
    stops on the hub's own top face round the hole. The probe hands the click
    over through `__scene.onPick`, as `scene.js`'s pointerup does, and the
    suite does the same. Add a face and both Shift-clicks were real mouse
    clicks.
  - **Found by the click-around and fixed:** Correct, then a click on 744 (the
    hole Jeff had bound) said "already bound to face 744" and offered nothing.
    The re-pick rule only counted same-surface faces as new. A pattern the set
    does not hold now counts too, and the offer suite's spec carries a
    mutation for it.
- **Take all** writes `0084_hub_boss_to_tan_link_mount_fasteners.json`, one
  `bound` event with **20 faces** (both halves of all ten holes). It
  supersedes Jeff's one-hole event `annotate-1794799958760-…`. Written 14 s
  after the click, through the probe's HTTP folder.
- **The fit reads back:** the body shows "bound · 20 faces of 214373-002",
  then "10 holes Ø5.5 on a Ø240 circle", then each face with Remove (shot
  `03_…`). The Preview, with the feature selected, shows the same line (shot
  `04_…`). Python's `fit_face_set` on those 20 faces gives the same numbers
  (the `[real]` pytest above).
- **Add a face:** on the locating boss (`hub@hub_spindle_bore_axis`, bound
  through the v2 pilot fit's old edge-end event, face 144). The line read
  "adding a face to the feature". A real click on face 1029 wrote
  `0085_hub_spindle_bore_axis_face_added.json` with faces [144, 1029] and
  ended the pick (shot `06_…`). Remove on 1029 wrote [144].
- **Shift-click:** on the piston cover's end-stop shoulder (not bound).
  - Shift-click on face 137 wrote [137] and the pick stayed armed. A second
    Shift-click on 138 wrote [137, 138], superseding the first, still armed
    (shot `07_…`). Esc, then the body read "bound · 2 faces of 214958-002"
    (shot `08_…`). Remove on 137 wrote [138].
  - The "added face N · M faces" line shows until the pointer moves. A hover
    still on the face then rewrites it as the pre-selection line ("face 137 ·
    round · r 5 mm"), which is the pane's ordinary hover rule.
- **Unbound:**
  - On the real projection, the filter's count was **22**. The fold's count
    of unbound v2 features, computed in Python off the scratch log
    (`fold_with_models`, 34 features), was also **22**.
  - After the shoulder was bound, the count was **21**, and the fold's was
    21.
  - The DOM held 23 rows not bound, because a feature revealed under an open
    interface is a second row of the same feature.
  - With Unbound on, no bound row is listed (shot `05_…`). The first run
    showed one, because interface ends were not filtered. They are now.
  - The selection and the Preview are untouched by the filter.

## Shots (`docs/sessions/lessons/shots/a_pattern_is_bound_as_its_like_faces_and_a_face_can_be_added/`, 3840×2160; `5120/` the same at 5120×2160)

`01_clocking_bound_one_hole`, `02_pattern_offered_all_holes_lit`,
`03_body_reads_the_fit`, `04_preview_reads_the_fit`, `05_unbound_filter_on`,
`06_add_a_face_two_faces_bound`, `07_shift_click_still_armed`,
`08_shift_click_set_bound`.

What the click-around showed beyond the handoff:
- The re-pick on the bound hole, and the unfiltered interface ends (both
  above).
- `camera face 744` zooms so far into one hole that no other hole is in view.
  The probe frames the whole hub before the offer shot.
- A 20-face set's body is 22 lines long. It reads fine in the nav, but a
  pattern's per-face Remove list could fold behind its fit line later. That
  is left for the strategy session; it is a layout call.

## Test record

All runs were from the worktree. They borrowed the main checkout's data with
`--repo` and a `node_modules` junction, which was removed at the end.
- `node apps/annotate/run_tests.cjs`: **323/323** (+2).
- `node apps/viewer/run_tests.cjs`: **582/582, the node-fs `[real]` tier
  SKIPPED**. With `--repo C:/workspace/tolstack` the `[real]` tier refuses: the
  shared projection was built from `a80afedd`, and this branch changes an
  input of it (`tolerance_stack/feature_geometry.py`). Rebuilding it from a
  worktree would overwrite the shared artifact, so the `[real]` tier is the
  review's, after the merge and a rebuild.
- `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack --only "a pattern is bound as its like faces"`:
  **11/11, 38 s**. The same with `--only "annotate armed pick"`: **18/18**.
- Witness, every spec added or changed (30 mutations):
  - one run with `--repo`: 17 witnessed, 4 left to the budget;
  - the 9 fast entries again without `--repo`: **9/9**. Their clean run is
    red with `--repo` for the provenance reason above;
  - the 4 browser entries again: **4/4**.
  - None NOT WITNESSED.
- `PYTHONIOENCODING=utf-8 C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -rs`
  (worktree, final tree): **1 failed, 2016 passed, 1 skipped, 4 deselected,
  443 s**, recorded with `suite-time record` (inside budget).
  - The failure is the expected worktree red, `test_viewer_js_suite_is_green`
    (no projection in a worktree; see the viewer line above).
  - The skip is `test_fit_bound_features.py:433` (the pitch-link bearing
    re-extraction is not installed), as on the predecessor.
  - `tests/test_hole_pattern.py`'s `[real]` hub test ran (the hub mesh is in
    the main checkout) and passed.
- Census pins raised in `scripts/guard_enumeration.mjs`, each with its note:
  fast 703 → 705, annotate 321 → 323, browser 856 → 868 declared and
  825 → 837 enrollable. The suite's "(skipped: …)" line carries no spec.
- Three existing specs re-pointed (the anchors moved under this change):
  `browser__a-click-on-a-face-with-an-interrupted-like-face-…`,
  `browser__real-with-the-pane-open-the-left-column-…`,
  `fast__the-tree-draws-an-assembly-s-parts-inside-it-…`.

## Left alone, in writing (the handoff's)

The grid and the DAG show nothing about a pattern's fit.
`scripts/propose_bindings.py` proposes no pattern.
