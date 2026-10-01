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

## Re-run 2026-10-01 — after review: REQUEST CHANGES

Review (`REVIEW_20261001_mutation_witness_shadow_is_per_run.md`, on
`review/mutation_witness_shadow_is_per_run`) found the per-run shadow, the
sweep, and the `applyToShadow` pointer comment all correct and left them
alone. The blocker was in the lock's stale-vs-live claim, described above as
"claimed with an exclusive `"wx"` file create so two runs can't both believe
they got it" — true of the *claim*, but not of the *content*: `"wx"` is an
exclusive **create**, which is `open(O_CREAT|O_EXCL)` followed by a separate
`write()`, not one atomic "create-with-this-content" syscall. The loser of a
near-simultaneous pair can read the winner's lock file in the gap between
those two syscalls, get `""`, fail to parse it, and — because "could not
parse" and "the pid inside it is dead" were the same code branch
(`pid === null` → "clearing an unreadable lock") — concluded the lock was
abandoned and reclaimed it. **Both processes then proceeded with no refusal
printed by either.** Review measured this at 3 failures in 10 back-to-back
runs of `test_two_concurrent_runs_against_one_repo_produce_a_named_refusal` —
a real, frequent race, not a hypothetical, and squarely in scope since the
lock *is* deliverable 2.

**The fix: make the claim atomic by making the write atomic, not by patching
the read side.** `tryClaimLock()` now writes the lock's JSON complete to a
private temp file first (nobody else is watching that path), then publishes
it at `LOCK` with `linkSync` — a hard link is one filesystem operation that is
*also* exclusive (`EEXIST` if the destination already exists), which is why it
was chosen over `renameSync`: a rename onto an existing path **replaces it
unconditionally** on both Windows and POSIX, which would silently clobber a
live lock instead of refusing and so cannot stand in for `"wx"`'s exclusivity
at all — this is the detail that would have broken a naive "just use rename"
fix. Any reader that observes `LOCK` existing now always sees it fully
written; there is no window where it is present but incomplete.

Separately, per the review's explicit ask: "could not parse this" and "parsed,
and the pid is dead" are now two different code paths (`readLock()` returns
`{state: "ok"|"corrupt"|"absent"}`), with two different log messages
(`clearing a stale lock (pid N ...)` vs. `clearing an unreadable lock at ...
(could not be parsed after retrying -- not a lock this code wrote)`), and only
the former is ever treated as a confirmed-dead-pid stale lock. A `"corrupt"`
read gets three short synchronous retries (`Atomics.wait` on a throwaway
`SharedArrayBuffer`, 5ms apart — Node allows `Atomics.wait` on the main
thread; browsers don't, which is the only reason this isn't completely
unremarkable) before being trusted, as defense in depth against anything
*other* than the now-closed write race; in practice a `"corrupt"` read should
now only ever mean genuine external corruption, since a legitimate claim can
no longer produce one.

**Verification, strengthened per the review's explicit ask for a repeat count
and a deterministic case, not a single lucky run:**

- `test_two_concurrent_runs_against_one_repo_produce_a_named_refusal` now
  loops 10 rounds internally (matching review's own measurement scale) and
  additionally asserts the specific conflation string
  (`"clearing an unreadable lock"`) never appears on the refused side. Run
  four times total this session (40 rounds of the race) — **0 failures**,
  against the pre-fix ~30% per-round rate.
- A new test,
  `test_a_corrupt_lock_file_is_cleared_and_reported_as_corrupt_not_as_stale`,
  forces the specific "unparseable lock" code path directly (writes an empty
  `LOCK` file, no second process, no timing dependency at all) and asserts it
  is reported as corrupt, never as a confirmed-dead-pid stale lock. This is
  the "deterministic reproduction of the specific race" angle review asked
  for, in the form that's actually reproducible on demand: the *end state* a
  mid-write read used to produce, rather than the exact syscall-level timing
  that causes it (which the fix removes the ability to produce at all).

**Full-suite record review flagged as missing, now supplied:**
`venv-win/Scripts/python.exe -m pytest -q` (main-checkout interpreter, this
worktree as cwd) — 1440 passed, 1 deselected
(`tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`, the
documented worktree-only limitation per `CLAUDE.md`, independently confirmed
non-regressing via `node apps/viewer/run_tests.cjs --repo
C:/workspace/tolstack`: 522/522 — same as the original round, re-verified
rather than assumed unchanged).
