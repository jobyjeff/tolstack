---
priority: med
depends_on: [everything_in_3d_is_transparent_until_an_action_needs_a_face]
model: sonnet
hitl: false
---

# HANDOFF 2026-11-05 — the_piston_heads_and_cover_ride_with_their_bodies_in_the_kinematic_model: the two piston heads and the piston cover are in the stop stacks but not in the kinematic 3D model; they move with the piston body and the mount

Source: Jeff, 2026-11-05 (strategy session, after his note `20261105T164140_sm8hkc`): "a bunch of
the piston head and piston cover components are missing from the kinematic model, even though
they are part of the tolerance stack." Baseline: master after the 11-03 batch. Measured
2026-11-05 in the strategy session: `docs/topologies/topology_vpa_pitch_linkage.json` declares
`piston_head_lower_214699_002`, `piston_head_upper_214698_002` and `piston_cover_214958_002` as
parts **and as three single-part bodies of their own** (`bodies[]`), alongside `base` (hub, tan-link
mount, gas-spring mount), `pitch_plate` (plate + `gas_spring_piston_214700_002` + hardware) and
the links. The stop sub-stacks cite them: edges `piston_head_lower_thickness`,
`piston_head_upper_thickness`, `piston_head_lower_face_flatness` (part = a head),
`piston_cover_flange_to_end_stop` (part = the cover). Three mesh manifests under
`C:\workspace\tolstack\data\meshes\` name those part numbers, so meshes exist. The kinematic
study's 3D scope is `VA.litPartIds` (`apps/viewer/topology.js:4103`; 9 solid / 38 ghost on 11-03),
and the sweep's poses come from linkage's sweep artifact, which moves the solver's bodies only.
Scope: the topology's `bodies[]`, the kinematic study's part scope, and the annotator's model
layer (`apps/annotate/model_layer.js`) where a body's pose is taken from the sweep. Do NOT touch
linkage (another repo; if the fix needs a solver-side change, file it as a linkage issue and
build the tolstack side), opacity rules (owned by the handoff this depends on), or the grid.

## The physical mapping (from the topology's own node names; confirm against 217755 and say so)

- The lower piston head sits on the piston body's shoulder (`piston_body_head_seat`: "lower
  piston head lower face on the piston body's shoulder") and the upper head's recess holds the
  body's top face (`piston_body_top_face`): **both heads ride with the piston body**, which is
  in the `pitch_plate` body. At the feather stop the lower head's lower face contacts the mount's
  end-stop surface (`endstop_feather_contact`).
- The piston cover's bottom flange sits against the mount flange (`piston_cover_mount_flange_seat`):
  **the cover rides with the gas-spring mount**, which is in `base`.

## Deliverables

1. **Measure why they are missing.** On the live kinematic study, list every part the study's
   edges cite, every part `VA.litPartIds` returns, every part the 3D pane draws at rest and
   while playing the sweep, and every body the sweep artifact poses. The diff is the finding;
   record it before changing anything.
2. **Declare the ride.** Fold the three single-part bodies into the bodies they move with
   (heads → `pitch_plate`, cover → `base`), or, if the topology needs them to stay separate
   bodies for the stack's sake, add a declared `rides_with` on the body that the model layer
   honours when it poses parts. Prefer the fold unless a test or the DAG's one-container-per-body
   rule needs the separation; say which you chose and why. `docs/DAG_TOPOLOGY.md`, "Bodies",
   states the rule once.
3. **They are drawn and they move.** At rest and in the sweep the heads move with the plate
   and the cover stays with the mount; the kinematic study's 3D scope includes them (they are
   its parts); the stop rows' crops and faces resolve to them.

## Definition of done

- Screenshots: the kinematic study's 3D pane at the feather stop and at the low stop with the
  heads and cover visible and in the right place (the lower head on the end stop at feather).
- A test pins that every part cited by a study's edges is in that study's 3D part set.
- `pytest -q`, viewer and annotate browser tiers green; body-count pins re-measured with the
  reason stated.
- Lesson (`docs/sessions/lessons/LESSONS_20261105_the_piston_heads_and_cover_ride_with_their_bodies_in_the_kinematic_model.md`):
  the four-list diff, the fold-vs-rides_with choice, and whether linkage needs anything.
