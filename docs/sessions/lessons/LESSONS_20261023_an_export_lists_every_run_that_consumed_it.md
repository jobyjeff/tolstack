# Lessons — an_export_lists_every_run_that_consumed_it (2026-10-23)

## What the pairing found

The three citations the handoff named were a third of it. The new guard
(`tests/test_export_runs_match_the_run_log.py`) walks every established export
block, any depth, in `docs/topologies/*.json` and `docs/tolerance_stacks/stack_*.json`
and compares its `runs` against `drawing-checker/data/runs.jsonl`'s recorded
inputs. It found **30 export blocks** wrong across **7 files**, all now fixed:

- `topology_vpa_pitch_linkage.json` — the two 213668-002 citations (1 of 5 runs listed).
- `topology_pitch_system.json` — 7 blocks with `runs: []` although the log records
  runs for the sha: the named row-41 citation, its sibling `gas_spring_mount_position`
  (same sha, also `[]`, not named by the handoff), and five more (sha `b0c19da5`
  x3 runs, `795b557e` x2 blocks, `a06526c2`, `7b35fde1`).
- `stack_hub_bearing_thermal_fit_m1.json` (4 blocks) and `_m2.json` (8 blocks) —
  all `[]`, each with a note asserting "No drawing-checker run has ever consumed
  this PDF ... `runs` is empty by fact". **False**: the log records 2-3 runs per sha.
  The sentence is reworded in all 12.
- `stack_pitch_link_to_pitch_plate.json` (joint ref and one element),
  `stack_tan_link_to_pitch_plate.json`, `stack_vpa_output_to_pitch_plate.json` —
  217755 exports listed 2 or 4 of the 4-6 runs the log records.

No band, nominal or `kind` changed. Added runs' `ts` are copied verbatim from each
run's `run_meta.json` (checked equal to the log's `ts` for every added run).

## Rules chosen

- **Pre-`inputs` runs** (before `20260730_161157`): the match comes from
  `runs.jsonl`'s `inputs`, as the SOP says; `ts` is still read from
  `run_meta.json`. The first two 213668-002 runs (`20260714_111124`,
  `20260727_145424`) are `backfilled: true` and their `ts` spells the id back, so it
  is a **derived** instant, not a stamped one; the two vpa-linkage notes say so.
- **Short run ids.** The 2026-08 stacks cite runs as `20260813_180734`, the log
  has `20260813_180734_215735-A`, and other tests key on the short form
  (`_RUNS_CLEARED_WITHOUT_A_TIMESTAMP`, the pitch-link set equality). I did not
  rewrite them: the guard matches a listed id to a logged run by equality **or**
  by the `<listed>_` prefix, requires every logged run covered and every listed id
  to name one. Weaker than id equality (a short id that is ambiguous within a second
  covers all its matches) but exact for every citation here. Existing entries were
  kept as written; only missing runs were added, in full-id form, and each list is
  sorted by id. Filed as an issue (below) rather than widened.
- The guard skips, naming the path, when `runs.jsonl` is unreadable.

## Guard enrollment

Spec: `scripts/mutation_witnesses/python__test-every-established-export-lists-exactly-the-runs-the__5afb2dce.json`.
The mutation drops one listed run from the 76.86 citation's *data* — mutating
the checker instead reddens the synthetic unit test, not the declared guard.
`--only <that id> --repo C:\workspace\tolstack` reports WITNESSED (the worktree has
no venv; `--repo` names the checkout that does). It is NOT WITNESSED on a machine
without drawing-checker's log, by design of the skip. **No `DECLARED_GUARDS` pin
moved**: the `python` tier is not censused (`CENSUS_LIMITS.python_not_censused`), so
the handoff's "raise the pin from the measured row" has nothing to raise.

## Surface

The citation card (`VA.exportRunsText`) says "read by drawing-checker 5 times, most
recently 19 Aug 2026"; the ids ride on the line's hover. Five runs is a count, not a
list, so nothing to render legibly — no UI change. Not looked at in a browser
(no browser tier run for this change).

## Full suite

See the report; recorded there from the run's own output.

## Existing tests this moved

Fuller `runs` lists reddened three tests that had pinned the short lists; each was
updated, none weakened: `test_the_cited_terms_name_the_run_they_were_read_from`
(`run_id in run_ids`, was `== [run_id]`), the pitch-link read-only test (expected set
plus two `_RUNS_CLEARED_WITHOUT_A_TIMESTAMP` rows for the 217755 runs
`20260817_151224` / `20260819_163640`, which postdate the session, with reasons), and
the PROVENANCE rows for the five changed stack files / the test file.

## Test-run record

Worktree, `venv-win/Scripts/python.exe -m pytest -q` (no xdist in the venv, so
serial): 7 failed, 1557 passed, 1 skipped, 941 s. Failures: 3 `test_browser_runner`
(Chrome `page.goto` 30 s timeouts while the box was loaded), `test_viewer_js_suite`
(the documented worktree-only red), and the three above, fixed after the run and
re-run green together with test_provenance, test_tolerance_stack, the witness tests
and the claims registry. The whole suite was not re-run after those fixes.
