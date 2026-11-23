---
priority: high
depends_on: []
model: opus
hitl: false
---

# HANDOFF 2026-11-21 — the_viewer_node_suite_runs_inside_its_default_tier_timeout: find why the viewer's [real] tier went from 19 s to 278 s, and bring it back

Source: triage batch merge 2026-11-21
(`dispatch/docs/sessions/lessons/LESSONS_20261121_triage_sweep.md`), routing
`docs/issues/ISSUE_20261121_the_viewer_node_suite_runs_278_seconds_and_the_default_tier_times_it_out_at_180.md`.
Baseline: trunk after the 2026-11-21 batch merge (integration fast-forwarded
to it), which carries the red. Scope: `apps/viewer/` (views, model, tests.js,
run_tests.cjs) and `tests/test_viewer_js_suite.py`; do NOT touch
`docs/topologies/` content or the browser runner's suites beyond what a
render-path fix forces.

## The red

`tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green` runs
`node apps/viewer/run_tests.cjs` under `timeout=180` and now times out; under load, so do
`tests/test_mutation_witnesses.py::test_the_scan_and_the_run_agree_on_which_guards_exist`
and `::test_the_pairing_actually_ran_something`, which spawn the same runner
(`spawnSync ... ETIMEDOUT`), and in the main checkout the four
`tests/test_mutation_witness_shadow_concurrency.py` tests, whose
`run_mutation_witness_tests.mjs --only fast__a-ready-banner` times out at 120 s
(the issue names all four). The
suite is green (623/623) but takes **278 s** on the merged tree, where trunk
before the merge (`282807c3`) took **19 s** for 605/605 with the same 99
`[real]` checks armed. Four checks take ~55–65 s each; the issue lists them and
the per-test table. They all render every live topology under every live
study.

## Deliverables

1. **Root-cause the slowdown.** This is the work: find which commit(s) in
   `282807c3..<merge>` made a render super-linear (or made the checks
   re-render far more than they need), with measurements. Suggestion, not
   binding: time `run_tests.cjs` at a few commits on the range (the tier must
   be armed — run in the main checkout or with `--repo` against a projection
   built for that tree; an unarmed run skips the `[real]` tier and reads fast
   for the wrong reason), and profile the slowest check with
   `node --cpu-prof`. Suspects named in the issue (`8def348c`, `968e743a`,
   `1c9262fa`, `9c02f5cf`) are unmeasured.
2. **Fix the cause in the product code if the page itself pays it** (a real
   reader opening the topology page pays the same render cost the test does —
   check the browser tier's topology suites for the same signature), or in the
   checks if only the test re-renders redundantly. Do not raise the 180 s
   timeout as the fix; if, after the fix, a raise is still warranted, say so
   with numbers in the lesson and leave it for review.
3. **Make the next one visible.** The tier skips in every worktree, so this
   slowdown passed eleven handoffs unseen. The runner should print its own
   wall time and its slowest checks (it already prints the projection pairing
   line for the same reason) so an armed run's lesson records them.

## Definition of done

- `node apps/viewer/run_tests.cjs` in the main checkout, armed, all green and
  back near its pre-merge time (state the number); `pytest -q
  tests/test_viewer_js_suite.py tests/test_mutation_witnesses.py
  tests/test_mutation_witness_shadow_concurrency.py` green in the
  main checkout.
- Full default tier, fast node tiers, and the browser runner `--only` the
  topology suites, per CLAUDE.md's table.
- Lesson: the commit(s) and the mechanism, before/after timings per slow
  check, and whether the browser page paid it too.
