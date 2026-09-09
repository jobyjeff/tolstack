---
priority: med
depends_on: []
---

# HANDOFF 2026-09-09 — topology_projection_emits_study_checks: wire a study's authored `checks` into the topology projection

Source: `docs/issues/ISSUE_20260908_topology_projection_never_emits_a_studys_checks.md`.
Baseline: trunk (master). Scope: this session owns
`scripts/build_topology_projection.py`'s `project_study()` and its own test
file. Do NOT touch `apps/viewer/` (rendering a study's check is a separate,
out-of-scope concern owned by whichever handoff next builds that UI, plausibly
`viewer_v2_single_nav`) or `tolerance_stack/topology.py`'s `check_study()`
itself (already correct and tested — see the acid test named below).

## The gap

Handoff `topology_schema_v1` (2026-09-08) made `check_study()`'s `limit`
field optional so a study's own total can be checked against a criterion
directly, "equivalent in power to `StackDefinition.checks`" — the acid test
(`tests/test_topology.py::test_the_l1_studys_own_authored_check_matches_the_stacks_check_exactly`)
proves `check_study()` reproduces `stack_vpa_output_to_pitch_plate.json`'s own
published `worst_case_shank_out` check exactly.

That proves the **function** is correct. It does not reach a consumer:
`scripts/build_topology_projection.py` does not import `check_study`, never
reads `study.checks`, and `project_study()`'s row has no `"checks"` key at
all — in the tree before `topology_schema_v1` and in the tree after it,
unchanged. Contrast `scripts/build_viewer_projection.py`'s `project_stack`,
which calls `stack.check(spec["check_id"])` for every entry in `stack.checks`
and merges the resulting `CheckResult` (interval, verdict, criterion,
`workbook_cells`, `generated`, `input_confidence`, …) into the projected row.

This is not a regression `topology_schema_v1` introduced — the with-`limit`
branch of `check_study()` had exactly the same projection gap since
`endstop_location_stack` (2026-09-06) — but that handoff's own motivating
language ("today a topology has no field for a verdict at all... which is
the single reason every stack stayed in the classic viewer nav") makes this
newly relevant: the schema now supports a study carrying a verdict-bearing
check, but the projection — the one artifact a viewer or any other downstream
reader would consume — still cannot show one.

## Fix

Change `project_study()` so that, for each entry in `study.checks`, it calls
`check_study(topology, study, spec["check_id"])` and merges the result into
the row — mirroring `project_stack`'s shape exactly (same fields: interval,
verdict, criterion, `workbook_cells`, `generated`, `input_confidence`, …).

## Definition of done

- `project_study()`'s output row carries a `"checks"` key, populated the same
  way `project_stack`'s is, for every study that has `checks` authored (with
  or without `limit`).
- A new `[real]`/Python-level test asserting the projected check matches
  `check_study()`'s own output field for field — the same kind of pinning
  `test_the_projected_terms_are_the_report_that_reviews_them_term_for_term`
  does for thermal-fit terms. Use the L1 study named in the acid test above
  (`worst_case_shank_out` against `vpa_output_to_pitch_plate`) as the first
  fixture, since its expected values are already pinned there.
- `.\scripts\rebuild_projections.ps1` run from the main checkout succeeds and
  the printed summary reflects the new checks (spot-check the console output
  for the affected topology).
- `venv-win\Scripts\python.exe -m pytest -q` fully green.
- Lesson (`docs/sessions/lessons/LESSONS_20260909_topology_projection_emits_study_checks.md`):
  note that rendering this in `apps/viewer/` is still out of scope and left
  for whoever next builds topology-mode check display (name
  `viewer_v2_single_nav` if that's still the live candidate at the time).
