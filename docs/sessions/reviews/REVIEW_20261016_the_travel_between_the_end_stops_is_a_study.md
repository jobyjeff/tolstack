---
type: review
handoff: docs/sessions/active/HANDOFF_20261016_the_travel_between_the_end_stops_is_a_study.md
reviewer: review agent
date: 2026-10-16
verdict: APPROVE
blockers: 0
---

# Review — the_travel_between_the_end_stops_is_a_study (2026-10-16)

**Verdict: APPROVE.**

## Verified
- Merged `handoff/the_travel_between_the_end_stops_is_a_study`; `pytest -q` (venv from main checkout, `tests/test_viewer_js_suite.py` deselected as the documented worktree-only red): 1473 passed, 1 skipped. `node apps/annotate/run_tests.cjs`: 189/189.
- Existing topology ids/dimensions untouched (additions only); parts, nodes, four dimensioned edges, derived `travel_between_end_stops` gap, study, worksheet, aliases, inventory sentence all present.
- Arithmetic: 82.154 - 8.667 - 2.491 - 12.5094 = 58.4866, matches lesson; signs (-,-,+,-) follow from the walk.
- Every value is `assumed`/`untraced` with PLACEHOLDER; nothing presented as traced. Piston body correctly excluded with reasoning from the meshes.

## Findings (non-blocking)
- Scope: edits to `apps/viewer/README.md`, `views/topology.js` (digits in prose/comments), `tests/test_tolerance_stack.py` count and `PROVENANCE.md` were forced by count-pairing guards and are disclosed in the lesson. Accepted. The parallel kinematic-study handoff may touch the same README lines (trivial merge).
- The study has no `complete: false` / `excluded_terms` as the handoff asked; the schema has nowhere to say it when there is no check. The tactical agent filed an issue and carried it in notes and on the edges. Accepted.
- Not re-run here: viewer `[real]` tier and the mutation-witness tier (worktree lacks projections/playwright). The author ran the `[real]` tier against a shadow projection (522/522); both belong to the batch merge in the main checkout.
- Open items for Jeff: three drawings (forge todo `20261016T165622_zy675c`) and which upper-head face meets the mount stop (58.487 vs 62.281 / 64.440 / 66.987).
