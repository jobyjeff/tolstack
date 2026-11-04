---
priority: high
depends_on: []
model: opus
hitl: true
---

# HANDOFF 2026-11-03 — the_slide_joint_is_the_mounts_bushings_against_the_piston_body: the pitch-plate slide is authored on the parts that actually touch, and the mount is placed

> **⚠ INTERACTIVE EXCEPTION (HITL), 1 item:** deliverable 3 needs an assembly
> placement for `gas_spring_mount_213668_002`. Look first in rotorkit's
> extractions (`C:\workspace\rotorkit\data\runs\assembly_extract_*\` —
> `products.json` / placements for 217755) and in
> `C:\workspace\tolstack\data\meshes\` provenance. If no source places the
> mount, file the ask as an issue with `needs: jeff` and
> `ask: Export 217755 at the as-modelled pose with 213668-002 included, so the gas-spring mount can be placed`
> and **do not block**: deliverables 1, 2, 4 and 5 are independent of it.

Source: Jeff's forge note `20261103T165357_43vf96` (2026-11-03), tried live on
the shell's kinematic rail: *"The joint being referenced actually doesn't make
sense because there is no joint between the hub spindle and the gas spring. The
two surfaces that control the pitch plate slide joint would be cylindrical
surfaces of the gas spring mount (213668-002 in the 217755 propulsion assembly,
though technically the bushings themselves are GR04WB328AT11, 213668-002 isn't
even included in the 3d model for some reason even though it's the first line
item in the grid view rollup) and piston body (214700-002) which is rigidly
attached to the pitch plate. When I try to choose pitch plate spindle bore
axis, it preselects the pitch plate which is part of the rigid body, but
doesn't actually include the interface surface."* Jeff's words are the
authority on what touches what; the drawings are the authority on numbers.

Baseline: `master` with every 10-29/10-30 tolstack handoff landed (the datum,
the CAD-style pick, the rail-row proposals, the armed pick on either part, the
contact engine that asks the ends their shape). Scope: `docs/topologies/`
(the one product topology and its studies), `scripts/build_contact_suggestions.py`,
`scripts/propose_bindings.py`, `tolerance_stack/` where the loader must learn
a word, `tests/`, the mesh/placement data under `C:\workspace\tolstack\data\`
by absolute path. Do NOT touch `apps/annotate/` or `apps/viewer/` beyond what
a renamed node forces (the sibling handoffs
`a_joint_end_lists_its_candidate_faces_and_says_why_each_is_there` and
`the_kinematic_grid_is_a_stack_of_sub_stacks` own those apps this batch).

## What is authored today, measured 2026-11-03 on `docs/topologies/topology_vpa_pitch_linkage.json`

- Node `hub_spindle_bore_axis` — parts `['hub']`, **name "hub spindle bore
  axis -- the gas-spring bushing bore"**. Two interfaces mangled into one name.
- Edge `gas_spring_bushing_coaxiality` — `hub_spindle_bore_axis →
  gas_spring_mount_bushing_bore`, joint kind `cylindrical_slide` (per
  `docs/issues/ISSUE_20261029_the_gas_spring_sits_at_another_stroke_and_its_mount_has_no_placement.md`).
  This is the joint Jeff says does not exist.
- Node `gas_spring_mount_bushing_bore` — parts
  `['gas_spring_mount_213668_002', 'gas_spring']`, "gas-spring mount bushing bore".
- Part aliases (`docs/topologies/part_mesh_aliases.json`):
  `gas_spring_mount_213668_002 → machined_213668`,
  `gas_spring_piston_214700_002 → asm217755_214700_002` (both meshes exist).
- `gas_spring_mount_213668_002` records **no assembly placement**, so it is
  drawn nowhere in 3D while it heads the kinematic grid's travel sub-stack
  (edge `gas_spring_mount_flange_to_end_stop`, 8.667 ±0.5).
- The rail's "pitch plate spindle bore axis" end pre-selects the whole pitch
  plate (`pitch_plate_215177_001`) with no interface surface named.

## Deliverables

1. **The slide joint is between the mount's bushings and the piston body.**
   Re-author the joint so its two ends are (a) the bushing bore(s) in
   `gas_spring_mount_213668_002` — record the bushing hardware
   `GR04WB328AT11` on the node (`hardware_ref` or the node's note; the SOP's
   hardware convention wins), the mount is the part, the bushing is what the
   face belongs to — and (b) the outer cylindrical surface of the piston body
   `gas_spring_piston_214700_002`. Joint kind stays `cylindrical_slide`. Name
   the edge for what it is (suggestion: `pitch_plate_slide_bushings_to_piston_body`).
   Declare in `bodies[]` that `gas_spring_piston_214700_002` moves with the
   pitch plate (Jeff: "rigidly attached to the pitch plate") if it is not
   already in that body. Every study and kinematic study that selected the
   old edge (`grep gas_spring_bushing_coaxiality docs/topologies/`) is
   re-pointed; `kinematic_study_vpa_pitch_linkage_blade_pitch_at_the_stops.json`
   names "gas-spring bushing tipping" as unmodelled — leave that note true or
   update it, do not silently drop it.
2. **The hub node says one thing.** `hub_spindle_bore_axis` is named "hub
   spindle bore axis" and nothing else; whatever the dropped half of the old
   name referred to is either a node of its own or gone, and the lesson says
   which. Every edge that touched the hub node keeps its meaning (the
   coaxiality to the pitch plate spindle bore stays — that one is real).
3. **The mount is placed.** `gas_spring_mount_213668_002` gets an assembly
   occurrence so the scene draws it where it sits (base face against the hub
   seat, the cover flange seated on it). See the HITL block for the source
   search order; a placement **derived from mates is not acceptable** — it is
   an invented value. With a placement in hand, re-run
   `scripts/build_contact_suggestions.py` and the mount's contacts
   (`gas_spring_mount_hub_face`, `endstop_feather_contact`,
   `tan_link_mount_gas_spring_seat`) should stop reading `no_occurrence`;
   record before/after counts.
4. **The pitch plate end names its interface surface.** The end at
   `pitch_plate_spindle_bore_axis` (and every end whose part is a rigid body
   member) carries the surface class and which part of the body the face is
   on, so a pre-selection lights a bore, not a plate. If the topology schema
   has no word for "this end's face is on member X of body Y", add the
   smallest one and say so in `docs/DAG_TOPOLOGY.md`.
5. **Proposals and candidates are rebuilt for the changed ends.** After 1–4,
   run `scripts/build_contact_suggestions.py` and `scripts/propose_bindings.py`
   for the edges whose ends changed (new edge, renamed hub node). Proposals on
   the deleted edge are superseded, never silently orphaned: the projection
   must show them as such, or the lesson explains why the fold already does.
   Do not re-propose edges you did not touch.

Suggestion to investigate: the end-stop studies (`study_pitch_system_end_stop_minus7/plus72.json`)
name "gas-spring bushing tipping backlash (0.72 deg)" as the source workbook's
largest unmodelled term. With the slide joint on the right parts, a tipping
term becomes authorable (bushing clearance × lever). Do not author it here;
state in the lesson what it would need.

## Definition of done

- `venv-win/Scripts/python.exe -m pytest -q` green; the topology loader
  accepts the re-authored joint; a value-level test pins the new edge's ends,
  kind, parts and the hardware ref.
- The viewer (`http://127.0.0.1:8000/tolstack/viewer/`, nav → Kinematic
  studies → Blade pitch at the end stops → joints) lists the slide joint with
  its two ends named on 213668-002 (bushing GR04WB328AT11) and 214700-002; the
  hub row reads "hub spindle bore axis". Screenshot in the lesson.
- With the mount placed: the 3D pane draws 213668-002 at the hub seat
  (screenshot), and the contact suggestions for its three interfaces are no
  longer `no_occurrence`. Without a placement: the issue is filed with the
  ask and the lesson says what was searched.
- Issues routed here get `status: triaged` + `handoff:` pointing at this file
  before you start, and `resolved` with a line when done:
  `ISSUE_20261029_the_gas_spring_sits_at_another_stroke_and_its_mount_has_no_placement.md`
  (deliverable 3).
- Lesson (`docs/sessions/lessons/LESSONS_20261103_the_slide_joint_is_the_mounts_bushings_against_the_piston_body.md`):
  the old vs new joint in one table; where the placement came from (or what
  was searched); the proposal/candidate counts before and after; what the
  tipping term would need.
