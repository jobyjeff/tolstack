---
type: bug
priority: high
status: resolved
area: tests / apps/viewer node-fs [real] tier
reporter: agent
class: suite_timeout
found_by: dispatch/docs/sessions/lessons/LESSONS_20261121_triage_sweep.md
handoff: docs/sessions/HANDOFF_20261121_the_viewer_node_suite_runs_inside_its_default_tier_timeout.md
resolution: handoff completed 2026-11-22 -- closed automatically by dispatch when handoff `the_viewer_node_suite_runs_inside_its_default_tier_timeout` moved to completed/; not independently verified.
---

# The viewer node suite takes 278 s on the merged tree, and the default tier times it out at 180 s

`tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green` wraps
`node apps/viewer/run_tests.cjs` in `subprocess.run(..., timeout=180)`. On the
2026-11-21 batch-merge candidate (integration `26ac6993` + master `282807c3`,
merge `6564fa00`, projections rebuilt in the candidate first, every declared
input bridged) the test fails with:

```
subprocess.TimeoutExpired: Command '['C:\\Program Files\\nodejs\\node.EXE',
'C:\\workspace\\tolstack-batchmerge\\apps\\viewer\\run_tests.cjs']' timed out after 180 seconds
```

Run alone with nothing else on the box, `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q tests/test_viewer_js_suite.py`
is red at 180.6 s. The suite itself is green — `node apps/viewer/run_tests.cjs`
in the candidate is **623/623 in 278 s**. The same command in the main checkout
on trunk `282807c3` is **605/605 in 19 s**. Same 99 `[real]` checks armed on
both; the projection is paired with each tree.

So the merge is a ~15x slowdown of the viewer's node-fs `[real]` tier, and
nothing saw it: in a worktree the tier skips (no projection), so every
tactical and review default run reports this test as "the documented worktree
red", and the one armed run on record (the walk's lesson, `--repo
data/scratch/walk1119`) recorded 623/623 with no time.

Per-test time on the candidate (one instrumented run, `> 1.5 s` only):

| s | check |
|---:|---|
| 64.4 | [real] every mark of every live topology, under every live study, resolves to a record and is named by its title |
| 62.4 | [real] every study's grid is exactly its chain, and a study that refused leaves the grid the whole walk |
| 55.9 | [real] no rendered surface of any live topology prints an internal id, a field name, a checksum or a workstation path |
| 53.8 | [real] every study's totals reach the page value for value |
| 8.8 | [real] the pitch-link studies render their verdicts and their margins, including the study that has no criterion at all |
| 7.1 | [real] every element cell prints its edge's name whole and its hover title is the same string |
| 6.3 | [real] every merged component cell on every live topology is its part's own NAME, and no cell is a part id |
| 4.7 | [real] every linkage row prints a measured nominal and its band, ... |

The four on top each render every live topology under every live study.
Unmeasured suspects in the range (`git log master..integration -- apps/viewer`):
`8def348c` (v2 re-authored: each link a machined part and two bearings of two
races — more parts and edges), `968e743a`/`1c9262fa` (the grid brackets an
assembly once per run of its rows), `9c02f5cf` (drawing status per open
dimension). Data growth alone would not plausibly be 15x; a per-render cost
that went super-linear is the likelier shape.

The same slowness reddens two more default-tier tests that spawn the same
runner under their own timeout. A second full candidate run
(`C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q`, 1046 s, the
box shared with other sweep workers) was `4 failed, 2583 passed`:

- `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green` (above)
- `tests/test_mutation_witnesses.py::test_the_scan_and_the_run_agree_on_which_guards_exist`
  — `apps/viewer/tests.js: spawnSync C:\Program Files\nodejs\node.EXE ETIMEDOUT`
- `tests/test_mutation_witnesses.py::test_the_pairing_actually_ran_something`
  — `apps/viewer/run_tests.cjs produced no usable output ... spawnSync ... ETIMEDOUT`
- (plus the unrelated, already-filed export-runs red)

The first full run (859 s, with a concurrent `node apps/viewer/run_tests.cjs`
of mine on the box) had only the viewer-suite timeout and the export-runs red,
so the two witness tests sit just around their own timeout: they are the same
defect, load-dependent.

Trunk was merged past this red (merged-with-known-red, 2026-11-21 sweep), so
trunk's main-checkout `pytest -q` is red on this test until the fix lands.

The witness gate pays it too: at the same batch merge,
`node scripts/run_mutation_witness_tests.mjs --changed-since 282807c3 --budget-min 30`
spent **10m39s** on one fast entry
(`fast__a-body-press-that-writes-reads-pending-in-the-click-itse__8b4e5d4e`) and
reached 15 of 181 selected entries inside the cap. Fast viewer entries re-run
this suite per mutation, so the slowdown multiplies there.

In the main checkout after the merge (`53271c6c`) it reaches four more tests,
which passed on the candidate worktree. Each spawns
`node scripts/run_mutation_witness_tests.mjs --only fast__a-ready-banner` under a
120 s timeout, and a fast viewer entry now runs the slow suite:

- `tests/test_mutation_witness_shadow_concurrency.py::test_two_concurrent_runs_against_one_repo_produce_a_named_refusal`
- `tests/test_mutation_witness_shadow_concurrency.py::test_a_corrupt_lock_file_is_cleared_and_reported_as_corrupt_not_as_stale`
- `tests/test_mutation_witness_shadow_concurrency.py::test_two_different_repo_roots_both_still_succeed`
- `tests/test_mutation_witness_shadow_concurrency.py::test_a_stale_lock_pid_dead_is_cleared_with_a_message`

(`pytest -q -rf tests/test_mutation_witnesses.py tests/test_mutation_witness_shadow_concurrency.py`,
main checkout: `4 failed, 49 passed in 798.77s`. The two `test_mutation_witnesses`
timeouts seen on the candidate passed on this run, which fits a timeout that
depends on load.)
