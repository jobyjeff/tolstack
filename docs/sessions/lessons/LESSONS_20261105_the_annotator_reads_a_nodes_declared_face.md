# Lessons — the annotator reads a node's declared face (2026-11-05)

## What changed

- `AA.pickEndPartIds` (`apps/annotate/sweep.js`) returns `[node.face.part]` when the end node declares one; otherwise the old `part`/`parts`/edge fallback.
- `AA.endSurfaceClass` (`apps/annotate/suggestions.js`) answers a declared `face.surface` first, as `{where: "declared", rule/says/word: null}` — the same shape `feature_geometry.end_surface_class` returns.
- Two annotate guards (declared part arms alone; declared surface beats words and an undeclared node keeps today's behaviour), each enrolled with a mutation spec; `annotate` pin 280 -> 282.

## Every site the declared face now reaches

- `app.js` armed pick (`AA.pickEndPartIds` at the Pick arm) and the bound-face lookup that follows it (same function): reached.
- `suggestions.js` `planEnd` (suggestion tint, the binding panel's "likely faces" list, stage 1 pool): reached via `endSurfaceClass`. `end.rule`/`end.says` are now null for a declared end; nothing in the apps reads them.
- Proposal list / contact-suggestion rows: read the Python-built projections, which already used the declared face; unchanged.

## Deliberately left alone

- `AA.edgePartIds` (`sweep.js`): lists every part on an edge and at its ends to name drawings and light hover; a declared face is one part of those, and narrowing it would hide drawings to read. Not a pick or a class.

## Verified / gotchas

- Screenshot `shots/the_annotator_reads_a_nodes_declared_face/plate_end.png`: the pitch plate's end of `pitch_plate_attach_radius` now says "493 likely faces -- every face of the right kind on this part" (previously nothing, the name has no shape word). Taken with `tests/debug_declared_face_shot.mjs`, which serves this worktree's `apps/` through route interception over the live 8000 mount's data (the projection there already carries `face`; no rebuild was needed or run).
- `node apps/annotate/run_tests.cjs`: 282/282. Mutation witnesses for both new specs: 2/2 WITNESSED.
- Full `pytest -q` in the worktree (9m54s, before the specs were added): 4 failed — `test_viewer_js_suite` (expected in a worktree, see CLAUDE.md), the enrollment census (fixed by this change's specs and pin; re-run alone green, 44 passed) and two `test_mutation_witness_shadow_concurrency` tests that fail here because the worktree has no projection and a stale `tmp/` shadow dir is EPERM-locked — environment, not this diff.
- Not run: viewer browser TRUTH tier and `--changed-since master` sweep (main checkout only).
