---
type: feature
priority: med
status: open
area: viewer/seam-leaders
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261029_a_leader_starts_at_the_mark_it_names_on_every_tier.md
---

# Both of Jeff's leader screenshot rows still have one end with no leg into the scene

The handoff `a_leader_starts_at_the_mark_it_names_on_every_tier` fixed the
wrong leaders. A hovered row now lights exactly its two ends. The overlay clips
by the header's painted band. The page drops its anchor copy on close and on
reload. After that fix, the review's browser run (P2, 1600x1000 and
1920x1080) shows this for the two rows Jeff photographed:

| row | grid->DAG leaders | DAG->3D legs | end with no anchor in the scene |
|---|---|---|---|
| `pitch_plate_flange_to_link_hole` | 2 | 1 | `piston_rod_end_bore` |
| `gas_spring_mount_flange_to_end_stop` | 2 | 1 | `piston_cover_mount_flange_seat` |

The handoff's DoD is met: every leg that is drawn ends at the scene's own
anchor. Jeff's first complaint, though, was literally "the upper line from 2d
to 3d is missing entirely", and on both rows it is still missing. The reason is
an honest absence. Those parts have no installed mesh, so the scene exports
`null` for them (`apps/viewer/README.md`, "Leaders across the seam"). Nothing
on screen tells him that.

`ISSUE_20261027_design_the_model_layer_draws_a_star_at_the_assembly_origin_and_runs_the_blade_lines_1400mm_outboard.md`
(deferred to 2026-11-26) lists the same parts. It is about how the *scene*
draws an origin end, not about what the shell's leader shows for one.

Options for a strategy session:

1. Install meshes for `vpa_piston` and the piston-cover parts. This closes the
   gap for real. Recommended if the exports exist; it may need Jeff's CAD
   export.
2. Draw a short stub at the DAG dot, marked "no 3D geometry". The missing leg
   then reads as an absence rather than a bug. The current rule is "no leader,
   no stub", so this changes it.
3. Leave it as it is, and say so to Jeff.
