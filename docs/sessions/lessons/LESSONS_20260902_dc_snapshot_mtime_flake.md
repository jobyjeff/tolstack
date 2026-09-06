# LESSONS 2026-09-02 — dc_snapshot_mtime_flake

Handoff: `docs/sessions/HANDOFF_20260902_dc_snapshot_mtime_flake.md`.
Issue: `docs/issues/ISSUE_20260901_dc_snapshot_removed_entry_test_is_flaky_on_directory_mtime.md`.
Scope was `tests/test_dc_snapshot.py` only; `scripts/snapshot_drawing_checker.py`
is unchanged, and nothing in this session suggests it should be.

## The contract question, and the answer

**Is "the parent's mtime moved" part of the snapshot tool's contract?**

Two different claims were tangled in one assertion, and separating them answers
it:

1. *Removing a file moves its parent directory's mtime.* This is *not* the
   tool's claim. It is NTFS behaviour. The tool observes timestamps; it never
   promises what the filesystem will do with them.
2. *An entry whose only moved field is `mtime_ns` is reported as `modified`.*
   This **is** the tool's claim, and it is load-bearing. `diff_snapshots`'s
   docstring says `modified` names the fields that moved precisely so "the mtime
   changed but the bytes did not" is distinguishable; `scan_root`'s says
   directories are entries because "a directory's own mtime moves when a child
   is added -- so it is signal, not noise". A directory entry carries
   `size: None` on both sides, so `mtime_ns` is the *only* field that can ever
   flag one. Delete the assertion and the tool's stated reason for recording
   directories at all has no test standing on it.

So the answer is **option 2** (keep the coverage, make the precondition true),
and the handoff's framing is right that option 1 would delete real coverage. But
the reason is narrower than "the parent-moved signal is the contract": what is
the contract is the *reporting* of a mtime-only move, not the *occurrence* of
one. The old test asserted the tool's claim by inducing the platform fact and
hoping the clock cooperated. The fix separates them — backdate the directory
before the snapshot, so the movement is unambiguous, and the assertion is left
testing only the part the tool actually owns.

Two small changes came with it, both making the claim explicit rather than
incidental: the `# ...and its parent moved` comment now sits under an added
`fields == ["mtime_ns"]` assertion, so the file says *which* contract it is
defending, and the docstring records why the backdate is there (the next person
to see a `os.utime` in a test will otherwise delete it as noise).

## Why it flaked, measured rather than assumed

The issue's hypothesis was right, and it is worth pinning the mechanism because
it is the opposite of the one the issue's own evidence suggests.

Barest possible shape (mkdir, write child, stat, unlink, stat), 200 trials:
**66 identical / 134 moved** — a 33% collision rate. The unlink *always* updates
the directory's last-write time; what fails is that the fixture set that same
timestamp microseconds earlier, so the new value lands in the same clock tick as
the old and compares equal. Backdating the directory 10 s first: **0 identical /
200 moved**.

Replaying the actual old and new test bodies against the real `sds` functions,
300 trials each:

| shape | `removed` assertion | `modified` assertion |
|---|---|---|
| old (no backdate), unloaded | 300/300 | **291/300** |
| old (no backdate), under 3 concurrent full-suite runs | 300/300 | 300/300 |
| new (backdate), unloaded | 300/300 | 300/300 |
| new (backdate), under 3 concurrent full-suite runs | 300/300 | 300/300 |

**The load correlation the issue reports did not reproduce, and the mechanism
predicts it should not.** Load puts *more* time between the fixture writing the
child and the test deleting it, which makes the two timestamps more likely to
differ, not less — under three concurrent suite runs the old shape went
300/300 green. The issue recorded "eight full-suite runs, five red" and read
load as the driver; on this box the driver is how *tight* the gap is, and a
full-suite run is plausibly tighter (warm caches, warm interpreter) rather than
slower. Whoever next chases a timestamp flake here: measure the gap, not the
load. Either way the fix removes the dependence entirely, so the distinction
does not change the disposition — but a wrong mechanism in the issue would have
sent the next person to a sleep, which is the one thing the handoff rules out.

`sleep` was never a candidate: it trades a certain race for a probabilistic one
and makes the suite slower for the privilege. `os.utime` has no timing in it.

## Full-suite runs (deliverable 2)

**N = 10 consecutive sequential full-suite runs, 10 green**, plus 3 further
runs executed concurrently with each other (the load condition above), also
green — **13 green, 0 red**, `570 passed, 1 skipped` every time (one of the
three concurrent runs also emitted `1 warning`, which is contention noise from
three interpreters sharing a tmp base, not a test result). Command, from the
worktree (the venv is main-checkout only):

```
PYTHONIOENCODING=utf-8 C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q
```

The 600 new-shape stress trials are the stronger evidence and are why the run
count is 10 rather than 30: they exercise the same code path ~65x more times per
second than a suite run does, and they include the loaded condition that suite
runs alone cannot isolate.

## Siblings (deliverable 3)

The contract resolved to "the mtime signal matters", so the sweep was owed.
**Nothing else in the suite depends on directory-mtime granularity.** `st_mtime`
/ `getmtime` / `os.utime` appear in exactly one test module (this one) and one
script (`scripts/snapshot_drawing_checker.py`); no projection builder, no
provenance gate, no doc guard reads a timestamp. Three touchpoints, none of them
a sibling flake:

- `test_taking_a_snapshot_writes_nothing_into_the_directory_it_watches` compares
  `st_mtime_ns` before and after and asserts **equality**. Coarse granularity can
  only make an equality assertion hold more easily, so it cannot flake — the
  residual risk is the inverse and much milder: if `take_snapshot` ever did
  write, and the write landed inside one tick, the stamp comparison would miss
  it. The listing comparison beside it still catches any added or removed entry,
  so the hole is "a same-tick in-place rewrite of an existing file", which is not
  a shape this read-only script can produce. Left alone.
- `test_a_rewritten_file_is_modified_with_the_fields_that_moved` asserts
  `"size" in modified[...]`, never mtime. Its docstring says "size and mtime are
  what betray it" but the assertion deliberately rests on size only, which is why
  this one has never flaked. That is the pattern to copy.
- `test_a_new_run_directory_shows_the_directory_its_files_and_its_parent` is a
  **near miss**: its name lists "its parent" as a third thing shown, but the
  test never asserts anything about `modified`, and its exact-equality `added`
  assertion positively excludes the parent root. Had that assertion been written
  it would be a second instance of this exact flake, for the same reason. Filed
  as `ISSUE_20260902_dc_snapshot_new_run_dir_test_name_promises_an_assertion_it_does_not_make.md`
  (low chore) rather than fixed here — the correct repair is to the *name*, and
  renaming a test is outside a flake handoff's scope.

## Left undone, deliberately

- The source issue is still `status: triaged`. Marking it `resolved` is triage's
  to set, not mine.
- The handoff sits at `docs/sessions/` root on this branch while the main
  checkout has it in `active/`. That move was dispatch's, made outside this
  branch; leaving it alone keeps the merge clean and the board move is the
  reviewer's.
