---
priority: high
depends_on: []
model: sonnet
hitl: false
---

# HANDOFF 2026-10-30 — display_name_reaches_the_viewer_fixtures_and_fixture_drift_is_caught_without_a_projection

Source: the 2026-10-30 triage sweep's batch merge (`dispatch` `triage_sweep_20261030`),
which merged trunk `da9593c4` → `17e3caf4` **with a known red** and routes it here.
Issue: `docs/issues/ISSUE_20261029_display_name_reached_the_projections_but_not_the_viewer_fixtures_so_the_real_tier_is_red_on_integration.md`.
Baseline: `master` @ `17e3caf4`. Scope: `apps/viewer/fixtures.js`,
`apps/viewer/topology_fixtures.js`, the merged-component-cell label path in
`apps/viewer/` (one function), tests, `docs/`.

## The red, exactly as the batch merge measured it

`PYTHONIOENCODING=utf-8 C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q`
on the bridged merge candidate (projections rebuilt into it first), 478 s:
**3 failed, 1683 passed, 1 skipped, 2 deselected**.

- `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green` — 626/629, three `[real]` checks:
  - `every fixture shape still matches the builder's`: `stacks[].stack` — the projection writes `[display_name, naming_note]`, `apps/viewer/fixtures.js` does not.
  - `the topology fixture's shapes still match the builder's`: `topologies[].parts[]` — same two keys, `apps/viewer/topology_fixtures.js` lacks them.
  - `every merged component cell on every live topology is its part's own NAME`: `vpa_pitch_linkage/group 16`: `"Pitch plate 215735-001/-002" !== "215177-001 pitch plate"`.
- `tests/test_mutation_witness_shadow_concurrency.py::test_a_corrupt_lock_file_is_cleared_and_reported_as_corrupt_not_as_stale`
  and `::test_a_stale_lock_pid_dead_is_cleared_with_a_message` — consequences, not causes: the
  `fast` tier's clean run is red for the reason above, so the run reports `REFUSED`/skipped.
  They should go green with the fix; if they do not, they are a second defect — say so.

Cause: `the_rebuild_says_when_its_inputs_are_absent_and_a_link_is_named_by_its_drawing`
(`c5066f53`) added the two fields to tracked stack/topology JSON, and its review ran the viewer
suite with the node-fs `[real]` tier **skipped**, so nothing armed saw it.

## Deliverables

1. **The instance.** Regenerate `topology_fixtures.js` (its header says how) and add
   `display_name`/`naming_note` to `fixtures.js`. Decide whether the merged-cell label takes
   `display_name` (the brief `BRIEF_20260916_link_name_authority.md` says the drawing title block
   is authoritative for display) or the check's expectation is wrong — record which and why;
   never loosen the check to clear it. Rebuild projections first
   (`scripts/rebuild_projections.ps1`), then `node apps/viewer/run_tests.cjs` in the main
   checkout (or `--repo` a scratch root built from your tree) must be fully green, `[real]` armed.
2. **The class (`fixture_drift`, fourth sighting: 2026-09-09, 09-24, 10-26, 10-29).** Every
   instance is the same shape: a tracked input (`docs/tolerance_stacks/*.json`,
   `docs/topologies/*.json`) or a builder gains a key, and the only guard that notices reads the
   gitignored projection, so a worktree run skips it. Add a check that needs **no** projection:
   for the keys the builders copy through verbatim from tracked JSON, the fixtures must carry
   every key the tracked inputs carry. Witness it with a mutation spec under
   `scripts/mutation_witnesses/` (CLAUDE.md: a guard is enrolled in the same change). If a
   tracked-only check cannot cover a builder-*computed* key, say which keys stay `[real]`-only.

## Done when

`pytest -q` green in the main checkout after a rebuild; the issue above is `resolved` with a
verified `resolution:`; the new guard reddens on a stack file with an extra key and no fixture
change.
