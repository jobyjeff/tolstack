---
type: review
handoff: docs/sessions/active/HANDOFF_20261001_mutation_witness_shadow_is_per_run.md
reviewer: agent
date: 2026-10-01
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-10-01 — mutation_witness_shadow_is_per_run

> **Round 2, 2026-10-01: APPROVE.** The frontmatter verdict is round 2's.
> The `## Round 2` section at the end is the second reading; everything above
> it is round 1, kept verbatim including the REQUEST CHANGES verdict it
> reached, because the round-2 fix is only legible against what was measured
> the first time.

Branch `handoff/mutation_witness_shadow_is_per_run` (1 commit, tip `396b327`),
merged into `review/mutation_witness_shadow_is_per_run` (clean merge, no
conflicts, off `integration`) **for verification only — the merge to
`integration` is NOT made, see the verdict below.**

## Short version

The per-run shadow (`tmp/mutation-witness-<pid>/`) is correct and does fix the
original defect: the `applyToShadow` ENOENT and `buildShadow` EPERM the issue
reported are gone, confirmed by reproducing both on the pre-merge code with the
handoff's own test and watching them disappear post-merge. The stale-shadow
sweep, the `applyToShadow` pointer comment, and the lesson (disk cost measured,
Windows pid-reuse honesty, the `data/` ownership audit) are all exactly what
the handoff asked for and are good work.

But the second deliverable — "a lock whose refusal names the other run" — does
not reliably hold. `acquireLock()`'s stale-lock path treats "I could not parse
the lock file" the same as "the pid inside it is dead," and a `"wx"`-exclusive
create is not an atomic create-with-content: the loser of the race can open
the winner's just-created, not-yet-written lock file, get `""`, fail to parse
it, and conclude — wrongly — that the lock is abandoned. It then clears and
reclaims it, and **both processes proceed with no refusal printed by either.**
This is not a hypothetical: the handoff's own concurrency test hit it in 3 of
10 back-to-back runs on this machine. That is the exact contention ("both
still spawn tiers against this repo's own gitignored `data/` and tracked
files, so only one may run at a time") the lock exists to prevent, so this is
a blocker rather than a should-fix.

## What I verified

- **Reproduced the original defect pre-merge.** Checked out the handoff's test
  file against `integration`'s (pre-work) `scripts/run_mutation_witness_tests.mjs`
  and ran `test_two_concurrent_runs_against_one_repo_produce_a_named_refusal`:
  it failed with the exact `EPERM` crash the issue describes (`buildShadow`'s
  `rmSync` on the shared fixed-path shadow), confirming the test targets the
  real defect and that the defect is real on this tree.
- **Clean merge.** `git merge handoff/mutation_witness_shadow_is_per_run` into
  this review branch produced no conflicts (4 files changed: `pytest.ini`,
  `scripts/run_mutation_witness_tests.mjs`, the new test file, the lesson).
- **Risky subset (pre-merge equivalent, re-run post-merge in this worktree):**
  `pytest -q tests/test_mutation_witnesses.py tests/test_projection_freshness.py`
  — 42 passed. `node scripts/run_mutation_witness_tests.mjs --only
  "fast__a-ready-banner"` (single run, no `--repo`, so the `[real]` witnesses
  are skipped rather than stale against this worktree's empty `data/`) —
  1/1 witnessed, clean.
- **The new concurrency test module, run repeatedly post-merge:**
  `test_two_different_repo_roots_both_still_succeed` and
  `test_a_stale_lock_pid_dead_is_cleared_with_a_message` passed consistently
  (6/6 and several more individual re-runs). `test_two_concurrent_runs_
  against_one_repo_produce_a_named_refusal` passed 7 of 10 runs and **failed 3
  of 10**, every failure showing the same shape: one process prints `clearing
  an unreadable lock at ...mutation-witness.lock`, both processes then print
  `declared mutations witnessed` and exit 0, and neither prints `REFUSED`.
- **Did not run the full `pytest -q` in the main checkout**, because the
  blocker below means this does not go to `integration` this round — see "Test
  record" below for what the tactical report should carry when it comes back.

## Findings

### Blocker — the lock's stale-vs-live distinction is racy, and loses the race a measured ~30% of the time

**Location:** `scripts/run_mutation_witness_tests.mjs`, `acquireLock()`
(the `tryClaimLock()` → read-and-parse → `pid === null` branch).

**What's wrong:** `tryClaimLock()` claims the lock with
`writeFileSync(LOCK, json, { flag: "wx" })`. On Windows (and POSIX) this is an
exclusive **create**, done as an `open()` followed by a separate `write()` —
not one atomic "create-with-this-content" syscall. When a second run's
`tryClaimLock()` fails with `EEXIST`, `acquireLock()` immediately
`readFileSync`s the lock and `JSON.parse`s it. If the first run's `write()`
hasn't landed yet, the read returns `""`, `JSON.parse` throws, the catch sets
`existing = null`, and the code takes the `pid === null` branch — logged as
`clearing an unreadable lock` — which deletes the file and reclaims it for
itself, with no further check. The first run's lock is now gone and the second
run believes it holds the only one; both proceed, spawn tiers, and finish with
exit 0. **No `REFUSED` is ever printed by either process.** This is a
different race from the one the code already handles in the few lines below
it (two runs correctly agreeing a lock is dead and then losing the *reclaim*
race to each other, caught by the second `tryClaimLock()` call) — that one is
reported; this one isn't checked for at all, because "unreadable" and "pid
confirmed dead" are folded into the same branch.

**How I know it's real, not theoretical:** the handoff's own test,
`test_two_concurrent_runs_against_one_repo_produce_a_named_refusal`, starts
two real `node` processes back-to-back via `subprocess.Popen` — exactly the
shape of two sessions kicking off the tier close together, which is the
ordinary-use scenario the handoff's own "A process note" section and the
original issue describe. Across 10 consecutive runs on this machine it failed
3 times, each with the exact mechanism above visible in the captured output
(`clearing an unreadable lock` on the loser, no `REFUSED` anywhere, both exit
0). This is frequent enough that it would periodically redden this exact test
in the post-merge full suite and — more importantly — periodically let two
real witness runs collide on `data/` and the tracked tree for real, silently.

**Suggested fix (for the tactical agent, not inline — this is a logic change
to the locking primitive and needs a test that pins the race deterministically
rather than one that hits it by chance):**
- Make the claim atomic: write the JSON to a uniquely-named temp file in
  `tmp/` and `renameSync` it onto `LOCK`. A rename onto an existing path is
  atomic on both NTFS and POSIX, so a reader never observes a partially-written
  file — only the fully-written old one or the fully-written new one.
- Separately, don't conflate "I could not parse this" with "the pid inside it
  is dead." A parse failure is ambiguous (live writer mid-write vs. genuine
  corruption); only a *successfully parsed* lock whose pid fails `isAlive()`
  should be treated as stale. An unparseable lock that persists across a short
  retry (a handful of milliseconds) is the only case that's actually safe to
  clear as corrupt.
- A deterministic test for this needs to force the race rather than hope for
  it — e.g. holding the lock file open across the write in a way a second
  process can observe, or mocking the window — rather than relying on two real
  process starts to occasionally collide.

This is why the verdict is REQUEST CHANGES rather than APPROVE-with-an-issue:
it fails the inline-fix boundary on all three prongs (changes designed
behavior of the locking primitive; needs a new, deterministic test to be
trustworthy; is not "a few lines" once the test is counted), and it is squarely
in scope for this handoff — the lock *is* deliverable 2.

### Should-fix (not blocking on its own, raise it with the rework) — no full-suite pytest record

The tactical report records a full `node scripts/run_mutation_witness_tests.mjs`
run (85/138, with the 53 browser misses explained as the known worktree
`node_modules` limitation) and a direct `apps/viewer/run_tests.cjs` sanity run
(522/522), both in the lesson. It does **not** record a
`venv-win/Scripts/python.exe -m pytest -q` run in the main checkout anywhere —
not in the lesson, not in the handoff file (which is otherwise untouched by
this branch), not in the commit message. The handoff's own Definition of Done
asks for this explicitly. Per the canonical process this voids the benefit of
the doubt on the full-suite question, but since this round is going back
anyway I did not spend the time running it myself pre-merge; the next round's
record should include it, in the main checkout, after a projection rebuild if
one is needed there.

## Overlay maintenance

Added a new entry to `docs/prompts/REVIEW_AGENT.md`'s "Architectural errors to
check" for the `"wx"`-exclusive-create-is-not-atomic-create-with-content
pattern, generalised beyond this one lock file, since it's the kind of thing
that will recur anywhere this repo adds a pidfile-style lock.

## For the next reviewer / the tactical agent picking this back up

- The per-run shadow, the sweep, and the `applyToShadow` pointer comment are
  solid and don't need rework — only `acquireLock`'s stale/unreadable branch
  and its test does.
- Re-run the existing `test_two_concurrent_runs_against_one_repo_produce_a_
  named_refusal` several times (not once) after the fix — it passing once is
  not evidence the race is closed, given the ~30% rate measured here on the
  unfixed code. Ideally replace or augment it with a deterministic reproduction
  of the specific race rather than relying on timing luck either way.

## Round 2 — APPROVE

Commit `8f8a667` ("mutation witness: make the lock's claim atomic, not just
exclusive"), on top of `396b327`. Merged into this review branch with no
conflicts (clean three-file diff: the script, the test, the lesson).

**The fix matches the suggested direction exactly, and goes one better than
what I asked for.** `tryClaimLock()` now writes the lock's JSON complete to a
private per-pid-and-hrtime temp file, then publishes it at `LOCK` with
`linkSync` — a hard link is a single filesystem operation that is *also*
exclusive (`EEXIST` if the destination exists already), so unlike a plain
rename it cannot silently clobber a live lock, and unlike the old `"wx"`
write it cannot be observed half-written: any reader that sees `LOCK` exist
at all sees it fully populated. `readLock()` now separates `"absent"` /
`"ok"` / `"corrupt"` into three states instead of folding "could not parse"
into "pid is dead," with a short retry (`Atomics.wait`-based, synchronous, 3
tries at 5ms) on `"corrupt"` as defense in depth against anything other than
the write race itself — which the atomic publish already closes structurally,
so a `"corrupt"` read should now only ever mean genuine external corruption.

**Verified, not just read.** I re-ran the strengthened
`tests/test_mutation_witness_shadow_concurrency.py` (now 4 tests: the
10-round concurrent-refusal test, the new deterministic
`test_a_corrupt_lock_file_is_cleared_and_reported_as_corrupt_not_as_stale`,
the two-different-repos test, and the stale-lock test) four separate times —
every invocation green, so 40 more rounds of the specific race on top of the
author's own 40, for 80 total rounds and zero recurrences against the ~30%
pre-fix rate. Also re-ran `pytest -q tests/test_mutation_witnesses.py
tests/test_projection_freshness.py` (42 passed) and a single
`node scripts/run_mutation_witness_tests.mjs --only "fast__a-ready-banner"`
(1/1 witnessed) to confirm nothing outside the lock logic regressed.

**Full suite, post-merge, in this review worktree:**
`venv-win/Scripts/python.exe -m pytest -q` → `1 failed, 1441 passed`. The one
failure is `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`,
the documented worktree-only limitation (no `data/projections/` here) —
confirmed non-regressing separately via `node apps/viewer/run_tests.cjs
--repo C:/workspace/tolstack` (428/429, the 1 skip being the same `[real]`
tier, stale against the main checkout's own projection for reasons unrelated
to this diff — no topology file is touched by this handoff). Not a
regression from this change; the only tests this diff could plausibly affect
(the mutation-witness tier's own suite) are covered by the risky-subset runs
above, not by this tier.

**One nit, fixed inline (correction blockquote, not a rewrite):** the
lesson's round-2 addendum claimed `1440 passed, 1 deselected` for the
full-suite run; this repo has no marker-based deselection mechanism at all
(no `conftest.py`, no `addopts` in `pytest.ini`), and my own re-run of the
identical command on the identical merged tree reads `1 failed, 1441 passed`
— the failure being the same named, documented worktree limitation, and the
total off by one for the same reason. Added a dated correction blockquote
rather than editing the claim away, per this repo's convention; doesn't
change anything about the code under review.

**Disposition.** No should-fixes left unfixed and in scope for this handoff,
so no issue to file on APPROVE. Merging into `integration` now.
