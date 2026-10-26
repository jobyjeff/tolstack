---
priority: med
depends_on: [the_dag_draws_bodies_as_containers_and_joints_as_symbols]
model: sonnet
hitl: false
---

# HANDOFF 2026-10-26 — the_fastener_stacks_join_the_model: the four linear-stack topologies become chains inside the product model's bodies, dimmed in every study that does not use them

Source: `dispatch/docs/strategy/HANDOFF_20261026_one_graph_drawn_twice_strategy.md`
(locked brief; Jeff's answer 3: after bodies exist, so each lands inside a
body container), from his walkthrough: "With 2d stacks there were exceptions
for things like the fastener grip length stacks, since they could be judged
in isolation from the other stacks. Now that we have 3d capabilities,
there's a strong argument to consolidate those as well since their
interfaces are still connected to the same 3d body as the other studies
(the pitch plate for example) … they just wouldn't be included in specific
studies that don't involve them (hence they would be displayed dimmed for
that study)." Baseline: `master` with `pitch_system_folds_into_the_pitch_linkage_model`
(the pattern: ids preserved, values unchanged, studies re-pointed, `bodies[]`)
and `the_dag_draws_bodies_as_containers_and_joints_as_symbols` (containers)
merged. Scope: `docs/topologies/` (the four topology files, their fifteen
studies, the model file, `part_mesh_aliases.json`), `tests/`, `docs/DAG_TOPOLOGY.md`
examples, `CLAUDE.md` pointers. Do NOT touch `apps/` (if the merged
projection makes a renderer throw, that is an issue to file against the
containers handoff, not an edit here) or `tolerance_stack/`.

## What is true today (measured 2026-10-26)

| topology | studies | what it is |
|---|---|---|
| `pitch_link_to_pitch_plate` | 3 (`cotter_hole_clearance`, `shank_out`, `thread_region_t`) | the pitch-link-to-plate grip stack (the founding archetype) |
| `rotor_fastener_length` | 9 (`grip_u2h` … `grip_u10h`) | one grip budget per NAS6403 length |
| `tan_link_to_pitch_plate_take2` | 1 (`worst_case_protrusion`) | tangential link to plate grip |
| `vpa_output_to_pitch_plate` | 1 (`shank_out`) | VPA output to plate grip |

Their parts are the plate, the hub, the links and their hardware; the
first merge's lesson records how a shared part id and a shared feature were
reconciled. The merged model has `bodies[]`; the hardware (bolts, nuts,
washers, cotter pins) belongs to the body it clamps to (a fastener is not
a body of its own in v0 — say so in the lesson if a case argues otherwise).

## Deliverables

1. **Fold the four into the model**, the first merge's way: parts, nodes
   and edges added with ids preserved; a feature already in the model
   (the plate's link-attach bore, the hub's faces) is one node, not two —
   the `one_part_feature_one_value_across_topologies` guard is the proof;
   the fifteen studies re-pointed; the four topology files deleted; alias
   rows re-pointed. Every hardware part is assigned to a body (`bodies[].parts`),
   and the gap edges get an `interface` (threads are `thread`, washer and
   head seats `planar`, cotter and hole clearances `clearance`).
2. **Values do not move.** Pin all fifteen studies' totals before, assert
   after, to three decimals; the traced ratio the SOP defines is restated
   nowhere and its declared value in the worksheets follows by machine.
3. **Dimming is already the DAG's rule** (the lit set); verify on one grip
   study that the model draws with only that chain lit inside the plate's
   body container and everything else dimmed, and on the kinematic study
   that the grip chains are dimmed inside their containers.

## Definition of done

- The nav shows one model with its studies grouped under it; each of the
  fifteen studies opens with its chain lit inside a body container and its
  numbers unchanged; `pytest -q` green with the before/after pins; viewer
  `[real]` and browser suites green on rebuilt projections.
- Lesson (`docs/sessions/lessons/LESSONS_20261026_the_fastener_stacks_join_the_model.md`):
  the id-collision table, which body each hardware part went to and why,
  and the final model counts (parts, nodes, edges, bodies, studies).
