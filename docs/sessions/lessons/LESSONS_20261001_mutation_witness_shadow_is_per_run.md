# LESSONS 2026-10-01 — mutation_witness_shadow_is_per_run

## What changed

`scripts/run_mutation_witness_tests.mjs` now builds its shadow at
`tmp/mutation-witness-<pid>/` (one directory per run, keyed on the process's
own pid) instead of the single fixed `tmp/mutation-witness/` every run used to
share. A sweep at startup reaps any such directory whose pid is no longer
running, and a new `tmp/mutation-witness.lock` (pid + start time, claimed with
an exclusive `"wx"` file create so two runs can't both believe they got it)
refuses a second concurrent run against the same repo, naming the pid and
start time of the one that holds it, and clears itself if that pid is dead.
`applyToShadow`'s `writeFileSync` now carries a comment saying an ENOENT there
used to mean a concurrent rebuild and cannot any more.

## Disk cost of overlapping shadows, measured rather than guessed

One shadow copy (`SHADOWED`'s full set: `apps/`, `scripts/`, three `docs/`
subdirectories, `tests/`, `tolerance_stack/`, `.gitignore`) is **~12 MB**
(`du -sh tmp/mutation-witness-<pid>`). Two runs overlapping therefore costs
~24 MB while both are live — trivial, and well inside what the issue judged
acceptable when it asked for this trade.

## Liveness on Windows, and its honest limit

`isAlive(pid)` is `process.kill(pid, 0)`: ESRCH (no such process) reads dead,
EPERM (exists, not signalable) reads alive, anything else reads dead. This
works for both the lock and the shadow sweep and was exercised for real in
this session's own demonstrations below.

**It is not bulletproof, and the gap is pid reuse**: Windows recycles pids,
often quickly, and there is no generation counter to check alongside the
number. A lock or a shadow directory can in principle be misread as live
because an unrelated process landed on the same pid between the check and the
moment it matters. Nothing in Node's standard library closes this — it is the
same gap any pidfile has on any OS — which is why the refusal message prints
the pid rather than just a verdict: a human reading "pid N" can sanity-check
it against their own process list the way the issue's filing session should
have before killing two processes that turned out to be the other run's.

## A real EPERM, caught by the thing meant to catch it

While demonstrating the fix, the stale-shadow sweep hit a genuine `EPERM` on
its own `rmSync` of a dead-pid directory — almost certainly a transient
external hold (AV/indexer) rather than anything related to a live run, but the
exact failure mode `force: true` does NOT swallow (it only swallows "already
gone"). First encounter crashed the whole run with a Node uncaught-exception
stack trace; it is now caught and reported as a one-line
`note: could not reap stale shadow ... (not running): EPERM, ...`, and the run
proceeds (the directory is left for the next sweep to try again). This is
worth flagging for whoever next touches this file: **the sweep is a courtesy,
never load-bearing for the current run**, and anything it can't clean up
should be logged and skipped, not allowed to take the run down. Reproduced
live in the second demonstration below.

## Whether any other shared path still has no owner

The issue asked specifically whether the spawned tiers' use of `data/` was
settled. It is, by inspection rather than by assumption:

- Every tier that reads `data/projections/...` (the `[real]` witnesses) only
  **reads** it — nothing under `apps/`, `scripts/run_viewer_browser_tests.mjs`,
  or the `python` tier's pytest entries writes there. Concurrent reads of an
  unchanging file need no lock.
- `venv-win/` (the `python` tier's interpreter) is read-only in exactly the
  same way.
- The browser tier's own HTTP fixtures all call `server.listen(0, "127.0.0.1",
  ...)` — port **0**, i.e. an OS-assigned ephemeral port per server — so two
  overlapping runs never contend over a fixed port either.
- Nothing in `scripts/run_viewer_browser_tests.mjs` calls `writeFileSync` or
  `mkdirSync` at all (checked directly); every node tier is spawned with
  `cwd: SHADOW`, so any relative write a tier did make would land inside that
  run's own shadow, not a shared path.

So the lock is not standing in for a second correctness bug lurking in
`data/`: it exists because two full runs racing the SAME repo's `tmp/` and
tracked tree is wasted machine time more than it is a corruption risk now that
the shadow itself is per-run. That is a weaker justification than the shadow
collision was, and worth knowing if a future session is tempted to remove the
lock as "redundant" — it still turns silent resource contention and a second
long run competing for one CPU/browser into a one-line refusal instead.

## Demonstrated

**Two concurrent runs against the same repo** (`--only "fast__a-ready-banner"`,
started back-to-back):

```
=== run A (exit 0) ===
note: could not reap stale shadow mutation-witness-47012 (pid 47012, not running): EPERM, Permission denied: ...
building the shadow tree at ...\tmp\mutation-witness-34164

--- fast__a-ready-banner-shows-no-line-of-prose-at-all-one-reload__8410e039
  clean run of fast / ... green
  mutated run... WITNESSED
  ...
1/1 declared mutations witnessed

=== run B (exit 1) ===
REFUSED: another witness run (pid 34164, started 11:47:27 AM) is using this
repo. A per-run shadow keeps two runs from wiping each other's patched tree,
but both still spawn tiers against this repo's own gitignored data/ and
tracked files, so only one may run at a time. Wait for it to finish, or point
this run at a different checkout with --repo.
```

No `ENOENT`, no `EPERM` crash — the two failure shapes the issue reported are
gone; the only `EPERM` anywhere is the handled sweep note above, from an
unrelated leftover directory, not from the two runs colliding with each other.

**A stale lock (pid dead), cleared:**

```
$ node -e "process.exit(0)"        # pid 5312, already exited
$ (seed tmp/mutation-witness.lock with {"pid": 5312, ...})
$ node scripts/run_mutation_witness_tests.mjs --only "fast__a-ready-banner"
...
clearing a stale lock (pid 5312 is no longer running)
building the shadow tree at ...\tmp\mutation-witness-47012
...
1/1 declared mutations witnessed
```

**Two runs against different repo roots** (this worktree, and a full
filesystem copy of it under `tmp_path` standing in for "the main checkout and
a worktree at once" — both lack `node_modules`, so a `fast`-tier entry was
used, which needs none): both completed, exit 0, no refusal, no crash —
`tests/test_mutation_witness_shadow_concurrency.py::test_two_different_repo_roots_both_still_succeed`.

**The full tier, run to completion once** (`node scripts/run_mutation_witness_tests.mjs
--repo C:\workspace\tolstack` from this worktree, ~1700 lines of output):
85/138 witnessed. All 53 misses are `browser` entries reporting
`TIER_ALREADY_RED` on their clean baseline, every one printing
`Cannot find package 'playwright-core'` — the pre-existing, documented
worktree-only limitation (`CLAUDE.md`: the browser tier's `node_modules` exists
only in the main checkout; `--repo` redirects `data/`/`venv-win/`, not node's
own module resolution, which walks up from the shadow's location **inside this
worktree** regardless). Confirmed not a regression by running
`node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` directly:
522/522 passed. Every `fast`, `annotate` and `python` entry in the full run
witnessed or was otherwise unaffected; zero `ENOENT`/`EPERM` anywhere in the
full log.

## Things the next session should not rediscover by hand

- **Bash-tool path quoting trap on Windows**: `--repo C:\\workspace\\tolstack`
  (double backslash, meant to survive bash's own escaping) silently produced a
  wrong `dataRoot` and `projection_freshness.cjs` reported "no projection file
  is present" even though the files existed. `--repo C:/workspace/tolstack`
  (forward slashes) worked correctly. Use forward slashes for Windows paths
  passed as CLI args through the Bash tool.
- **The main-checkout edit guard blocks `git stash` there too**, not just
  direct file writes — stashing someone else's uncommitted edits in the main
  checkout to get a clean tree for a projection rebuild is refused the same
  way a tracked-file write is. Turned out to be moot this session: the
  existing projection was already fresh and paired against both the main
  checkout and this worktree (the two stray uncommitted edits sat in
  `docs/issues/` and `docs/strategy/`, neither a projection input), so no
  rebuild was needed. If a future session hits this guard for a genuine
  rebuild need, that is the operator's call, not a workaround to route around.
- **A cheap `fast`-tier entry (not `annotate`, not `browser`) is the right
  choice for a concurrency test.** `fast__a-ready-banner-...` runs a full
  clean+mutated pair in under 2 seconds; the `annotate` tier's equivalent took
  ~47s. Both work, but the `fast` one keeps the test suite's wall clock down
  without losing any coverage of the actual lock/sweep behaviour, which does
  not care which tier the entry belongs to.

## Scope not touched, per the handoff's own fence

`scripts/projection_freshness.cjs`, `scripts/projection_provenance.py`, and
anything under `data/projections/` were out of scope and untouched — the
shared-projection coupling is `docs/strategy/BRIEF_20260914_real_tier_shared_projection_coupling.md`'s
live question, not this handoff's.
