# LESSONS — a_two_row_cylinder_band_fits_as_a_cylinder (2026-11-05)

**One line:** faces 487/521 fit `cylindrical` now, at r 20.520 about Z (axis
within 1e-7), in both readers. The handoff blamed the sphere's one-band rule,
but that rule was only the last word spoken. The real refusal was the
**cylinder's facet-normal test**.

## Root cause (item 1)

`fit_face` refuses a face as a cylinder when any non-sliver facet's normal is
more than `cylinder_axis_deg` (2°) off perpendicular to the facet axis. On
487 the bulk facets are 0.8–0.9° off, which is the stagger between the two
rows. The fan triangles at the trimmed corners are 3.46° off, at 9% of the
largest facet's area, so they are not slivers. A failed axis test sends the
face to the sphere branch, which refuses it as one band (tpv 0.935). That is
the reason the face then carried. The sphere rule was right, and it never
blocked the cylinder fit. The cylinder had already refused before it was asked.

A facet's tilt is its own chord sagitta over its height, which the
deflection sets. The nodes are on the surface exactly. About the facet axis,
487's nodes sit at 3.1e-5 relative. About a vertex-refined axis they sit at
6.5e-8 relative, which is 1.3e-6 mm.

## What did NOT work (measured, so nobody re-tries it)

- **Raising `cylinder_axis_deg`**, or an area-weighted RMS of the facet
  deviations at 2°: this flips 1,110–3,122 faces, 240–729 of them accepted
  spheres. Facets cannot tell a cylinder band from a fillet or cone band.
- **A threshold on the radial residual about the facet axis:** no cut
  separates them. Real cylinders reach 6e-5 there (the r 61 half-cylinders;
  1.5e-4 on r 23.971). Faces that are not cylinders sit at 4–9e-5, for
  example the r ≈157 bands on 215175, whose refined residual stays 5e-5.
- **Relative-to-radius on the refined residual:** still continuous. float32
  error is *absolute*, set by the coordinate magnitude, so the radius is the
  wrong denominator.

## The rule (both readers, statement for statement)

When the facet-axis test fails, **the sphere is asked first, as before**, so
no face that is `spherical` today can change. If the sphere refuses, the face
is `cylindrical` when all four hold:

1. it has ≥ `cylinder_node_min_vertices` = 8 nodes. A cylinder has 5 degrees
   of freedom, so 8 nodes leave 3 constraints that can disagree;
2. the cylinder about the *facet* axis passes the ordinary
   `cylinder_radial_fraction` (2%). This keeps the facet-normal test the only
   one overridden, and it cuts refinements from 13,397 faces to 4,792. Every
   face admitted passes it, the worst at 1.83%;
3. the nodes sit on the **refined** cylinder (`refine_cylinder`: ≤6
   Gauss-Newton steps in centre, radius and two axis tilts, best step kept)
   to ≤ `cylinder_node_ulps` = **3** units of `|p|max · 2^-23`, a count;
4. the arc is ≥ `cylinder_min_arc_deg`.

A face that fails the node test keeps the sphere's reason sentence, so no new
`other` sentence is introduced and the reason-set pairing is untouched.

**Why 3, and the faces it was measured on.** Exact nodes rounded to float32
put a cylinder at about 0.7 units by the arithmetic. Clearly round faces
measure 0.06–0.6: r 23.971, 20.520, 61.040, 110.185 and 5.000. Design-round
radii run to 2.51: r 8.000 at 1.67–2.17, 36.500 at 2.36, 61.090 at 2.51.
From 3 up the radii stop being round (12.914 at 3.20, 12.984, 38.015, 4.070,
39.5 …). Those are surfaces *near* a cylinder, which is what `other` is for.
**The distribution has no gap.** 3 is a judgement on named faces, on the
strict side, not a derivation. Widen it only from a named miss.

## Corpus before/after (item 2)

Every face of every installed mesh was re-fit before and after: 36,294 faces
over 48 meshes. **115 faces change, all `other` → `cylindrical`**, in 21
distinct geometries over 12 parts. None comes from `planar` or `spherical`,
and none leaves `cylindrical`.

Columns: r and arc are from the refined fit. "facet worst" is
`worst_axis_deg`. "facet-axis spread" is the max residual / r about the facet
axis. "node spread" is the max residual in mm about the refined axis.
"units" is that residual in `|p|max·2^-23`. "was" is the reason it carried
(*band* = "one band of quads…", *neither* = "neither a plane, a cylinder nor a
sphere", *small patch* = "too small a patch of its own sphere…").

| r (refined) | arc ° | nodes | tris | facet worst ° | facet-axis spread | node spread (mm) | units | was | n | parts: faces |
|---|---|---|---|---|---|---|---|---|---|---|
| 0.600 | 110.0 | 29 | 36 | 15.67 | 9.0e-04 | 4.5e-04 | 2.61 | neither | 3 | 216332_583a5adf, 216332_bb3745d2, 551438: 931 |
| 0.600 | 147.9 | 36 | 42 | 13.71 | 8.0e-04 | 4.8e-04 | 2.87 | neither | 3 | 216332 ×2, 551438: 822 |
| 0.632 | 25.8 | 11 | 11 | 69.67 | 1.3e-02 | 6.2e-06 | 0.24 | neither | 4 | 216332 ×2: 3573; 551438: 3696, 8272 |
| 1.000 | 33.4 | 8 | 7 | 2.17 | 8.4e-03 | 1.9e-05 | 2.00 | band | 1 | 215071: 163 |
| 1.004 | 25.8 | 11 | 11 | 55.00 | 9.4e-04 | 9.5e-06 | 0.37 | neither | 7 | 216332 ×2: 424, 3993; 551438: 424, 4116, 8692 |
| 1.004 | 30.5 | 16 | 19 | 20.21 | 1.8e-02 | 3.5e-04 | 1.96 | neither | 3 | 216332 ×2, 551438: 776 |
| 1.100 | 79.2 | 20 | 24 | 3.57 | 6.9e-05 | 6.9e-05 | 2.66 | neither | 6 | 216332 ×2: 4132, 4171; 551438: 4255, 4294 |
| 1.100 | 79.1 | 26 | 30 | 7.90 | 1.4e-03 | 7.5e-05 | 2.89 | neither | 2 | 551438: 4610, 5214 |
| 3.300 | 45.0 | 10 | 8 | 2.08 | 1.4e-03 | 6.7e-06 | 0.52 | band | 22 | 215175, 215198: 10, 131, 323, 469, 505, 510, 513, 550, 557, 561, 1117 |
| 5.000 | 76.7 | 14 | 12 | 2.43 | 2.4e-04 | 4.7e-06 | 0.29 | band | 4 | 215177, 215735: 391, 480 |
| 8.000 | 51.6 | 14 | 12 | 3.30 | 7.7e-04 | 2.0e-05 | 1.79 | band | 1 | 215071: 195 |
| 8.000 | 55.1 | 15 | 13 | 2.06 | 8.3e-05 | 2.4e-05 | 2.17 | band | 1 | 215071: 40 |
| 8.000 | 42.6 | 19 | 17 | 3.62 | 3.9e-03 | 2.9e-05 | 1.67 | neither | 20 | 215176_002, machined_213668: 281, 396, 399, 403, 406, 779, 893, 896, 900, 903 |
| 8.505 | 10.2 | 8 | 10 | 3.18 | 6.5e-07 | 5.5e-06 | 0.37 | small patch | 2 | 215177, 215735: 857 |
| **20.520** | 73.0 | 31 | 29 | 3.46 | 3.1e-05 | 1.3e-06 | 0.09 | band | 4 | **215177, 215735: 487, 521** |
| 23.971 | 180.0 | 54 | 52 | 2.65 | 1.5e-04 | 1.3e-06 | 0.06 | band | 8 | 215176_002, machined_213668: 58, 611, 1078, 1079 |
| 36.500 | 158.6 | 77 | 75 | 2.87 | 1.6e-04 | 2.7e-05 | 2.36 | band | 1 | 215071: 244 |
| 39.507 | 13.7 | 10 | 8 | 2.30 | 3.0e-04 | 1.5e-05 | 0.60 | band | 3 | 216332 ×2: 4153; 551438: 4276 |
| 61.040 | 180.0 | 81 | 79 | 7.74 | 1.6e-05 | 2.0e-06 | 0.28 | band | 4 | 214373_002: 3416, 3417; 214588_002: 59, 60 |
| 61.090 | 180.0 | 81 | 79 | 4.22 | 2.0e-05 | 1.8e-05 | 2.51 | band | 4 | 214373_002: 3435, 3436; 214588_002: 78, 79 |
| 61.090 | 180.0 | 83 | 81 | 6.81 | 1.6e-05 | 2.5e-06 | 0.34 | band | 4 | 214373_002: 3444, 3446; 214588_002: 87, 89 |
| 110.185 | 180.0 | 109 | 107 | 2.81 | 4.7e-06 | 4.7e-06 | 0.31 | band | 8 | 215176_002, machined_213668: 73, 81, 622, 624 |

Part ids abbreviated from `asm217755_<n>_00x` (`216332` = both
`asm217755_216332_001_*` variants). Rows that show two parts are the same
geometry in two meshes; 215735_001 carries the plate's geometry again.

**Justification, per row.** Each row passes by its nodes, and each has the
three redundant constraints rule 1 demands, or more.

- **Bands with a round radius** (5.000, 8.000, 20.520, 23.971, 36.500,
  61.040, 61.090, 110.185): one band of quads, refused by the sphere's band
  rule after the facet test. These are the target class, the pilot boss
  among them. 23.971 is the gas-spring mount's bushing bore. It now joins its
  own bore group on the slide edge's contact suggestion.
- **3.300 ×22:** narrow two-row bands at arc 45°. Their facet axis is 2.35°
  off the refined one, which is why a facet test cannot hold them. They have
  10 nodes at 0.52 units.
- **The small radii on 216332/551438** (0.600, 0.632, 1.004, 1.100): fillets
  along straight edges, which are cylinders. Their worst facets are 14–70°
  off, from triangles with all three nodes on one row, which a facet test
  must refuse. Their nodes fit at 0.24–2.89 units over 11–36 nodes. These are
  the rows to look at first if the rule is ever doubted. The 0.632 and 1.004
  groups have 11 nodes, 6 redundant.
- **8.505 (857) and 39.507:** narrow arcs (10.2°, 13.7°), just above the
  minimum. Both have 8–10 nodes at 0.37–0.60 units.

## Projections and proposals (item 3)

- Rebuilt into the main checkout's `data/` from this branch:
  - `feature-identity/contact_suggestions.json`. Two edges moved.
    `hub_to_pitch_plate_spindle_coaxiality`'s plate end is now 487/521 in its
    top three candidates, where it was 439/465. The mount's bushing bore group
    on `pitch_plate_slide_bushings_to_piston_body` gains 58/611/1078/1079.
  - `feature-identity/bindings.json`: 62 events, 62 open proposals.
  - `feature-geometry/fits.json`: 0 bound, so 0 fitted. Its stamp prints
    `inputs absent (4)` because the provenance check resolves those inputs
    against the worktree, not `--data-root`. That is benign, and announced,
    not refused.
- `propose_bindings.py --from-report` wrote **0058–0062: face 487 (`high`)**
  for all five edges whose end is `pitch_plate_spindle_bore_axis`. Before
  this change the same rows were `wrong_shape`.
- **439 is still listed first at those ends.** It was proposed for the same
  five as 0051–0055 (not just 0055), also at `high`, and `AA.surestFirst`
  keeps event order within one confidence. An agent cannot reject, and
  `supersedes` is bound-only. So "439 is no longer the top proposal" holds
  in the contact engine, and in the proposal list only once Jeff answers.
  An armed-pick click on 487 rejects 439 in the same click. The rail's Accept
  on the 487 row does not (`AA.planAnswer`: `accept` rejects nothing). Both
  facts are written into the open
  `ISSUE_20261103_reject_the_pitch_plate_centre_proposal_on_the_small_boss.md`.
- The topology's two node notes that said 487/521 "fit `other`" are updated.
  That changes a topology input, so the viewer projections need the usual
  `rebuild_projections.ps1` before the browser tier at merge. This session
  rebuilt only the feature-identity ones.

## Scope note: `apps/annotate/` was touched despite the handoff

The handoff said not to touch `apps/annotate/`, so the change would not
collide with `the_annotator_reads_a_nodes_declared_face`. That handoff had
already landed (`bb3d8028`, on this branch's base). The two readers are also
held to the same answer on every installed face by
`test_real_both_readers_classify_every_installed_face_the_same`. A Python-only
change reddens it with 115 divergent faces, and it would show Jeff a face as
`other` in the annotator that the proposer says is a cylinder. So the JS
classifier, three JS checks, their witness specs and the annotate guard pin
(282 → 285) changed with it.

## Cost

The refinement runs on about 4.8k faces. The whole-store fit went from 86 s
to 113 s, and the `[real]` pairing test slows by the same share.

## Verification record

- `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -rs --durations=15`
  in the worktree: **1727 passed, 1 skipped, 1 failed, 417 s** (inside budget,
  recorded). The failure is `test_viewer_js_suite`, the documented worktree
  red: no `data/projections/viewer` here. The skip is the pre-existing
  `test_fit_bound_features.py:424`, a bearing re-extraction that is not
  installed. Every `[real]` feature-geometry test ran against the main
  checkout's meshes, including the two-reader pairing over every installed
  face (101 s).
- `node apps/annotate/run_tests.cjs`: 285/285.
- `node scripts/run_mutation_witness_tests.mjs --changed-since integration --repo C:/workspace/tolstack`:
  5/5 witnessed, 3m14s.
- `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`: 517/518. The
  `[real]` tier refuses, correctly, because the main checkout's viewer
  projections were built from b58f8ed2, and this branch changes
  `feature_geometry.py` and the topology JSON. Viewer projections are rebuilt
  only in the main checkout, so that tier and the browser TRUTH tier are the
  merge's, after `scripts/rebuild_projections.ps1`. They were **not run
  here**.
