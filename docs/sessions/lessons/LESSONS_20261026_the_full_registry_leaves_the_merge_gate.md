# Lessons — the_full_registry_leaves_the_merge_gate (2026-10-26)

## What the selection is, as implemented

`--changed-since <ref>` in `scripts/run_mutation_witness_tests.mjs`. The diff is
`git diff --name-only <ref>...HEAD` plus `git status --porcelain` of the same
tree. An entry is selected by the **first** of three arms that matches:

| arm (printed in brackets) | matches when |
|---|---|
| `mutation file changed` | the entry's `file` is in the diff |
| `spec added or changed` | `scripts/mutation_witnesses/<specFile>` is in the diff |
| `tier harness changed` | any path in `HARNESS_FILES[tier]` is in the diff |

`HARNESS_FILES` (written once, in the runner): `fast` = `apps/viewer/tests.js`,
`apps/viewer/run_tests.cjs`; `annotate` = `apps/annotate/run_tests.cjs`;
`browser` = `scripts/run_viewer_browser_tests.mjs`; `python` = the entry's own
`suite` (the pytest file it names). Output is one `  <id>  [<arm>]` line per
entry, then `<n> of <N> entries can be reached by this diff against <ref>`;
empty is `0 of <N> …` and exit 0.

Two additions the handoff did not name: `--diff-root <path>` (where git is asked
for the diff; defaults to the script's own tree — it is what lets
`tests/test_mutation_witnesses.py` use a throwaway two-commit repo against the
real registry) and `--selection-only` (print the selection and stop).

## The empty arm is not the output of this branch

The handoff expected `--changed-since integration` from this branch to print the
empty arm. It does not: `scripts/run_mutation_witness_tests.mjs` is itself the
`file` of a mutation (the python-tier entry
`python__test-the-mutation-shadow-covers-every-input-the-freshnes__fecc0838`
mutates the runner's `SHADOWED` list), so editing the runner selects it. Output,
from this worktree with `--repo C:/workspace/tolstack`:

```
  python__test-the-mutation-shadow-covers-every-input-the-freshnes__fecc0838  [mutation file changed]
1 of 332 entries can be reached by this diff against integration
...
1/1 declared mutations witnessed
```

The empty arm is covered by `test_changed_since_an_unreachable_diff_is_a_result_not_a_refusal`
(a diff that touches only `README.md` prints `0 of 332 …`, exit 0).

## Default tier: marker, and which mechanism

`sweep` is registered in `pytest.ini`; the two cases that measured 201 s and 34 s
(`test_two_concurrent_runs_against_one_repo_produce_a_named_refusal`,
`test_two_different_repo_roots_both_still_succeed`) carry it. The deselection is a
`pytest_collection_modifyitems` hook in `tests/conftest.py`, **not**
`addopts = -m "not sweep"`: `addopts` would also deselect them when their file is
named, and the handoff asks that naming it explicitly still runs them. The hook
leaves them in when any `-m` expression is given or their file is on the command
line. Checked by collection: bare `pytest` 1558/1560 (2 deselected), `-m sweep`
exactly those two, the file named explicitly all four.

## The 10-20 case, restated as the sweep's job

`browser__and-it-sits-to-the-panel-s-right…237dba65`: a layout change shifted the
page 300 px, the rail kept in the layout absorbed it, and the check stayed green
while the spec's own file was untouched. Neither `--only` nor `--changed-since`
selects it. That is the one decay the whole registry has caught that nothing
cheaper could, and it is exactly what `docs/prompts/WITNESS_SWEEP.md` is for: it
arrives next morning as a `class: decayed_witness` issue. The runner header,
`CLAUDE.md`, the viewer README and the review overlay all say so, so the next
reviewer who meets a decay does not put `--full` back on the gate.

## Things that bit

- `scripts/run_mutation_witness_tests.mjs` and the docs here are CRLF in the working
  copy and LF in the index; a Python `read()`/`write()` round trip flattens them and
  shows as a whole-file diff. Edits above preserved the endings.
- `dispatch suite-time record` accepts only `--tier default|merge`; the `sweep` tier is
  the dispatch sibling's. `WITNESS_SWEEP.md` step 8 says to use `merge` until it lands.
- `dispatch check-issue` resolves `found_by:` against the board by slug, so the sweep
  prompt's issue template cites `docs/sessions/HANDOFF_…` (no `active/`), which keeps
  resolving after the handoff reaches `completed/`.

## Measurements

- **Default tier, after:** `venv-win/Scripts/python.exe -m pytest -q` (main checkout's
  interpreter, run in this worktree, serial) — **314 s**, 1561 passed, 1 skipped,
  1 failed, 2 deselected (the two `sweep` cases). Recorded with `suite-time record
  --tier default`: inside budget. The one failure is `test_viewer_js_suite_is_green`,
  red in a worktree by design (no projection); the viewer JS suite against the main
  checkout read 451/452 with its `[real]` node-fs tier *skipped*, because the main
  checkout's projection predates this tree — I did not rebuild a shared projection
  from a worktree. This branch touches no viewer data or app file, so that tier is
  the review's post-merge run to arm (`scripts/rebuild_projections.ps1` first).
- **Default tier, before:** not re-measured on this branch. The only figure is the
  2026-10-22 issue's 941 s on a loaded box, of which the two moved cases were 201 s +
  34 s (`--durations` there; in this run both are absent from the top 15 because they
  are deselected). The two numbers are different loads, not a controlled comparison.
- **`--changed-since master` in the main checkout on the merged tree — NOT done.** The
  DoD wants it after `pitch_system_folds…` lands and this branch is merged; neither is
  true yet, and the main checkout is on `master`. The review's post-merge run is the
  first place it can be measured; record it with `suite-time record --tier merge` and
  put it beside the ~2 h figure it replaces. Expect minutes: one python entry here.
- **`pytest -q -m sweep` was collected (exactly the two cases), not run** — the run is
  201 s + 34 s of runner-lock contention on a shared box, and the sweep owns it.
- **Dry run of the sweep prompt:** the issue template passes `dispatch check-issue`
  (`found_by` resolving), the JSONL row writes with the repo interpreter, and the
  preamble's two git commands print this worktree's branch/dirt correctly. The
  `--full` run itself, and the dispatch `sweep` tier, are the sibling handoff's.
