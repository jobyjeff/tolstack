---
priority: med
depends_on: []
model: opus
---

# HANDOFF 2026-09-10 — mesh_part_alias_table: a declared, tracked alias table maps topology `part` ids to mesh `part_id`s

Source: locked strategy brief 2026-09-10, consuming
`docs/strategy/BRIEF_20260909_topology_part_vocabulary_mesh_mapping.md`
(CONSUMED marker on that file records the decision). Decision, per that
brief's option (b): **an explicit, tracked mapping table** — declared
configuration, not code guessing, and not renaming/re-tessellating the
installed meshes (option a), and explicitly not fuzzy matching (option c,
rejected in the brief: `machined_213668` vs `gas_spring_mount_213668_002`
share a drawing-number digit run, and so would genuinely different parts).
Baseline: post-batch-merge master (the batch-merge folds in
`annotate_deep_link_and_part_filter`, which built the deep link this feeds).
If master still lags integration at launch, branch from `integration`.
Scope: `apps/annotate/`, the new tracked alias artifact, its tests, and
`data/meshes/README.md`. Do NOT touch: `apps/viewer/` (owned by the parallel
`viewer_leader_line_grid` handoff — the viewer already emits the edge's own
`part` as `isolate=` and needs no change); the projection builders;
`docs/topologies/` topology files.

## The gap, concretely

A topology edge's `part` (e.g. `gas_spring_mount_213668_002`, `hub` —
authored per-edge, 12 distinct parts across `pitch_system`) and a mesh's
`provenance.json` `part_id` (e.g. `machined_213668`, `blade_oml` — rotorkit
tessellation-run naming, see `data/meshes/README.md`; meshes live at
`C:\workspace\tolstack\data\meshes\<sha256>\`, main checkout only) are two
unmapped vocabularies: **zero exact matches** at lock time. So the viewer's
"annotate this →" deep link boots the annotator correctly but its `isolate=`
almost always lands on the honest empty state ("no installed mesh for hub").
The empty state is correct behavior and stays; this handoff makes the isolate
actually fire where a mesh genuinely exists.

## Deliverables

1. **The alias table** — a tracked JSON artifact (suggested home:
   `docs/topologies/part_mesh_aliases.json`, beside the topology files that
   own the part vocabulary; pick a better spot if repo conventions argue for
   one and say why in the lesson). Shape: topology part id → mesh `part_id`
   (map to `part_id`, not sha256, so a re-tessellated mesh under the same
   part identity keeps its aliases). Include a header/`schema` field per this
   repo's artifact conventions.
2. **Every alias is declared from evidence, never inferred.** This repo's one
   rule applies to identity as much as to values: an entry asserts "these two
   strings name the same physical part" and must be justifiable from the mesh's
   own `provenance.json`, `data/meshes/README.md`, or a drawing number — if
   you cannot establish the identity for a pair, leave it unmapped (the empty
   state is the honest answer) and record it as a gap in the lesson. The two
   installed meshes at staging time are `machined_213668` and `blade_oml`;
   whether either maps to a pitch_system part is yours to establish, not
   assume.
3. **Resolution wiring**: `apps/annotate/commands.js`'s
   `resolveMeshIdentifier` consults the table (exact-match on either side of
   an alias; still no fuzzy matching). `commands.js` is the DOM-free half
   tested with plain arrays by `run_tests.cjs` — keep it DOM-free: inject the
   table, don't fetch inside it. The app-side loading goes where
   `apps/annotate/app.js` / its storage layer already load config/data.
4. **Pairing tests, both directions** — vocabulary drift is this repo's
   most-repeated defect (see `docs/prompts/REVIEW_AGENT.md`): a real-data
   test tier asserting every alias's topology-side key appears in the live
   topologies' `parts` vocabularies and every mesh-side value matches an
   installed mesh's `provenance.json` `part_id` (run against
   `C:\workspace\tolstack\data\...` main-checkout paths; skip honestly when
   run where the data is absent, matching the existing `[real]` tier
   pattern), plus fixture-tier unit tests for the resolution precedence
   (direct `part_id` match wins; alias consulted second; unmapped → the
   existing empty state).
5. **`data/meshes/README.md`** gains a short section naming the alias table
   as the one sanctioned bridge between the two vocabularies (so the next
   mesh installer knows aliasing beats renaming).

## Definition of done

- `node apps/annotate/run_tests.cjs` green with the new coverage;
  `C:\workspace\tolstack\venv-win\Scripts\python.exe -m pytest -q` green.
- A real end-to-end demonstration recorded in the lesson: for at least one
  edge whose part you could evidence-map, the deep-link `isolate=` now
  resolves to a loaded mesh (or, if NO pair proved mappable from evidence,
  the lesson says exactly that — an honestly-empty table is an acceptable
  outcome; the machinery and tests still land).
- Lesson (`docs/sessions/lessons/LESSONS_20260910_mesh_part_alias_table.md`):
  the table home + schema as shipped, which pairs were mapped on what
  evidence, which remain unmapped and why, and the resolution precedence.
