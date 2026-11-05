---
priority: med
depends_on: []
model: sonnet
hitl: false
---

# HANDOFF 2026-11-05 — the_annotator_reads_a_nodes_declared_face: the annotator arms and classes an end from its node's declared `face`, as the proposers already do

Source: `docs/issues/ISSUE_20261103_the_annotator_does_not_read_a_nodes_declared_face.md`, routed by the
2026-11-05 triage sweep. Baseline: master at or after `1dce46ad`. Scope: `apps/annotate/` (`sweep.js` and
its tests, `apps/annotate/run_tests.cjs`). Do NOT touch `scripts/run_viewer_browser_tests.mjs` (owned by
the staged `the_seam_and_rail_checks_wait_on_settled_state`), and do NOT touch
`tolerance_stack/feature_geometry.py` (owned by the staged `a_two_row_cylinder_band_fits_as_a_cylinder`).

## Why now

Jeff's open annotator tasks (bind the pitch plate's link hole; reject the proposed pitch-plate centre
face) run through this code. Since 2026-11-03 a topology node may declare `face: {part, surface}`
(schema `tolerance_stack/topology.py` `NODE_FACE_FIELDS`, documented in `docs/DAG_TOPOLOGY.md`, "Which
face an end is"). `scripts/build_contact_suggestions.py` and `scripts/propose_bindings.py` read it first,
and the topology projection's node rows carry it along with `hardware_ref`. The annotator in the browser
still guesses.

## Deliverables

1. **`AA.pickEndPartIds`** (`apps/annotate/sweep.js`) arms on the node's declared `face.part` when present.
   Fall back to `node.part` / `parts[0]` only when no face is declared.
2. **`AA.endSurfaceClass`** classes an end by its declared `face.surface` when present, and by its words
   only as the fallback. Worked case: `pitch_plate_spindle_bore_axis`, named "pitch plate pilot boss axis"
   since 11-03, has no shape word in its name and is declared `cylindrical`. Today its suggestions colour
   nothing; after this, they colour as cylindrical.
3. Name every annotator site that classifies or arms an end (suggestion tint, proposal list, rail, any
   other caller of these two). Route them all through the declared face, or list in the lesson the ones
   deliberately left alone.

## Definition of done

- Annotator node tests: a declared-face node arms its declared part and classes by its declared surface;
  an undeclared node keeps today's behaviour. `node apps/annotate/run_tests.cjs` is green, and so is the
  default tier.
- A screenshot of the annotator on `pitch_plate_spindle_bore_axis` showing its suggestions coloured
  (projection rebuilt from your tree), committed with the lesson.
- Lesson (`docs/sessions/lessons/LESSONS_20261105_the_annotator_reads_a_nodes_declared_face.md`): every
  site the declared face now reaches.
