---
priority: low
depends_on: [pitch_system_folds_into_the_pitch_linkage_model]
model: sonnet
hitl: false
---

# HANDOFF 2026-10-26 — bodies_and_studies_carry_forge_tags: a body or a study is tagged on forge's identity axes, the nav filters on them, and a variant tag dims the other variant's body

Source: `dispatch/docs/strategy/HANDOFF_20261026_one_graph_drawn_twice_strategy.md`
(locked brief), from Jeff's walkthrough of 2026-10-26: "we're already working
towards using tags to group subsystems in the Enovia/CADBOM tools we're
building, so we should be able to use the same tag vocabulary to filter and
configure these tolerance models/studies", and his variant case (gas spring
vs hydraulic brake: "most of the model is identical but we want to be able to
swap out portions of the stack"). Baseline: `master` with
`pitch_system_folds_into_the_pitch_linkage_model` merged (`bodies[]`; the
brake branch is in the model as a parallel branch, per Jeff's 2026-10-16
ruling that a variant is a note, not a schema slot, until brake geometry
exists — this handoff adds the **tag**, still not a slot). Scope:
`tolerance_stack/topology.py` (tags on bodies and studies, validation),
`scripts/build_topology_projection.py`, `apps/viewer/` nav filter and DAG
dimming hook (small), `docs/DAG_TOPOLOGY.md`, `docs/topologies/` (author
the first tags), `tests/`. Do NOT touch forge (read its `identity.toml`
read-only by absolute path, `C:\workspace\forge\identity.toml`; forge never
imports siblings and siblings never import forge — a copy of the axis
names is refused, a read of the file is fine).

## What is true today

- forge's identity axes are declared in `C:\workspace\forge\identity.toml`
  and used by drawing-checker's container tree (one column per axis, OR
  within an axis, AND across) and by cadbom's subsystem grouping; the
  tag primitive is `{axis: value}` with one most-specific value per axis.
- The topology has `bodies[]` after the merge and no tags anywhere; the
  viewer's nav has no filter.

## Deliverables

1. **`tags` on `bodies[]` and on studies**: `{axis: value}`, validated
   against forge's axes when the file is on disk (a value on an unknown
   axis is a load error naming the axis and the file; with forge absent the
   check is skipped and says so once at build). Author the first tags on the
   merged model: the propeller subsystem on every body, `variant: gas-spring`
   on the plate-side gas-spring body and the studies that fold it,
   `variant: hydraulic-brake` on the brake body and nothing else — read the
   axis names from the file, never guess them; if no axis fits "variant",
   file the ask as an issue with `needs: jeff` rather than inventing one.
2. **The nav filters on tags**: chips over the study list (one per axis
   present), OR within an axis, AND across, the drawing-checker semantics in
   plain words; the DAG dims every body whose variant tag is not the one
   selected (the lit-set rule gains a second dimming reason, stated on the
   surface as "other variant").
3. **Docs**: `docs/DAG_TOPOLOGY.md` gains "Tags" (the axes come from forge;
   the variant rule; no schema slot for variants yet).

## Definition of done

- The merged model's nav shows the axis chips; selecting `variant:
  hydraulic-brake` dims the gas-spring body in the DAG and hides studies
  tagged the other way; `pytest -q` green with the validation cases (known
  axis, unknown axis, forge absent); viewer suites green.
- Lesson (`docs/sessions/lessons/LESSONS_20261026_bodies_and_studies_carry_forge_tags.md`):
  the axes actually found in forge's file and which one carried "variant",
  or the issue filed for it.
