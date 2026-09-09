---
type: chore
priority: med
status: resolved
area: scripts/build_topology_projection.py
reporter: agent
handoff: docs/sessions/HANDOFF_20260909_topology_projection_emits_study_checks.md
resolution: handoff completed 2026-09-09 -- closed automatically by dispatch when handoff `topology_projection_emits_study_checks` moved to completed/; not independently verified.
---

# A study's authored `checks` — with or without `limit` — never reach the topology projection

Handoff `topology_schema_v1` (2026-09-08) made `check_study()`'s `limit` field
optional so a study's own total can be checked against a criterion directly,
"equivalent in power to `StackDefinition.checks`" — the acid test
(`tests/test_topology.py::test_the_l1_studys_own_authored_check_matches_the_stacks_check_exactly`)
proves `check_study()` reproduces `stack_vpa_output_to_pitch_plate.json`'s own
published `worst_case_shank_out` check exactly.

That proves the **function** is correct. It does not reach a consumer:
`scripts/build_topology_projection.py` does not import `check_study`, never
reads `study.checks`, and `project_study()`'s row has no `"checks"` key at
all — in the tree before this handoff and in the tree after it, unchanged.
Contrast `scripts/build_viewer_projection.py`'s `project_stack`, which calls
`stack.check(spec["check_id"])` for every entry in `stack.checks` and merges
the resulting `CheckResult` (interval, verdict, criterion, `workbook_cells`,
`generated`, `input_confidence`, …) into the projected row.

**Why this matters more than an ordinary gap**: the strategy brief this
handoff implements opens with "Today a topology has no field for a verdict at
all... which is the single reason every stack stayed in the classic viewer
nav" (`HANDOFF_20260908_topology_schema_v1.md`, deliverable 1). The schema now
supports a study carrying a verdict-bearing check. The projection — the one
artifact a viewer or any other downstream reader would consume — still cannot
show one. The underlying problem the deliverable was framed around is
therefore not actually closed yet, only the arithmetic capability underneath
it is.

**Why not filed as a blocker**: the handoff's own Definition of Done did not
require projection wiring (only that the acid test passes and existing
value-pinned tests stay green — both true), and the with-`limit` branch of
`check_study()` had exactly the same gap since `endstop_location_stack`
(2026-09-06), so this is not a regression this handoff introduced — it is a
pre-existing gap this handoff's own motivating language makes newly relevant.
`apps/viewer/` is out of scope for `topology_schema_v1` (owned by
`viewer_v2_single_nav`), so building the render side is out of scope here too;
but the projection step — `scripts/build_topology_projection.py` — was
explicitly in this handoff's scope ("emit the new fields") and this is a field
that was not emitted.

**What a fix would need**: a `project_study` change that, for each entry in
`study.checks`, calls `check_study(topology, study, spec["check_id"])` and
merges the result into the row (mirroring `project_stack`'s shape), plus a new
`[real]`/Python-level test asserting the projected check matches
`check_study()`'s own output field for field — the same kind of pinning
`test_the_projected_terms_are_the_report_that_reviews_them_term_for_term` does
for thermal-fit terms. Left to whichever session next needs a study's verdict
visible outside a test (plausibly `viewer_v2_single_nav`, if it wants to
render one).
