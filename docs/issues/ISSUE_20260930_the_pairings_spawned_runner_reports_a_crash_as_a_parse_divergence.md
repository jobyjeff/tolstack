---
type: bug
priority: low
status: open
area: guards/mutation-witness
class: silent_failure
reporter: agent
found_by: docs/sessions/reviews/REVIEW_20260930_guard_census_pins_the_set_not_the_count.md
---

# `runTier` discards the child's exit status and stderr, so a crashed fast runner is reported as a `RESULT_LINE` divergence

`guard_census_pins_the_set_not_the_count` (2026-09-30) added `pairExecuted()` to
`scripts/guard_enumeration.mjs`: it spawns each fast tier's runner and pairs the
names the runner printed against the names the scan read. The spawn helper is

```
function runTier(repoRoot, runner) {
  const proc = spawnSync(process.execPath, [join(repoRoot, ...runner.split("/"))], …);
  if (proc.error) return { stdout: "", failure: String(proc.error.message) };
  if (typeof proc.stdout !== "string") { … }
  return { stdout: proc.stdout.replace(/\r\n/g, "\n"), failure: null };
}
```

`proc.status` and `proc.stderr` are never read. `proc.error` is only set when
node could not *start* the child (or killed it on `timeout`) — a child that
started, threw and exited non-zero has `error === undefined` and an empty-ish
`stdout`, so `runTier` returns `failure: null` and the parse-check downstream
produces the wrong diagnosis.

**Replayed in review.** With a `throw new Error(...)` planted at module scope in
`apps/viewer/tests.js`, `pytest -q tests/test_mutation_witnesses.py` says:

```
apps/viewer/tests.js: read 0 PASS/FAIL lines out of apps/viewer/run_tests.cjs,
which reports no total line at all. The line shape this file parses
(RESULT_LINE) and the one that runner prints have parted company, so the
pairing would be measuring its own parse.
```

The pairing *does* fail (it is not silent, and
`test_the_pairing_actually_ran_something` fails alongside it), so this is a
diagnosis defect rather than a hole in the gate. But the sentence sends the
reader to `RESULT_LINE` / `TOTAL_LINE`, and the only thing that could have named
the real cause — the child's stack trace on stderr, and its non-zero status —
was thrown away one function earlier. The repo's own most-widespread failure
class is a failure path with no reason attached; this is the same shape with the
*wrong* reason attached, which is worse for a reader who trusts it.

**Fix.** Return `proc.status` and the tail of `proc.stderr` from `runTier`, and
have `pairExecuted` prefer them when the child exited non-zero with no total
line: *"`<runner>` exited N and printed no total line; its stderr ends: …"*.
Note the exit code must not be read in the ordinary case — a fast tier that ran
and reported `FAIL` exits non-zero and that is explicitly not a census failure
(`LESSONS_20260930_guard_census_pins_the_set_not_the_count.md`, "The exit code
is deliberately not read"). The distinction is *non-zero **and** no parseable
total line*, which is exactly the branch that already exists.
