---
type: review
handoff: docs/sessions/active/HANDOFF_20260909_topology_projection_emits_study_checks.md
reviewer: agent
date: 2026-09-09
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-09-09 — topology_projection_emits_study_checks

## Scope

This is a plumbing/projection handoff, not a tolerance-stack authoring one:
`scripts/build_topology_projection.py`'s `project_study()` is changed to call
`check_study()` for every entry in a study's authored `checks` and merge the
result in, mirroring `build_viewer_projection.py`'s `project_stack`. No new
stack/topology data, no new `source_ref`, no LMC/MMC, no cotter hardware, no
traced ratio — the mandatory tolerance-stack checklist (checks 1–7) does not
apply; this note satisfies "explicitly addressed" for those by recording why.

## What I verified

- Read the handoff and confirmed the pre-work gap by reading the pre-merge
  source: `project_study()`'s row had no `"checks"` key, matching the
  handoff's own description and the overlay's already-tracked architectural
  finding (`ISSUE_20260908_topology_projection_never_emits_a_studys_checks.md`).
- Clean merge, `handoff/topology_projection_emits_study_checks` →
  `review/topology_projection_emits_study_checks`, no conflicts.
- Full suite green in the worktree: **751 passed, 1 skipped**.
- Read the diff in full: `project_study_check()` mirrors `project_stack`'s
  check-merge shape field for field (`CheckResult.as_dict()` + rounded
  interval + `generated`/`input_confidence`/`worst_confidence`/
  `workbook_cells`), with the one documented, correct difference — no
  `terms`/`element_terms`/`sensitivity`/`zero_width_inputs`, because a study
  check has no term list to walk; the confidence scoreboard is counted off
  the chain's own contributions instead. Confirmed `study.checks` entries
  (`study_vpa_output_shank_out.json`) indeed carry no `terms` key, so this
  isn't a corner cut, it's the correct shape for what's authored.
  `generated` is unconditionally `False`, correctly — no topology archetype
  synthesizes study checks the way `thermal_fit` does for stacks.
- New test (`test_the_l1_studys_projected_check_matches_check_study_field_for_field`)
  pins the merge against a live `check_study()` call on the L1 acid-test
  study, plus the two fields `CheckResult.as_dict()` can't carry
  (`workbook_cells`, `generated`) and a confidence-count sum check.
  **Verified this guard has teeth**: temporarily reverted the
  `row["checks"] = [...]` line and confirmed the new test fails (then
  restored the line and re-confirmed 751 passed / 1 skipped).
- Spot-checked the DoD's "rebuild reflects the new checks" item myself,
  against a scratch data-root (not the shared main-checkout one, which a
  concurrent sibling review session was actively rebuilding — see below):
  all 12 authored study checks across `pitch_link_to_pitch_plate`,
  `rotor_fastener_length`, `tan_link_to_pitch_plate_take2` and
  `vpa_output_to_pitch_plate` now print their `check_id=verdict` in the
  console summary, matching the lesson file's own confirmed output
  (`vpa_output_shank_out ... worst_case_shank_out=fail`).
- Ran the suite in the main checkout too (`C:\workspace\tolstack`, on
  `master`, unrelated to my merged branch): one pre-existing, already-tracked
  failure (`pitch system's four forks`, two open issue files, unrelated to
  this handoff). A second, transient failure
  (`topologies[].studies[]: the projection writes [checks]`) turned out to be
  a race with a concurrently-running sibling review session
  (`review/tolstack_viewer_js_suite_drift`) rebuilding the same shared
  projection file mid-read — re-ran immediately after and it was clean. Not
  a defect in this handoff; recorded as a new overlay entry so the next
  reviewer recognizes the shape instead of re-diagnosing it.
- Lesson file present and substantive
  (`docs/sessions/lessons/LESSONS_20260909_topology_projection_emits_study_checks.md`):
  correctly notes viewer rendering is out of scope, and documents a
  worktree/main-checkout wrinkle in the rebuild-script DoD step that the next
  session doing a similar check should expect.

## Findings

**Should-fix (fixed inline, both clear the three-prong boundary — doc-only,
no new test needed, a few lines):**

- `scripts/build_topology_projection.py`'s module docstring and
  `ARCHITECTURE.md`'s module-inventory row both said "stdlib only" for this
  script. The diff adds `from build_viewer_projection import
  count_confidence, worst_confidence`, making that claim false (the
  handoff's own lesson flagged this and left it unfixed). Fixed both to name
  the sibling-script imports. First pass used the quantifier "two sibling
  scripts", which `tests/test_architecture_inventory.py::
  test_no_unpinned_quantifier_survives_in_the_block` immediately caught as
  an unpinned count in the module-inventory block — reworded to avoid the
  quantifier and re-ran green. Worth noting as a small confirmation that this
  guard is doing its job.

No blockers, no other should-fixes, no nits worth recording individually.

## Overlay maintenance

- Closed the "schema field added, projection never calls the function that
  computes it" architectural-error entry (open since `topology_schema_v1`,
  re-confirmed by `linear_stack_conversions`) — this handoff is the fix.
  Noted the expected `topology_fixtures.js` drift this creates routes to the
  existing `tolstack_viewer_js_suite_drift` handoff/issue rather than being a
  new one.
- Added a new sighting to "run the suite in BOTH checkouts": a
  concurrently-running sibling session can cause a transient, non-reproducible
  failure by rebuilding the same shared projection file mid-read — distinct
  from the prior two sightings' stale-vs-fresh-environment causes.

## Verdict

**APPROVE.** Merging to `integration` and pushing.
