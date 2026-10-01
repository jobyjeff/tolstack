---
type: bug
priority: med
status: open
area: guards/mutation-witness
class: silent_failure
reporter: agent
found_by: docs/sessions/reviews/REVIEW_20260930_columns_ordered_to_minimise_crossings.md
---

# A missing interpreter kills the whole mutation run, where the preflight one screen earlier promised a MISS

`scripts/run_mutation_witness_tests.mjs` resolves the pytest tier's interpreter
off `--repo` (`PYTHON = join(DATA_REPO, "venv-win", "Scripts", "python.exe")`),
which is deliberate and documented — in a worktree the venv lives only in the
main checkout and `--repo` is already the flag that names it. It also has a
preflight that notices when that path is not there, and it fired correctly,
on line 1 of the run:

```
note: no interpreter at C:\…\tolrev\venv-win\Scripts\python.exe, so every
`python` witness will be reported as a MISS. That path is the one --repo named.
```

**It is not reported as a MISS.** The run proceeds normally through all 107
browser/fast/annotate entries, reaches the first `python__` entry, and dies:

```
node:events:487
      throw er; // Unhandled 'error' event
Error: spawn C:\…\tolrev\venv-win\Scripts\python.exe ENOENT
    at ChildProcess._handle.onexit (node:internal/child_process:287:19)
```

Seven of the eight `python__` specs never ran, and the process never printed
its summary line — so the run ends with no `N/M declared mutations witnessed`
and no exit verdict at all. The only reason this cost nothing here is that
`python` sorts last; an entry order that put it first would take the whole
tier out after the shadow build.

## Cause, in one line

`runTier()` (`scripts/run_mutation_witness_tests.mjs`) builds its child with
`spawn(...)` and attaches `stdout`, `stderr` and `close` handlers — but no
`error` handler. On an `EventEmitter`, an `error` event with no listener is
re-thrown, so "the child could not be started" is a process-level crash rather
than a result the loop can record.

## The fix

`child.on("error", …)` resolving the same shape `close` resolves, with the
spawn error as the recorded reason — the tier's `MISS` carries its reason
already, so there is a place to put it. Then the preflight's sentence becomes
true, and the run finishes and reports.

Worth doing in the same pass: the preflight knows the answer **before** the
shadow is built. Reporting the python entries as misses up front, rather than
discovering it one child at a time, would also mean the message names them.

## Second sighting of a shape this repo already has an entry for

`ISSUE_20260930_the_pairings_spawned_runner_reports_a_crash_as_a_parse_divergence.md`
is the same tool failing the same question from the other side: there, a child
that *started* and threw was reported as a parse divergence, because only
stdout was read. Here, a child that never started takes the parent with it,
because only `close` was listened for. Both are "three outcomes, not two", and
both are one handler.

## Repro

```
node scripts/run_mutation_witness_tests.mjs --repo <a root with data/ but no venv-win/>
```

Any scratch `--repo` root built the way
`ISSUE_20260930_a_worktree_has_no_supported_way_to_run_the_real_tiers_against_its_own_projection.md`
describes reproduces it, since that recipe junctions `data/` and `docs/` and
has no reason to junction `venv-win/`. Workaround, which is what this review
used: junction `venv-win` into the scratch root too, then re-run the eight
`python__` entries with `--only`.
