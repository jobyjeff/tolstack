---
type: feature
priority: low
status: deferred
area: topology/model-v2
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261112_a_part_may_contain_parts.md
defer_until: 2026-12-15
resolution: deferred 2026-11-15 (triage) -- low defers by default
class: feature_model_gap
---

# Decompose 215177 (pitch plate) and 215175 (tangential link mount) into their bushings

Parts may now contain parts (`parent`, handoff `a_part_may_contain_parts`), but
model v2's `pitch_plate_215177_001` and `tan_link_mount_215175_002` stay single
parts. Each one's mesh is the assembly-level solid, bushings included (215177 is
the plate plus nine bushings). Jeff, 2026-11-12: "leave them as placeholders for
now and decompose them later".

What it needs, sized:

1. **Separate solids for the bushings.** Re-extract the two meshes with each
   bushing as its own body (or extract the detail parts 215735 and the bushing
   part numbers separately). This is a mesh pipeline job in another repo's export,
   and it is the long pole.
2. **Re-keying.** A new STEP means a new `source_step_sha256`, and every binding
   on the old mesh is orphaned (`VA.orphanBindings` will list them).
   On 2026-11-14 the feature-identity log held 11 standing bindings in total.
   The plate's pilot-boss face (`hub_to_pitch_plate_spindle_coaxiality`, `to`,
   face 487) sits on the 215177 mesh. Recount by mesh sha before starting.
   Each orphaned binding has to be rebound by hand, through Accept on a proposal.
3. **Topology.** Add the bushing parts with `parent` set to the plate or the mount,
   in the same body, with `hardware_ref` where `hardware_entries.json` has the
   part. Re-point any node whose face is the bushing's, not the plate's
   (`gas_spring_mount_bushing_bore` is the gas-spring mount's, so it does not
   move). Then rerun the model-view count pins (`tests/test_model_view.py`).
4. **Aliases.** Add a `part_mesh_aliases.json` row for each new mesh.

About one handoff for 2–4 once 1 exists; 1 is blocked on the export.
