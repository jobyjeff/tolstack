# LESSONS 2026-11-03 — each_stop_is_its_own_stack

## What landed

- **Each stop names its own axial stack** (`stops[].axial_stack`, a list of
  `study_ref`s on the driver). `fold_at_stop` folds the linkage terms at the
  stop's point (exactly `fold_at` there) plus every stack leaf at `|J| ×` its
  ratio, J at the stop's nominal driver value. `StopOffset`, `x_interval`,
  `direct`-as-envelope and `applies_to` are gone. A driver `study_ref` among
  `contributors`, or any `applies_to`, is refused with a message that names
  this handoff (`STOP_STACK_HANDOFF`). A stop with no stack is refused in a
  study with a `datum`, or beside a stop that has one. A chain named by two
  stops is ONE `StudyRef` whose `stops` names both. That identity is what
  makes its leaves `shared`.
- **Three result rows.** Two **reach checks** (`bound: at_least | at_most`,
  `CHECK_BOUNDS`) against S461-261. Each one folds the sweep's nominal there,
  the stop's band and the limit. `rss_check_at_stop` is the same fold with
  the RSS ends, for the margin printed beside the worst-case one. Then the
  **range** (`range_between_stops`): the high stop's measure less the low
  stop's. Every physical term enters it once, weighted by the difference of
  its two weights. That covers the linkage terms (difference of entries; for
  a sphere, the norm of the difference) and the shared stack leaves. The
  ±0.5 S461-607 checks are gone.
- **Projection, per stop:** the top-level fields hold the stop's own fold.
  `sub_stacks` holds `linkage` and `stop_position` (`SUB_STACK_KINDS`), each
  with its halves and `term_count`, and the latter also has `position` (mm),
  `studies` and `shared`. `groups` keeps the study-keyed shape the table
  reads, now with `stop_position: true` and `shared_with_other_stop` on each
  child. `range` gives `nominal_measure`, the halves, per-term
  `at_high`/`at_low`/`magnitude`, and `cancelled` per kind. Checks carry
  `bound` and `rss_margin`. `study_refs[]` and `gap_rows[]` say `stops`
  where they said `applies_to`. **`the_kinematic_grid_is_a_stack_of_sub_stacks`
  should read `sub_stacks` for its two groups and `range` for its result
  row.** I did not rename `groups`, so today's table keeps working.
- **Chart:** the envelope is the linkage only. Each stop is a point at its
  nominal x with a thin worst-case bar and a heavier RSS bar
  (`VA.kinematicStopBars`), with caps, its three-decimal pitch beside it, and
  a dashed tick where its reach bound lies. The x axis is the sweep's.
  Nothing is drawn past the last point. ± limit lines are drawn only for a
  check with no `bound`. **The datum line is one sentence:** "Zero travel is
  the +72 deg stop: the feather stops touching." That resolves the
  prose-budget issue; it no longer has a link.
- **Readouts:** under each stop row, `worst ±a = ±b (linkage at this pose) +
  ±c (stop position, n terms)`. A range row follows, then a line saying what
  the shared terms cancelled to.
- **New vocabularies** `CHECK_BOUNDS` and `SUB_STACK_KINDS` are generated
  into `vocab.gen.js` (`KINEMATIC_CHECK_BOUNDS`,
  `KINEMATIC_SUB_STACK_KINDS`).

## Jeff's ruling in this session — the heads move the LOW stop, not the feather

The handoff's model put the two piston heads in the feather stop's stack
(`plate = end-stop + lower + upper + c`). The worksheet's face order says
otherwise. The lower head's lower face (face 7, part Z 234.169) is coplanar
with the piston body's shoulder (face 168), and the plate bolts to the body's
flange. So at the feather contact the plate sits a body constant above the
mount's end-stop surface, and the head thicknesses only move the far contact.
The nominals and the 64.440 travel are identical either way. Only where the
±0.05 / ±0.25 bands land differs. I asked Jeff, and he chose "heads at low
stop". The topology note on `endstop_feather_contact` and the feather
study's provenance record it.

**The step-face-to-plate constant is not one constant.** In the handoff's
form it would be (body shoulder→flange) − lower − upper. What the drawings
dimension is the body: 214700-002 A sheet 2, SECTION A-A, `5.00 ±0.05`
(shoulder to top, `traced`) and `113.67` (flange to top, untoleranced, so the
sheet's X.XX ±0.10 block applies, `inferred`). So it is authored and no gap
was needed.

## The per-stop stacks

Signs are walk signs. Every band is symmetric, so the signs move no
magnitude. Coefficients are |J|·ratio, in deg/mm.

**+72° (feather), J = −1.249 deg/mm**, `study_vpa_pitch_linkage_feather_stop_axial_position.json`
(tan link mount hub face → piston body flange):

| edge | walk | band mm | source | deg |
|---|---:|---:|---|---:|
| `tan_link_mount_overall_height` | −1 | ±0.1 | 215198-A 79.00 ±0.10, traced | 0.125 |
| `gas_spring_mount_datum_a_to_end_stop` | +1 | ±0.1 | 213668-002 A.1 76.86 ±0.10, traced | 0.125 |
| `piston_head_lower_face_flatness` (new) | +1 | ±0.025 | 214699-002 A ⏥0.05 as ±w/2, inferred | 0.031 |
| `piston_body_shoulder_to_top` (new) | +1 | ±0.05 | 214700-002 A sh 2 5.00 ±0.05, traced | 0.062 |
| `piston_body_flange_to_top` (new) | −1 | ±0.1 | 214700-002 A 113.67, X.XX block, inferred | 0.125 |
| stack | | ±0.375 mm (RSS 0.182) | | **0.468** (RSS 0.227) |

**−7° (low), J = −1.728 deg/mm:** the same five (0.648 deg), plus
`study_vpa_pitch_linkage_travel_between_end_stops.json`'s four (upper head
0.432, lower head 0.086, mount thickness 0.864, cover 0.035). Stack ±1.195 mm,
**2.065 deg** (RSS 1.020). The declared gap (blade-root bores to the tan link
mount) is in both stacks.

**Why the low stop composes two studies instead of being one
`vpa_pitch_linkage_low_stop_axial_position` chain:** in this graph a low-stop
chain revisits `endstop_feather_contact`. It arrives by datum A and leaves by
the mount thickness, then returns by the lower head. That is a ring, which the
walk refuses. Plate at the low stop = plate at the feather stop + travel, so
the stack is the two studies. The travel study is therefore a contributor
again, for the low stop only, against the handoff's "no longer a contributor".

**Topology changes:**

- `gas_spring_mount_datum_a_to_end_stop.from` moved to
  `tan_link_mount_gas_spring_seat`, the same mount face, so the 0033/0034
  proposals keyed on its `from` end are unaffected.
- New nodes: `piston_body_head_seat`, `piston_body_top_face` and
  `piston_body_plate_flange` (a datum feature of the body).
- New edges: the three above. A node may not carry three parts, which is why
  the flatness edge exists.
- `gas_spring_mount_position` is left out of the chain. Its own citation says
  the feature is not establishable, and it is a stub of this walk.

## Before / after

| | 10-29 (vs ±0.5 S461-607) | 11-03 (vs S461-261) |
|---|---|---|
| −7° worst / RSS | 1.707 / 0.985 | **2.355 / 1.034** = 0.290 linkage + 2.065 stop position |
| −7° check | margin −1.207, marginal | max −4.637 vs ≤ −5: **margin −0.363, marginal** (RSS +0.958) |
| +72° worst / RSS | 0.315 / 0.169 (datum, 0 interval) | **0.784 / 0.283** = 0.315 + 0.468 |
| +72° check | margin +0.185, pass | min 71.217 vs ≥ +70: **margin +1.217, pass** (RSS +1.718) |
| range | — | **78.992 ±1.730** worst, ±0.977 RSS |

Both checks stay `budget` (`complete: false`): bushing tipping, temperature
and the blade-root anchor gap. The −7° verdict is driven by the mount's
general-note ±0.5 (0.864 of 2.355). The two drawing follow-ups in the end-stop
worksheet's section 8 are now the −7° stop's reach margin.

## Range residual

There are eleven shared terms: the feather stack's five and the six linkage
terms. They total ±0.784 at +72 and ±0.938 at −7, and only **±0.313**
survives their weight difference. That is 0.180 from the feather stack (where
J goes −1.249 → −1.728) and 0.134 from the linkage. The travel's four
(±1.417) do not cancel, so they are most of the range's ±1.730.

## J-variation check (first order is enough)

| stop | J | dJ/dx (to the neighbour) | stack half h | J change over h | second-order pitch ½·dJ/dx·h² |
|---|---:|---:|---:|---:|---:|
| +72 | −1.2488 | 0.0129 /mm | 0.375 mm | 0.4 % | 0.0009 deg |
| −7 | −1.7279 | −0.0581 /mm | 1.195 mm | 4.0 % | 0.042 deg (2 % of 2.065) |

Both stops sit at sweep ends, so dJ/dx is one-sided. At −7 the stack reaches
1.195 mm past the sweep's last point, where there is no sweep to read. First
order there rests on the one-sided slope.

## Decisions not in the handoff

- **The range includes the linkage terms as shared terms**, not only the
  ground terms. They are the same parts of the same build. Treating them as independent
  would put ±0.605 (both stops' linkage bands added) where ±0.134 belongs.
- **The RSS margin** is a second fold (`rss_check_at_stop`), not a derived
  number. `CheckResult` has no RSS margin field, and the check's
  `total_dim` carries only min/max.
- **The reach limit is printed as the requirement writes it** ("at least +70
  deg"), not at three decimals.
- **`tan_link_mount_overall_height` enters each stop twice.** Once as a
  stack leaf, and once as the band the direct `tan_link_mount_height`
  borrows. Both are treated as independent and filed (below).
- **The feather study's nominal total is not a coordinate.** Two
  pitch-system-era edges are authored about 0, and its description says so.
  Only its band is read.

## Layout fallout

There are three new nodes and three new edges in the one product graph. A
branch point is added at `tan_link_mount_gas_spring_seat`. The piston body is
a fourth extra plate block, reached from the head stack. Crossings went 16/81/62
on 11 columns → **20/97/50 on 14**. Every README, test and notes count was
re-pinned with its date: the leaders, bands, jogs, pane widths, the node-hover
count and the lit set (22/22). The feather chain also joins the travel stack
to the linkage, so **the three-edge hub bridge is no longer lit**.

## Issues filed

- `docs/issues/ISSUE_20261103_s461_607_is_a_blade_to_blade_limit_not_a_stop_position_check.md`
  (bug, audience strategy, the handoff's ask).
- `docs/issues/ISSUE_20261103_the_piston_body_113_67_is_cited_by_two_edges.md`
  (the duplicated 113.67, and the mount's base face as two nodes).
- `docs/issues/ISSUE_20261103_one_drawing_band_enters_a_stop_twice_as_two_independent_terms.md`.
- Addenda on `ISSUE_20261029_the_feather_stop_is_not_anchored_to_the_blade_root_bores.md`
  (the gap now ends at the tan link mount's hub face) and
  `ISSUE_20261027_the_travel_term_dominates_…` (re-modelled).
- `ISSUE_20261029_design_the_kinematic_datum_line_is_over_the_one_line_prose_budget.md`
  already names this handoff in `handoff:`, so dispatch resolves it on
  Complete.

## Screenshots

`shots_20261103_each_stop_is_its_own_stack/before_jeff_20261102.png` is
Jeff's, with the −7 wedge past the sweep. `after_stop_bars.png` is this
branch's page against the scratch build.

## Gotchas

- A Python splice that searches for its end marker from the file start can
  land on an earlier identical block. `VA.kinematicCurve` returns the same
  `{width: C.width, height: C.height,` as the chart does, and it duplicated
  half of kinematic.js once. Pass the start index to `index()`.
- To collect every `[real]` mismatch in one viewer run, I made `eq` log
  temporarily instead of throwing, then restored it. One run instead of
  twenty.
- The topology JSON is hand-formatted, with inline `tags` and `parts` arrays.
  Re-serialising it rewrote 200 lines, so edit it as text.
- The browser slot was held by two other worktrees for 13+ minutes on each
  run.
- A citation card shows only the note's **lead sentence**. A browser check
  for a later sentence fails even though the fast tier, which reads the
  model, passes.

## Found on arrival

Nothing: the worktree was clean. The main checkout was touched only under
the gitignored `data/scratch/each_stop/` (a scratch root, with read-only
junctions into `data/inbox`, `data/meshes`, four projection dirs,
`node_modules` and `venv-win`). The worktree's `node_modules` is a junction
too, and is gitignored.

## Verification record

Run from this worktree, on the committed tree. The data tiers ran against the
scratch root `C:\workspace	olstack\data\scratch\each_stop`. Topology,
viewer, crops (drawing-checker's venv) and kinematic projections were rebuilt
there from this branch BEFORE the tiers. `inbox/`, `meshes/`, four projection
dirs, `node_modules` and `venv-win` were read-only junctions, and the
worktree's `docs/` was junctioned in. The root was removed at hand-back.

- `C:/workspace/tolstack/venv-win/Scripts/python.exe -X utf8 -m pytest -q -p no:cacheprovider`
  (single process, worktree): **1710 passed, 1 failed, 1 skipped, 2
  deselected, 521 s**. Recorded with `suite-time record`, inside budget. The
  failure is `test_viewer_js_suite_is_green`, the deliberate worktree red: its
  node-fs tier needs `data/`, and that tier ran green below. I did not capture
  the skip's reason. On 10-29 the skips were data-state skips.
  `tests/test_kinematic.py` passes 84/84 on its own.
- `node apps/viewer/run_tests.cjs --repo <scratch>`: **629/629**, `[real]`
  tier included, projection paired with this tree. Without `--repo`:
  513/513 with the node-fs tier skipped (no `data/` here).
- `node scripts/run_viewer_browser_tests.mjs --repo <scratch> --only kinematic`:
  **23/23** sub-checks, 1/1 suite. It is not the full browser tier, which is
  merge-only.
- `node scripts/run_mutation_witness_tests.mjs --repo <scratch> --changed-since integration`:
  **38/42 witnessed, 42/42 reached, 0 left to the sweep, 17m01s.**
  - Two misses were the bridge mutations: `b7c53705#2` and `77e291b1`. The
    live lit set is one piece now, so I retired them. The fixture guard
    `0ac42284` still witnesses the bridge. `b7c53705`'s guard was renamed
    `a0befb01`, and re-run with `--only` it is WITNESSED.
  - `bd169900` aborted on a pre-existing top-level
    `realKinStudy.sweep.run_id` read. That is fixed, and re-run with
    `--only` it is WITNESSED.
  - `fb0d661d` is red-before-mutation. Its suite's nav-chip sub-check is red
    on integration's own code too, so it is not this branch's. The addendum is
    on `ISSUE_20261029_four_3d_pane_nav_gesture_checks_fail_together_when_the_bodies_resolve_late.md`.
- `node apps/annotate/run_tests.cjs`: **269/269**.
