---
type: chore
priority: med
status: triaged
handoff: docs/sessions/HANDOFF_20261021_the_kinematic_study_checks_its_run_its_units_and_shows_its_limit.md
area: tests/candidate-provisioning
reporter: agent
class: undeclared_candidate_input
found_by: dispatch/docs/sessions/lessons/LESSONS_20261021_triage_sweep.md
---

# `data/inbox/linkage-sweeps` is read by the kinematic `[real]` tier but not declared in `[tests] candidate_inputs`, so every batch-merge candidate is red on it

**What happened.** At the 2026-10-21 batch merge, the candidate
(`batchmerge-test` @ `9ce8262`, which is `integration`, already containing
master `7b69d91`) was built and bridged per the triage duty. The bridge linked
the five declared inputs, but `data/inbox/linkage-sweeps/` is not among them.
`scripts/rebuild_projections.ps1` then built the kinematic projection with a
`KinematicStudyError: no sweep artifact at ...\data\inbox\linkage-sweeps\vpa-pitch-p2-20261015-013931.json`
for `vpa_pitch_linkage_blade_pitch_at_the_stops`. The actuator still exited 0.

`C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q`, run in the
candidate, was then `5 failed, 1509 passed, 1 skipped`:

- `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`: two node
  `[real]` checks, "the kinematic projection carries the blade-pitch study..."
  (`"error" !== "ok"`) and "the kinematic page renders the live study..."
  (`0 !== 2`), 542/544
- `tests/test_mutation_witness_shadow_concurrency.py`: four tests. Their
  shadow runs inherit the same red node baseline and come back `REFUSED`.

**Disproved as unproven, not real.** The same command passed after
`dispatch bridge-test-inputs ... --also data/inbox/linkage-sweeps` and a
re-run of the actuator in the candidate: `1514 passed, 1 skipped`, with node viewer 544/544 and annotate 205/205.
A sha256 manifest of the main checkout's `linkage-sweeps` was identical before
and after the run, so the suite only reads it.

**Fix.** Add `"data/inbox/linkage-sweeps"` to `.dispatch.toml`'s
`[tests] candidate_inputs`. It is read-only: the annotate app writes sweeps
there at authoring time, but the suite does not. Also update the CLAUDE.md
bullet that lists the declared set. Without this, every sweep hits the
same invented red and has to work out the same disproof again.

Related gap: the actuator stamps clean provenance even though one study
failed to build. That is the class in dispatch's
`ISSUE_20260930_actuator_rebuilds_over_absent_inputs_stamp_clean_provenance.md`,
and tolstack owns the fix.
