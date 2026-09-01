---
priority: high
depends_on: []
---

# HANDOFF 2026-08-31 — dag_topology_format: the tolerance-topology data model + chain summation (no viewer yet)

Source: locked brief
`C:\workspace\dispatch\docs\strategy\HANDOFF_20260831_tolstack_dag_strategy.md`
— read it first; it carries the full model, the MVP fence (NOT a solver), and
Jeff's design intent verbatim. Baseline: tolstack trunk. Scope: new topology
module + documents + tests; do NOT touch the existing stack viewer
(`dag_viewer_poc`, staged alongside, owns all rendering), the SOP, or
existing stack JSONs (read them, never edit).

## The model (from the brief, binding)

Nodes = mating surfaces/interfaces. Edges = structural dimensions (two
interfaces on the same part) or gaps (interfaces between parts). Every edge
may carry a `transform` (default 1.0 — constant ratio for v0; leave a typed
bag so richer kinematic transforms can arrive later without a schema break).
A **study** = a human-selected chain/subset of one global topology; summing a
study = applying transforms and summing elements along the selection
(worst-case and RSS, matching this repo's existing stack conventions).
Parallel load paths are represented in the topology but NEVER auto-resolved —
which path binds is a human/mechanics decision.

## Deliverables

1. **Topology + study document formats** — filesystem JSON (locked: no
   SQLite). One topology document per system (nodes, edges, transforms,
   per-part grouping so a rail/swim-lane renderer can color by part);
   studies as separate documents referencing node/edge ids. Identity keys
   must stay compatible with the existing stack elements' identity
   conventions (the brief's watch item — the 3D-annotation surface will share
   this vocabulary; don't invent a disjoint naming scheme).
2. **Traversal + summation**: load a topology, select a study, produce the
   ordered chain with per-element contribution (value × transform), worst-
   case and RSS totals. Cycle-guarded, branch-aware (a study that spans a
   branch point without choosing a branch is an error with a helpful
   message, not a guess).
3. **L1 proof: re-express one committed fastener grip stack** (pick the
   cleanest existing stack JSON) as a topology + study. Value-level test:
   the study's totals match the existing stack's published numbers exactly.
4. **L2 topology: author the pitch-system DAG** from the brief's description
   (VP actuator → pitch plate; branch to gas spring / hydraulic brake;
   branch through pitch links → pitch arms → blade roots; blade roots →
   ring gear, cyclic-only). Use nominal/placeholder values where no sourced
   number exists — **the topology is the deliverable, values arrive later**;
   mark placeholders as untraced per repo convention (this repo's
   cite-or-gap rule applies to VALUES; structure is Jeff's own description,
   cite the brief). Include the one required transform: the linear↔rotary
   coupling at the pitch arm (placeholder ratio, marked as such).
5. **Docs**: a short `docs/DAG_TOPOLOGY.md` — the model, the not-a-solver
   rule, format examples. Also fill tolstack's `CLAUDE.md` template stub with
   real orientation (one paragraph + pointers to the SOP/archetype docs) —
   cheap add-on the brief asked for.

## Definition of done

- L1 study totals == the existing stack's numbers (pinned test).
- Pitch-system topology loads, both branches traverse, the branch-point
  error case is tested, the transform applies in a study that crosses it.
- Full suite green.
- Lesson (`docs/sessions/lessons/LESSONS_20260831_dag_topology_format.md`):
  schema decisions (esp. identity-key compatibility choices), what the
  viewer handoff needs to know, open modeling questions for Jeff.
