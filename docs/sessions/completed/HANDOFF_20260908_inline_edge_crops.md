---
priority: med
depends_on: [topology_schema_v1]
---

# HANDOFF 2026-09-08 — inline_edge_crops: drawing-cited inline edges get crops too

Source: 2026-09-08 strategy session. The 09-04 "thumbnails = priority"
deliverable silently missed the flagship: `crop_key` is emitted **only for
`dimension_ref` edges** (`scripts/build_topology_projection.py` ~L429-450,
the "honest answer" comment: crops.json is keyed by stack id + element id,
an inline edge is in no stack). Live numbers: `vpa_output_to_pitch_plate` —
7 edges, 6 crop_keys, all resolved; `pitch_system` — 23+ edges, ALL inline,
**0 crop_keys, 0 thumbnails**, despite 6 of them carrying real drawing
`source_ref`s. Baseline: trunk + `topology_schema_v1` merged (this handoff
follows it purely to avoid concurrent edits to
`build_topology_projection.py`). Scope: `scripts/build_topology_projection.py`
(crop_key emission), `scripts/build_viewer_crops.py` (resolution), `tests/`.
Do NOT touch `apps/viewer/` (owned by `viewer_v2_single_nav`),
`tolerance_stack/` models, `docs/topologies/`.

## Deliverables

1. **Emit a crop key for inline edges whose dimension carries a croppable
   `source_ref`** (drawing export or spec-pile PDF — the same two rules the
   crops builder already implements: `source_ref_export`, `spec_pile`).
   Suggested key shape (investigate, not binding): topology-scoped, e.g.
   `"<topology_id>:<edge_id>"`, kept distinct from the stack-keyed space so
   nothing collides.
2. **Resolve them in `build_viewer_crops.py`**: read citations from
   `docs/topologies/*.json` inline dimensions alongside the existing stack
   scan; same sha256-verification and unresolvable-reporting discipline.
   Workbook-sourced and `kind: "assumed"` dimensions (9 + 9 on
   pitch_system today) are **legitimately uncroppable** — they must land in
   the "unresolvable, and here's why" report with honest reasons, exactly
   like spreadsheet-sourced stack elements do today, never as errors.
3. **Viewer compatibility without touching the viewer**: the topology grid's
   crop trigger already fires off an edge's `crop_key` and looks it up in
   the crops projection. Verify against the real repo whether the existing
   lookup resolves your new keys as-is. If it genuinely cannot without an
   `apps/viewer` edit, do NOT make that edit — record precisely what
   `viewer_v2_single_nav` must add (it is in flight and owns that tree),
   and still land the builder side.

## Definition of done

- Rebuild from the main checkout: pitch_system's 6 drawing-cited edges
  produce crop entries (sha-verified where the source PDF exists), and the
  unresolvable report names the workbook/assumed edges with reasons.
- Value-level tests: a fixture topology with one inline drawing-cited edge,
  one workbook edge, one `dimension_ref` edge — exactly one new crop key,
  the ref edge's key unchanged, the workbook edge reported unresolvable.
- Existing crops output for the 7 stacks byte-stable (or the diff explained
  in the lesson).
- Lesson (`docs/sessions/lessons/LESSONS_20260908_inline_edge_crops.md`):
  the key shape chosen, the viewer-compatibility verdict (deliverable 3),
  and the resolved/unresolvable census after.
