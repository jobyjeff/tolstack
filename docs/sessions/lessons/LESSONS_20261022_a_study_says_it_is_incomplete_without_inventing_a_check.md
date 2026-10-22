# Lessons — a study says it is incomplete without inventing a check (2026-10-22)

## What shipped
- `StudyResult.completeness()` (`tolerance_stack/topology.py`) derives
  `{complete, reason, open_terms}` from the summed terms; it rides in
  `StudyResult.as_dict()` and so in the projection at `study.result.completeness`.
  A term is open when its edge is a `gap`, its `source_ref` is `kind: assumed` or
  `confidence: untraced`, or it has no `source_ref`. (`assumed` is a source_ref
  kind, `gap` an edge kind — the handoff's "kind: assumed or kind: gap" spans both.)
- A hand-written `completeness` in a study file is a `StudyError` (`Study.from_dict`;
  before, unknown keys were silently dropped).
- `docs/DAG_TOPOLOGY.md`: one bullet; the check's own `complete`/`excluded_terms` keep their meaning.
- Viewer: `VA.studyCompleteness`; `VA.studyAttention` raises the single existing
  `incomplete` badge from either a check's excluded term or the study's own
  completeness; study header gets a collapsed `incomplete` chip whose fold lists
  each open term by name as a link (`?topology&study&edge`). The hover sentence is
  generated in JS from counts and carries no edge id (ids are banned on the surface);
  Python's `reason` (which names ids, per the handoff) is not printed.
- `apps/viewer/index.html`: dropped the meta refresh; the shim now redirects once,
  via `window.location.replace`, query string preserved.

## Per-study completeness (today, sibling not merged)
Incomplete (open terms): travel study (`piston_head_upper_thickness`,
`gas_spring_mount_flange_to_end_stop` — as predicted), all nine
`rotor_fastener_grip_u*h` (`washer_nas1149v0332_tt`), `pitch_link_cotter_hole_clearance`
and `pitch_link_shank_out` (3 each), `tan_link_take2` (1), `vpa_output_shank_out` (2),
and all seven `pitch_system_*` studies. **Complete:** only `pitch_link_thread_region_t`.
Not re-measured after the sibling (`a_general_profile_note_bands_a_model_defined_term`)
because it had not merged.

## Sites
Reached: study header, nav rail (via `studyAttention` → the row's alert card).
Render nothing: there is no separate studies list or topology-page study chip
beyond the nav rail; the kinematic page/nav (different schema) — filed as
`docs/issues/ISSUE_20261022_a_kinematic_study_has_no_derived_completeness.md`.

## Tests
`tests/test_study_completeness.py` (13: all-traced, assumed, untraced, no ref, gap,
selection order, no-checks, hand-written refused, real studies, projection row);
3 fast JS tests, each with a mutation spec (all WITNESSED via `--only`); `fast`
pin in `scripts/guard_enumeration.mjs` 546→549 (the name-set hash will conflict
with any sibling that adds guards — recompute it). Mutation spec JSON needs
`issue` and `note` keys even when null.
The test for the travel study does not pin it incomplete: the sibling will change that.

## Suite record
Worktree, `venv-win` python: `pytest -q` → 1546 passed, 1 skipped, **1 failed**
(`test_viewer_js_suite`, the documented worktree-only red: node-fs tier has no
projection). 6m23s. `node apps/viewer/run_tests.cjs` in worktree: 449/449, node-fs
tier SKIPPED. NOT run: node-fs `[real]` tier, annotate/browser tiers, full
mutation registry (main checkout / batch merge). My guards are fast-tier only,
so no browser `--only` applies.
