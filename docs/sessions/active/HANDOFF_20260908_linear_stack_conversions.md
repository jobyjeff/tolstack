---
priority: high
depends_on: [topology_schema_v1]
---

# HANDOFF 2026-09-08 — linear_stack_conversions: re-express the four remaining linear stacks as dimension_ref topologies

Source: strategy decision 2026-09-08 (locked brief
`dispatch/docs/strategy/HANDOFF_20260908_tolstack_viewer_redesign_strategy.md`).
Baseline: trunk + `topology_schema_v1` merged (read its lesson first — the
path-referencing-check verdict decides tan_link's fate below). Scope:
`docs/topologies/` (new files), `tests/` (new conversion tests). Do NOT
touch: the stack JSONs in `docs/tolerance_stacks/` (they are the immutable
citation sources — read-only), `tolerance_stack/` models,
`docs/SOP_TOLERANCE_STACK.md`, `apps/`.

## The pattern (proven, not hoped)

`docs/topologies/topology_vpa_output_to_pitch_plate.json` already re-expresses
`stack_vpa_output_to_pitch_plate.json` with **zero copied numbers**: every
edge is a `dimension_ref` pointer `{stack, element}` resolved at load
(`docs/DAG_TOPOLOGY.md` "dimension_ref"), and `tests/test_topology.py`
asserts the study folds to the identical published check numbers AND that no
value was transcribed. That file is the template for everything below —
including its honesty markers: `provenance.structure` says the nodes and edge
orientation are "a READING of the stack's element order and roles", and
`provenance.part_identity` records where each part name came from.

## Deliverables

Convert, one topology + studies each (nodes invented from element order,
N elements → N+1 interfaces; every edge `dimension_ref`, no inline numbers):

1. **`pitch_link_to_pitch_plate`** — 6 elements, 3 paths, 2 checks. Paths →
   studies; checks → authored study checks (schema v1).
2. **`rotor_fastener_length`** — 11 elements, 1 path, 9 checks (the
   budget-scope set). One study, nine authored checks; the 2 zero-width
   bands must survive as-is (transcription, not tidying).
3. **`tan_link_to_pitch_plate`** — 11 elements, 3 paths, 6 checks **whose
   terms reference paths**. Convert ONLY if `topology_schema_v1`'s lesson
   shipped a shape for path-referencing check terms; if it fenced them, this
   stack stays classic-rendered — record that in your lesson and convert the
   other three.
4. **`tan_link_to_pitch_plate_take2`** — 9 elements, 1 path, 1 check.

Explicitly NOT converted: `hub_bearing_thermal_fit_m1/m2` (not chains — the
thermal archetype stays classic per the locked brief; its graph future is a
separate draft) and `vpa_output_to_pitch_plate` (already done).

## Constraints

- **Nothing is invented** (repo rule 1): a node/part name either comes off
  the stack's own fields (`role`, `hardware_ref`, `note`, worksheet) or is
  recorded as a reading in `provenance`, exactly like the L1 file did.
- Traced ratios must be unchanged by construction (dimension_ref points at
  the cited element; there is nothing to re-trace). If a conversion tempts
  you to "fix" a source_ref, stop — that is a separate finding, file an
  issue.
- Feature-identity interlock: existing `feature-identity/v0` bindings key on
  `{stack_id, element_id}` and are untouched by this work; the new topology
  edges create NEW `{topology_id, edge_id}` keys. Do not write any binding
  events; just keep edge ids stable and legible (they become annotation
  vocabulary).

## Definition of done

- Per converted stack, a value-pinned test in the `test_topology.py` mold:
  every published check number reproduced through the topology fold, plus
  the no-copied-values assertion.
- Full suite green (`venv-win/Scripts/python.exe -m pytest -q`).
- Projections rebuild clean from the main checkout
  (`scripts/build_topology_projection.py` exits 0, all converted stacks
  appear with studies).
- Lesson (`docs/sessions/lessons/LESSONS_20260908_linear_stack_conversions.md`):
  which stacks converted, tan_link's outcome, and anything the element-order
  reading had to decide that a future reviewer should re-derive.
