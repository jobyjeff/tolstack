---
priority: med
depends_on: []
model: sonnet
---

# HANDOFF 2026-10-15 — mutation_runner_survives_a_missing_interpreter_and_shadows_what_guards_read: two harness defects in run_mutation_witness_tests.mjs

Source: triage sweep 2026-10-15; two woken issues, both in
`scripts/run_mutation_witness_tests.mjs`:
`docs/issues/ISSUE_20260930_a_missing_interpreter_crashes_the_whole_mutation_run_where_the_preflight_promised_a_miss.md`
and
`docs/issues/ISSUE_20261001_no_pytest_guard_in_the_two_largest_test_modules_can_be_enrolled_because_the_shadow_omits_the_documents_they_read.md`
(both med). Baseline: trunk `master` @ `c51cf49`. Scope:
`scripts/run_mutation_witness_tests.mjs`, `scripts/mutation_witnesses/` (one new
python spec), its README. Do NOT touch `scripts/run_viewer_browser_tests.mjs`
or the annotate specs being added by the parallel
`annotate_gated_browser_suites_follow_the_three_part_mock`, nor `apps/annotate/`.

## Deliverables

1. **A spawn failure is a MISS, not a crash.** `runTier()` builds its child with
   `spawn(...)` and attaches `stdout`/`stderr`/`close` but no `error` handler, so
   a missing interpreter (`--repo` pointing at a tree with no
   `venv-win/Scripts/python.exe`) throws `spawn … ENOENT` at the first `python__`
   entry and the run never prints its summary or verdict, although the
   preflight promised every python witness would be reported as a MISS. Add
   `child.on("error", …)` resolving the same shape `close` does, with the spawn
   error as the recorded reason. Suggested also: when the preflight already
   knows the interpreter is missing, report the python entries as misses up
   front, naming them. Repro: `node scripts/run_mutation_witness_tests.mjs --repo
   <a dir with no venv-win>` — today it dies; after, it finishes and exits
   non-zero with the python entries listed as MISS.
2. **Shadow the documents the claims guards read.** `SHADOWED` copies `apps/`,
   `scripts/`, `docs/topologies`, `docs/tolerance_stacks`, `docs/spec_library`,
   `tests/`, `tolerance_stack/`, `.gitignore`; so `tests/test_tolerance_stack.py`
   is red in the shadow with no mutation applied (3 failed) and
   `tests/test_topology.py` worse (13 failed), and no pytest guard in either can
   be enrolled. Add `README.md`, `CLAUDE.md`, `ARCHITECTURE.md`,
   `docs/DAG_TOPOLOGY.md`, `docs/SOP_TOLERANCE_STACK.md`, `docs/prompts/`,
   `docs/sessions/` (measure the copy cost; say it in the lesson). The one that
   needs thought is `data/inbox/specs/README.md` (read by
   `test_every_traced_ratio_publisher_declares_the_current_figure`): `data/` is
   deliberately not shadowed — decide whether that guard reads it via the
   `--repo` data root or the shadow copies that one tracked file, and record the
   rejected option.
3. **Enroll the guard that was left out.** `tests/test_tolerance_stack.py::test_one_part_and_feature_states_one_nominal_in_every_topology_that_states_it`,
   with the two mutations from the issue's table
   (`topology_pitch_system.json` `"nominal_length_mm": 105.9908,` → `109.4,`;
   `topology_vpa_pitch_linkage.json` `"nominal": 105.9908,` → `106.9908,`).

## Definition of done

- Both pytest modules green in the shadow with no mutation applied (show the
  clean-run line); the new python spec witnessed.
- Full `node scripts/run_mutation_witness_tests.mjs` (main checkout data via
  `--repo C:\workspace\tolstack`) reports every declared mutation witnessed;
  the missing-interpreter repro finishes with a verdict.
- `venv-win/Scripts/python.exe -m pytest -q` green.
- Lesson (`docs/sessions/lessons/LESSONS_20261015_mutation_runner_survives_a_missing_interpreter_and_shadows_what_guards_read.md`):
  shadow size/time before and after, the `data/inbox/specs/README.md` decision,
  and whether any other spawned runner in `scripts/` has the same missing
  `error` handler (the issue cites `the_pairings_spawned_runner_reports_a_crash_as_a_parse_divergence`
  as the same tool's other side — say whether it is still live).
