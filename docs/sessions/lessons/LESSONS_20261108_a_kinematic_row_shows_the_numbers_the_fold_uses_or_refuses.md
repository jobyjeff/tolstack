# Lessons — a_kinematic_row_shows_the_numbers_the_fold_uses_or_refuses (2026-11-08)

Screenshot of the full grid, linkage rows legible (scratch projection built from this tree,
not the main checkout's): `shots/a_kinematic_row_shows_the_numbers_the_fold_uses_or_refuses/grid.png`.

## What changed
- `Contributor` gains `geometry` (authored `geometry.names` keys), `measured`, `cited_nominal`,
  `refusal`. `row_display()` builds ONE record per row from the term the fold consumed
  (`row.term.element`, `sign`, `coefficient`); the grid reads only that record. The fold is untouched
  (bands still about 0.0).
- A row with no band, or no resolvable geometry key, is `refused`: values `no value` (reason on
  hover), blank sensitivity and contribution; linkage sub-stack header, foot and verdict read
  `incomplete`, and the check is `complete: False` with the refusal named in `excluded_terms`.
- Sphere/disk rows print the word `centre` (coordinates on hover) and a radius 0..r: a vector does not fit a number cell.

## Term -> geometry key -> skeleton nominal (sweep vpa-pitch-p2-20261105-204957)
Before: no contributor had a key; I added `geometry` to all six (same labels as `parameters`).
| term | key | skeleton | printed |
| --- | --- | --- | --- |
| pitch_link_length | pitch_link.length | 105.9905 | 105.99 / 105.96 / 106.02 |
| tan_link_length | tan_link.length | 61.4504 | cited 61.40 / 61.35 / 61.45 |
| pitch_plate_attach_height | pitch_link.point_a[2] | 79.666 | 79.67 / 79.57 / 79.77 (band 0 ±0.1 from pitch_plate_flange_to_link_hole) |
| tan_link_mount_height | tan_link.point_a[2] | 110.0269 | 110.03 / 109.93 / 110.13 |
| pitch_arm_radius | pitch_link.point_b[0..2] | (83, −35.355, 35.355) | centre, 0 .. 0.015 |
| pitch_plate_tan_link_attach_radius | tan_link.point_b[0..2] | (80.998, 9.027, 79.666) | centre, 0 .. 0.1 |

## Skeleton vs cited
Only tan_link_length has both: cited 61.40, skeleton 61.4504, +0.0504 — 1% past the ±0.05 edge, worded "at the band's edge" (±5%). A warning in the hover, never a gate.
The cited nominal is read from the term's own topology edge when its dimension nominal is non-zero (pitch_link_length's edge is a 0 workbook convention, so it prints the skeleton).

## Decisions not in the handoff
- A gap row is now a refusal row too (sensitivity blank), counted in `refused_count`.
- `row_display` sensitivity at a pose off the stops is the pose-interpolated one (JS `atPose`); only nominal/band/source are point-independent.

## Verification limits
Worktree cannot arm the real tier: the pairing gate refuses the stale crops projection. I ran the `[real]` checks once on a scratch copy of the runner with the gate stubbed and a projection rebuilt from this tree: the new real test and the kinematic real tests passed (other `[real]` failures there were the scratch dir lacking crops/worksheets/meshes). That is NOT a pass of the tier: the main checkout must run it after `rebuild_projections.ps1`, plus `--changed-since integration` witnesses (from the worktree every viewer witness reads "red before the mutation" because of the same gate). Three specs added for the three new guards; the `combines no element values` and `element cell prints the authored name` anchors were re-pointed.

## Not done / open
- Preview pane wording for a borrowed band was not re-checked (issue closed on the grid's behalf; see its resolution).
- Side finding: nothing compares the sweep's tan link length to the cited band except the hover.
