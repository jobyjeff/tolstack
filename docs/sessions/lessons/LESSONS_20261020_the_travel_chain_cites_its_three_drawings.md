# Lessons — the_travel_chain_cites_its_three_drawings (2026-10-20)

## The four values, before → after

| Edge | Before (2026-10-16, assumed ±0.05) | After | Citation |
|---|---:|---:|---|
| `piston_head_lower_thickness` | 2.4910 (mesh fit) | **2.491 ±0.050, traced** | 214699-002 A sh 1 SECTION A-A, run `20261020_134300_214699-002-A`, `214699-002-A.pdf::p1`, bbox [156.68, 545.02, 234.84, 561.17] |
| `piston_cover_flange_to_end_stop` | 82.154 (Jeff) | **82.154 ±0.020, traced** | 214958-002 A sh 3 SECTION CUT A-A, run `20261020_134315_214958-002-A`, `214958-002-A.pdf::p3`, bbox [426.94, 385.51, 512.75, 401.66] |
| `piston_head_upper_thickness` | 12.5094 (face 149) | 6.556 (face 110), **still untraced ±0.05** | none: 214698-002 A does not dimension the step height |
| `gas_spring_mount_flange_to_end_stop` | 8.667 | 8.667, **still untraced ±0.05** | none: 213668-002 A.1 does not dimension it |

Travel: 58.4866 → **64.440**, worst case ±0.170 (was ±0.200), RSS ±0.0889. Jeff's CAD
section says 64.465: **0.025 mm apart**, larger than rounding, inside the cited bands,
stated in the worksheet and not smoothed.

So the DoD's "four drawing-cited terms, or three plus one gap" was not reachable: it is
**two plus two gaps**. The handoff's table implied the mount's 8.667 was citable from
the August run; that run extracted no dimensions at all, and reading the two page renders
by eye finds no axial flange-to-stop length (76.86 overall, 4.00 flange, (85.36)). One
issue carries both: `ISSUE_20261020_two_end_stop_travel_terms_have_no_dimension_on_their_drawings.md`.

## The stop face, and who owns which stop

Settled by Jeff's naming and his CAD section (face 110, part Z 243.216), not by a drawing:
214698-002 A's callouts are diameters, the recess floor (2.61 ±0.05 — matches mesh face 151
to 0.0006, the only evidence the mesh frame is the drawing's frame), a flange feature
(3.708 ±0.127, unmatched, not claimed) and an overall (13) reference. The step's height is
model-defined (note 5).

Reconciliation against the section: at 72° the heads rest on the **mount's** end-stop
surface and the 64.465 gap is above them, to the **cover's** internal shoulder. The cover's
`82.154 ±0.020` runs from its flange face to exactly that shoulder. So the 2026-10-16 graph
had the two owners swapped. Renamed (no bindings in the feature-identity inbox or the tree):
`piston_head_upper_top_face` → `piston_head_upper_step_face`;
`gas_spring_mount_end_stop_face` → `piston_cover_end_stop_shoulder` (now a cover node).
`endstop_feather_contact` kept its id and gained the mount as a part. All edge ids are
unchanged, but the cover and mount edges' `from`/`to` were re-authored from the flange seat
(+Z) so the walk's signs (−,−,−,+) come out as before and part membership validates. The
handoff said every id stays byte-identical; renaming these two was the allowed exception
("rename the node if its id now lies"), and the second one I extended to by the same logic.

## The cover: dimensioned

Sheet 1 extracted no dimensions (it is the notes sheet), sheet 2 is bore and port detail, and
sheet 3 carries the length as one callout: neither absence nor unreadable.

## Guards that tripped, and ones that did not

- A new `tests/test_end_stop_travel_study.py` pins the four values, bands and confidences, the
  fold to three decimals, the run ids, and the traced count the worksheet quotes in prose
  (2 of the chain's 4). The worksheet's `claim` fence is the registry's seeded-stack figure,
  5 of 26, and does not move.
- No viewer README/comment digit moved this time: the node and edge counts are unchanged
  (two nodes renamed, none added), so `apps/` was not touched.
- Source refs only accept the `SourceRef` fields: `view_id` and `bbox` are not fields and
  `from_dict` drops unknown keys silently, so they live in `note` (and `view` holds the
  drawing's view name). Worth a field if more citations come from extracted runs.

## Not done / to know

- The SOP says copy a cited part PDF into `data/inbox/drawings/` and cite it repo-relative.
  The handoff said to cite drawing-checker's paths and treat them read-only, so I cited the
  absolute inbox paths with the sha256 (re-hashed equal to each run's recorded input) and
  copied nothing. `build_viewer_crops` raised nothing on the two cited edges and lists only the two untraced ones as having no document, as expected.
- Mutation-witness tier not run: nothing guarded was touched; it is the merge's job.
- Forge todo `20261016T165622_zy675c` noted (note `20261020T155622_swylmr`); Jeff ticks it.

## Projections

Shared projection untouched. Shadow copy at a scratch `data/` (projections, inbox, meshes, runs
from the main checkout; docs from this tree) built with `--allow-older-tree` **after
committing** — the tier refuses a dirty-tree stamp — and the viewer `[real]` tier read it:
522/522. The scratch copy under the main checkout's `data/scratch/r` was deleted after.
