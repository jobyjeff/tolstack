# LESSONS 2026-11-06 — annotator_event_files_number_from_the_folder

## What changed

- Event filenames are numbered from `seq`: `AA.nextEventSeq(projection, sessionEvents)` is one past the
  highest `seq` among the full events the projection embeds (bindings, proposals, rejections, ...),
  floored by `built_from_events.length` and by this session's events. `AA.eventFilename(seq, slug)` makes
  the name, so file prefix and `seq` now agree. `AA.nextEventFilename` and `state.sessionFilenames` are gone.
- `seq` IS reachable from the served page: the projection's `stack_keys[*]` carry whole events with `seq`
  (`history` is ids only, which is why walking the whole row is needed). So the filename fallback in the
  handoff was not used.
- A write never overwrites: `writeFeatureIdentityEvent` (FSA and memory adapters) bumps the prefix
  (`AA.bumpEventFilename`) while the target exists and returns the name written; `writeIdentityEvent`
  takes a banner string or a function of that name, so "Wrote <name>" is the real name.
- The four call sites (bind, answer, flip, owner-not-in-set) all took `filenames.length + 1` as `seq` too —
  a count, which is wrong whenever the log has a gap. They now take `nextEventSeq()`.
- Annotate pin 295 -> 296 in `scripts/guard_enumeration.mjs`; three guards, three mutation specs, each
  `--only` WITNESSED.

## Verified

- Real projection (main checkout `bindings.json`) through the new code: next seq 63, `0063_x.json`, after an
  inbox whose highest file is `0062_…`.
- `node apps/annotate/run_tests.cjs`: 296/296 (worktree and `--repo C:/workspace/tolstack`).
- `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`: 544/545, 1 tier skipped — the one red is
  "the projection this tier reads was built from this tree", inherent to a worktree against the main
  checkout's projection; rebuild-then-run is the batch merge's step.
- `pytest -q` in the worktree: 4 failed, 1734 passed, 1 skipped (395 s). `test_viewer_js_suite` is the
  known worktree red (no projection). `test_the_enrollment_census_holds` was the pin, now fixed.
  `test_a_corrupt_lock_file…` / `test_a_stale_lock_pid_dead…` fail on a stale `tmp/mutation-witness-*`
  reap EPERM in this worktree, nothing to do with this diff. `test_the_issue_each_mutation_cites…` needed
  this lesson to exist.

## Not done

- **No real bind in the served annotator (port 8000).** That page serves the main checkout's code, which does
  not have this change until the branch merges, and the folder picker needs a person. After the merge, one
  bind should land as `0063_…` or later; that is the check to make.
- The four mis-prefixed `0001_…_accepted.json`..`0004_…` files in the inbox were left untouched, as told.
