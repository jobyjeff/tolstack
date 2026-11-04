# LESSONS 2026-11-03 — coaxial_ends_share_one_3d_node

Handoff: `docs/sessions/active/HANDOFF_20261103_coaxial_ends_share_one_3d_node.md`.
Jeff's ruling: a joint whose features are concentric is one 3D node, and its
internal components stay apart in the 2D DAG.

## The surprise that shaped everything: P2 has no fitted axes except the solver's

The handoff calibrates the merge on "the pitch plate spindle bore vs hub
spindle bore" and "the pitch-link spherical centres" as if those nodes had
fitted features. They don't. On 2026-11-03 the feature-identity inbox holds
**55 proposals and 0 accepted bindings**, so no node on P2 is `bound`.
Measured: 55 section, 4 joint and 15 origin anchors. Section rungs are drawing
placements. The hub's spindle anchor is a ladder rung at x = 176 mm, 170 mm
from the pitch plate's. Merging on them would be merging on a picture.

What P2 **does** carry is the solver's own joint geometry. The 10-16 run's
`geometry.features` name `plate_slide.point_a` → `hub_spindle_bore_axis` and
`.point_b` → `pitch_plate_spindle_bore_axis`, and every frame states
`plate_slide.axis_world`. Those are features, so the merge reads two sources
and nothing else:

- a run's joint ends (a point, plus the joint's axis when it has one), read
  at the as-modelled frame;
- a committed binding's **round** face (a bore's axis, a ball's centre).

Flat faces are deliberately excluded. A stack of flat faces round a bolt or
up the hub's flanges is a *linear* stack, and every annular face centroid sits
on the axis. Including planes would collapse the whole hub ladder onto the
spindle. Bushing thickness and clearance to a fastener, the ruling's own
examples, are radial, so they are cylinder against cylinder.

Merges happen **only across an edge**, so two unrelated features that happen
to share the spindle axis never merge. They chain: a bushing in a bearing in
a bore. A union never folds two non-parallel axes into one group. The
spindle and the blade hinge both pass through the assembly origin (distance
0, angle 90°), and they stay two joints.

## The two thresholds, and the measurements that set them

`AA.MODEL_JOINT_ANGLE_DEG = 2` and `AA.MODEL_JOINT_DISTANCE_MM = 1`
(`apps/annotate/model_layer.js`).

I dropped radius scaling (the handoff's "radius-scaled distance"). The only
live merging pair is the solver's slide, and it has no radius. An absolute
mm can be checked against the spacing table below.

**Live P2 (solver features), every edge with a feature at both ends** (the
`[real]` check in `apps/annotate/run_tests.cjs` prints this line):

| edge | angle | off-axis / apart | merges |
| --- | ---: | ---: | --- |
| `hub_to_pitch_plate_spindle_coaxiality` | 0.000° | 4.7e-24 mm | yes |
| `hub_blade_axis_offset` | 90.000° | 0 mm | no (angle) |
| `tan_link_length` | — | 61.45 mm | no |
| `pitch_link_length` | — | 105.99 mm | no |

**If Jeff accepted the open proposals** (measured once by classifying each
proposed face in the browser and placing it with its part's occurrence; this
was a one-off dump and is not committed). Every pair meant to be one joint
measures **0.000–0.050 mm** (`tan_link_mount_joint`, ball in seat, is the
0.050 one). Every pair meant to stay apart measures **61.45 mm or more**. So
1 mm sits more than an order of magnitude from both sides. A clearance fit
(≤ 0.5 mm, the contact engine's own `max_clearance_mm`) still merges, and the
nearest true mount spacing is 60× away. 2° matches
`AA.FACE_RELATION_TOLERANCES.coaxialDeg` and the contact engine's `angle_deg`.

The gas-spring-mount-vs-piston-body measurement the handoff wanted needs
`the_slide_joint_is_the_mounts_bushings_against_the_piston_body` (still
staged; the mount has no placement). I could not take it.

## The merged-node table (live P2, run vpa-pitch-p2-20261016-235852)

| joint dot | members | as-modelled point | at point #0 (−7°) | hidden edges |
| --- | --- | --- | --- | --- |
| `hub_spindle_bore_axis` | `hub_spindle_bore_axis`, `pitch_plate_spindle_bore_axis` | (0, 0, 0) | (0, 0, 32.23) | `hub_to_pitch_plate_spindle_coaxiality` |

The `[real]` check pins it to 0.01 mm. The joint's point is the **mean of its
members' feature points, each where the frame puts it**: the solver's ends
come straight off the frame, and a bound face goes through its body's pose.
So it rides halfway up the slide. The pitch-link and tangential-link centres
stay separate dots. `gas_spring_bushing_coaxiality` is not measured, because
`gas_spring_mount_bushing_bore` has no feature.

**At the as-modelled frame the spindle joint sits at the assembly origin**,
which is exactly where the old star was. That is the spindle axis at the hub
datum, a real joint, and its eight lines are the radii out to the hub and
plate ladders. Compare `docs/sessions/shots_20261103_coaxial_ends/before/5_as_modelled.png`
(red star, 15 unplaced nodes fanned from it) with `after/5_as_modelled.png`
(no red, the joint's own lines only). At sweep frame #0 it is 32 mm up the
axis (`1_sweep_frame_1.png`). If Jeff reads the fan as "the star again", the
next lever is the bias: draw a joint dot at its axis point nearest the +X
side of its members' sections. That is a display rule I did not invent here.

## Unplaced nodes

On P2, 15 nodes have no mesh. The issue listed 7; the fastener stacks added
8. They now draw no dot and no line, are `null` in the anchors message (every
node is still a key, because the app fills in the ones with no dot), and
the bar's head line says "15 nodes not placed" in both modes, with the names
in the hover. The routed issue is marked `resolved`.

**The blade's anchors stay mid-span (x ≈ 1388 mm).** The issue's option (b)
would bound the section search to a window round the body's joint points.
That changes how every section anchor is cut, so it is not cheap, and no
blade node has a feature to merge on. I left it and recorded it in the issue.

## Things the next agent should know

- **A joint's dot id is its first member's node id** (topology order). So
  `lines[e].from === anchor id` does not tell you the end is plain. Ask
  `joints.of[id]`. My own first cut of `modelDrawnGraph` tested by renaming
  and kept the spindle's lines in the base body's frame; the unit check
  caught it, and a mutation spec now witnesses it.
- **Bind mode cannot merge on P2.** There is no run, so there are no solver
  features, and the inbox has no binding. That is honest, and the bind-mode
  browser check says so in its name.
- **The scene → shell hover now carries `members`** (only for a joint). The
  shell lights each member's DAG dot, grid rows and seam leader through the
  new `VA.lightTopoKeys` in `apps/viewer/views/topology.js`. That is hover
  state, not layout. The pane's own pointer wins over it. Before this, a
  scene hover only repainted the Preview, even for a single node.
- **One bearing node, two instances.** The bearing node stands for both of
  the pitch link's bearing instances, so once its proposals are accepted it
  would join only the upper end. Filed as
  `docs/issues/ISSUE_20261103_one_bearing_node_for_two_instances_would_merge_with_only_one_link_end_in_3d.md`.
- **A worktree can run the browser tier** by junctioning `node_modules` from
  the main checkout. The junction is gitignored and is not committed.
- Several tracked files here are `i/lf w/crlf` (`apps/viewer/*`, the browser
  runner, the docs). A scripted patch should read bytes and write the file's
  own line endings back, or the working copy churns.

## Verification

Recorded in the completion report: the full suite, the browser suites this
change touches, and the mutation runs for the specs it added.

### The record

- `node apps/annotate/run_tests.cjs` (worktree; reads the main checkout's
  runs): 274/274.
- `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`: 630/630.
- Browser, `--only "annotate model in the scene"`: 21/21. Browser,
  `--only "leaders across the seam"`: 24/24.
- `venv-win pytest -q` (worktree, single-process): 1687 passed, 1 failed,
  1 skipped, 1192 s. The failure is the expected worktree-only
  `test_viewer_js_suite` red, and its tier is green with `--repo`. That is
  over the 10-minute budget, and I added an addendum to the open
  `ISSUE_20261022_the_default_test_tier…`.
- `run_mutation_witness_tests.mjs --changed-since integration`: 38 of the 39
  entries it reached are witnessed, including every spec this change added
  that the 30-minute cap reached. The cap left 19 to the sweep, among them
  two of the new seam specs; I ran those suites green, unmutated. The one
  unwitnessed entry is `nothing-above-produced-an-uncaught-error`, and the
  reason is a pre-existing red: the nav-chip check is red on the untouched
  integration tree too (addendum on `ISSUE_20261029_four_3d_pane_nav_gesture…`).

## Rework after review (2026-11-03, `REVIEW_20261103_coaxial_ends_share_one_3d_node.md`)

- **The channel I missed was emphasis.** I re-mapped the selection, the focus,
  the lit set and the anchors message to the joint's dot. I missed the grid
  row's `highlight`, which the scene read only off a drawn line. So the
  coaxiality row, the one edge that defines the joint and draws no line, lit
  nothing in 3D. Now the page passes the emphasised edge's two ends
  (`AA.modelEmphasisNodes`, read off the topology), and the scene resolves
  each through `dotOf`. Checked both ways on P2 with the real pointer: the
  coaxiality row gives joint dot scale 1.8, and a row leaving the joint
  (`gas_spring_bushing_coaxiality`) gives 1.8. Before the fix the coaxiality
  row gave 1.
- **The question to ask of a diff that merges or drops scene elements:** list
  every channel that names a node or an edge *into* the scene, and resolve
  each through the merge. The review added it to the overlay.
- **The grid draws a row more than once, and part of it sits under the
  pane.** `hub_blade_axis_offset`'s row was not hittable by the pointer. The
  check aims at the first copy whose centre `elementFromPoint` resolves to the
  row itself, and it tries each leaving edge until one is reachable.
- **The mock pass (`apps/annotate/run_browser_check.mjs`) is a tier this
  change reaches**, and I had not run it. Its every-edge check now works out
  its expected lines the same way the browser twin does. On this tree it is
  96/99. The three reds are trunk's own: the two anchor checks
  (`ISSUE_20261028_annotate_browser_check_mock_anchor_checks_are_red_on_integration.md`)
  and the speed-control check. The review's fourth red, reduced-motion
  distance, passed here.
- **The origin fan has an owner now:**
  `docs/issues/ISSUE_20261103_the_spindle_joint_draws_its_fan_from_the_assembly_origin_at_the_as_modelled_frame.md`
  (`audience: strategy`, the two shots, three options).

## Round 2 (2026-11-04): the slide re-author retired the names my checks read

Merged onto `integration` (`0816cccf`), the leaders suite lost my two P2
joint checks. `the_slide_joint_is_the_mounts_bushings_against_the_piston_body`
re-authored the topology and the study after this branch was cut. Both checks
picked their subjects by **name** or by **what the study lit**, and both of
those are data:

- **The leaving row** was `gas_spring_bushing_coaxiality`, which is gone
  (renamed and re-ended). Now the joint is the run's first merged group, its
  own edge is any hidden edge with both ends in it, and a leaving edge is any
  drawn edge with one end in it. On P2 that gives 1 internal edge and 7
  leaving ones. The pointer reached `pitch_plate_attach_height`'s grid row:
  joint dot scale 1.8.
- **The joint's own edge has no grid row on this page.** The grid rows only
  the study's edges (`VA.gridPlan`'s focus), and the re-authored study leaves
  the spindle coaxiality out. My round-1 "row" hover had in fact landed on
  the edge's **DAG glyph**: `[data-row-kind="edge"][data-id]` matches the
  DAG's bar and glyph as well as the row. The check now aims at the real row
  (`.tv__hscroll tr.tvrow`) when there is one, and at the DAG bar when there
  isn't. It says which it hit, and a leaving edge must be hit through its row.
  Both post the same `highlight`.
- **Fan-in.** A leader across the seam is drawn for the lit set only
  (`VA.seamDots`, Jeff's rule), and the study now lights the plate's end of
  the joint and not the hub's. So a two-leader fan can't appear on this page,
  whatever is selected. The check is now: every member is posted in the
  anchors message at the joint's one point, lit or not, and every lit member's
  leader ends there. On P2: both members posted at the dot, and
  `pitch_plate_spindle_bore_axis`'s leader ends on it to 0.0 px.
- **A measuring trap:** `scrollIntoView` on a DAG dot scrolls the page as
  well, which moves the scene's iframe. A dot read in one task can't be
  compared with a point read after another scroll, so each member is compared
  with the dot read in the same task.
- **The two older trace checks** (`at 1600x1000, both screenshot rows'
  leaders…`, `a re-lay of the DAG with a row selected…`) already encode the
  unplaced-end rule: `with3d` leaves out an end with no anchor, so its leader
  stops at the seam and the check doesn't expect one. They pass on this
  merged tree with projections rebuilt from it. The reviewer's red on them was
  measured against projections built from `211f2235`. I added a comment there
  that states the rule, and changed no logic.
- **Projections for the `[real]` tiers** were built from this merged tree
  into `C:\workspace\tolstack\data\scratch\coaxial_ends_rework\` (copies of
  `inbox` and `meshes`; the main checkout's projection predates the
  re-author). A junction to the main checkout's inputs is refused by
  dispatch's main-checkout edit guard, because its target names a tracked
  path, so this root uses copies, as the reviewer's did.
