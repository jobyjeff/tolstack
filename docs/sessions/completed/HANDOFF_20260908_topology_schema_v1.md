---
priority: high
depends_on: []
---

# HANDOFF 2026-09-08 — topology_schema_v1: close the schema gaps that keep two stack formats alive, and make the SOP topology-first

Source: strategy decision 2026-09-08 (locked brief
`dispatch/docs/strategy/HANDOFF_20260908_tolstack_viewer_redesign_strategy.md`;
all facts needed are restated here). Baseline: trunk `master` @ `60dc9e16`
(the 09-06 batch merge; endstop/stroke topologies + annotation surface all
in). Scope: `tolerance_stack/` (topology.py, and stack.py only if a shared
shape needs extraction), `docs/SOP_TOLERANCE_STACK.md`,
`docs/DAG_TOPOLOGY.md`, `scripts/build_topology_projection.py` (emit the new
fields), `tests/`. Do NOT touch `apps/viewer/` or `apps/annotate/` (owned by
`viewer_v2_single_nav`), `docs/topologies/` content beyond what a worked
example requires (conversions are `linear_stack_conversions`' scope), or the
crops builder (owned by `inline_edge_crops`).

## Why

The workspace decided (Jeff, 2026-09-08): **topology is THE authoring
format**; a linear stack is the single-chain special case. Element-level the
models already converged (`Dimension` mirrors `StackElement` field-for-field;
one `fold()` serves both; `topology_vpa_output_to_pitch_plate.json` proves a
stack re-expresses as `dimension_ref` edges with zero copied numbers and
fold-identical results). What still forces stacks to exist as a separate
rendered class is a short list of missing schema shapes. Close them.

## Deliverables

1. **Authored checks on a study.** Today a topology has no field for a
   verdict at all — `docs/DAG_TOPOLOGY.md`'s L1 proof compares totals, never
   a verdict — which is the single reason every stack stayed in the classic
   viewer nav (see `docs/sessions/lessons/LESSONS_20260904_viewer_consolidation.md`
   §1). Give a study an authored `checks` block equivalent in power to
   `StackDefinition.checks` (label, criterion, configuration, workbook_cells,
   guidance, `complete`, excluded terms). Hard constraint: **one `fold()`**
   (design decision 1, `CLAUDE.md`) — checks fold through the existing
   machinery, no second combiner. Acid test: `stack_vpa_output_to_pitch_plate.json`'s
   authored check (worst case vs criterion) must be expressible on
   `study_vpa_output_shank_out` and fold to the identical published numbers.
2. **A joint/context block on topology** mirroring the stack `joint{}`
   (assembly drawing, revision, sheet, view, zone, zone_note, description,
   scope). Optional field; carried into the projection.
3. **A worksheet home.** Stacks locate `WORKSHEET_*.md` by sibling filename
   (the results projection carries `worksheet_file`/`worksheet_source`);
   topologies have nothing — `docs/tolerance_stacks/WORKSHEET_end_stop_graft.md`
   already exists with no stack beside it. Add an explicit worksheet
   reference on topology (or study — decide and document which), emit it in
   the projection, and home the end-stop worksheet as the worked example.
4. **An answer for path-referencing check terms.**
   `stack_tan_link_to_pitch_plate.json` has checks whose terms reference a
   *path* id (`{"path": "bore_min_grip", "sign": -1}`); the topology model
   has no equivalent. Suggested direction (investigate, not binding): let an
   authored study check's terms reference another named study on the same
   topology. If no clean shape survives contact with the real tan_link
   checks, **fence it instead**: document in `docs/DAG_TOPOLOGY.md` that
   path-referencing checks stay stack-side, and say so in the lesson —
   `linear_stack_conversions` reads that verdict to decide whether tan_link
   converts.
5. **Sweep `docs/DAG_TOPOLOGY.md` "What v0 cannot do"** (the four gaps
   recorded building L2): address each in this schema pass or explicitly
   re-fence it with a dated note. None may be silently dropped.
6. **SOP rewrite, topology-first.** `docs/SOP_TOLERANCE_STACK.md` becomes
   the procedure for authoring a topology + studies; the linear chain is
   presented as the degenerate case, not a separate document class. The
   citation core (source_ref, cite-or-gap, traced ratio, lmc/mmc transcribed
   never folded) moves intact. Respect this repo's vocabulary discipline:
   any new field vocabulary is a module-level constant with a prose-pairing
   test (`docs/prompts/REVIEW_AGENT.md` "Documented vocabularies drifting").
7. **Versioning**: suggested (not binding) — additive fields under a
   `joby.tolerance_stack/topology/v1` + `study/v1` schema id with the loader
   accepting v0 files unchanged; whatever you choose, the two existing
   topologies and eight studies must load and fold identically before/after.

## Definition of done

- All existing value-pinned tests green unchanged (the fold numbers for
  `pitch_system`'s 7 studies and `vpa_output_shank_out` are the invariant).
- The vpa authored-check acid test (deliverable 1) passes with the exact
  published check numbers.
- `WORKSHEET_end_stop_graft.md` reachable through the projection.
- Docs guards green (this repo pairs docs against code by test; SOP/
  DAG_TOPOLOGY edits will exercise them).
- Lesson (`docs/sessions/lessons/LESSONS_20260908_topology_schema_v1.md`):
  the path-ref-check verdict (shape chosen, or fenced and why) — the
  conversions handoff depends on it; any v0 gap re-fenced; schema-version
  choice and why.
