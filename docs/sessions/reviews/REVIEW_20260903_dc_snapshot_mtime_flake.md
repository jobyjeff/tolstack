---
type: review
handoff: docs/sessions/completed/HANDOFF_20260902_dc_snapshot_mtime_flake.md
reviewer: review agent (claude-opus-5)
date: 2026-09-03
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-09-03 — dc_snapshot_mtime_flake

Work reviewed: `handoff/dc_snapshot_mtime_flake` @ `208ab55` (2 commits), merged
into `review/dc_snapshot_mtime_flake` at `e1c9576`. Diff is
`tests/test_dc_snapshot.py` (+21/-1), one lesson, one issue. The snapshot tool is
untouched, as the handoff required.

This is not a tolerance stack, so the overlay's seven mandatory stack checks do
not apply. What applies is the universal check **"a new guard has been observed
failing"** — the deliverable is an assertion, and the whole failure mode here was
an assertion that passed for the wrong reason.

## What I verified

**1. The flake is real, and I reproduced it rather than trusting the report.**
Replayed the old and new test bodies against the real `sds` functions, 300 trials
each, on this box:

| shape | `removed` | `modified` (parent) | `fields == ["mtime_ns"]` |
|---|---|---|---|
| old (no backdate) | 300/300 | **293/300** | 293/300 |
| new (backdate) | 300/300 | 300/300 | 300/300 |

7 failures in 300 for the old shape, 0 in 300 for the new — consistent with the
lesson's own 291/300 and 300/300. The defect and the fix both check out.

**2. The contract argument is right, and it is the interesting part of this
handoff.** The agent separated two claims the old assertion had fused: *removing
a file moves its parent's mtime* (NTFS behaviour, not the tool's promise) from
*an entry whose only moved field is `mtime_ns` is reported as `modified`* (the
tool's promise, and the stated reason `scan_root` records directories at all —
a dir entry carries `size: None` on both sides, so `mtime_ns` is the only field
that can flag it). Option 1 would have deleted the only test standing on that
reason. Option 2 is correct, and the added `fields == ["mtime_ns"]` assertion is
what turns the argument into coverage. I checked the docstrings the argument
rests on (`scan_root`, `diff_snapshots`) and they say what the lesson says they
say.

**3. The backdate does not fake the signal.** This was my main concern going in:
a fix that guarantees the assertion by construction is worse than the flake.
It does not. `os.utime` runs *before* the `before` snapshot, so both snapshots
would read `T-10s` if `unlink` failed to move the parent's mtime — the test still
requires the platform fact, it just stops racing the clock for the evidence. Its
residual failure mode is a red test, never a silent pass.

**4. The new guard observed failing — three mutations, scratch copy, all fire.**
The deliverable is an assertion, so green is not evidence:

| mutation to `snapshot_drawing_checker.py` | result |
|---|---|
| `diff_snapshots` stops comparing `mtime_ns` | `test_a_removed_entry_is_reported_as_removed` FAILS |
| `scan_root` stops recording directories | that test **and** `test_a_new_run_directory_...` FAIL |
| dirs carry a real `size` instead of `None` | FAILS on the new line only: `assert ['size','mtime_ns'] == ['mtime_ns']` |

The third matters: it shows the added assertion is independently observable and
not decoration on the line above it.

**5. Full suite, 6 further consecutive runs, all green** —
`570 passed, 1 skipped` every time (20.8–27.4 s), matching the handoff's baseline
count. On top of the author's 10 sequential + 3 concurrent, that is 19 green
full-suite runs with no red.

**6. Deliverable 3's sibling sweep is accurate.** Independently grepped
`st_mtime|getmtime|os.utime|st_ctime|mtime_ns` across the tree: the script and
this one test module, nothing else. The three touchpoints the lesson dispositions
are correctly dispositioned — the equality assertion in
`test_taking_a_snapshot_writes_nothing_...` cannot flake from coarse granularity
(coarseness only makes equality hold), and
`test_a_new_run_directory_shows_the_directory_its_files_and_its_parent` is the
genuine near miss it is described as: `scan_root` uses `root.rglob("*")`, which
does not yield `root`, so the exact-equality `added` assertion positively
excludes the parent the name promises. Filed as
`ISSUE_20260902_dc_snapshot_new_run_dir_test_name_promises_an_assertion_it_does_not_make.md`,
frontmatter correct (`chore` / `low` / `open` / `agent`), and *not* fixed here,
which is the right call — the repair is a rename, and reasserting the parent
would reintroduce this very flake.

**7. Universal: no data pollution, nothing written to drawing-checker.**
`data/` in the main checkout has no file touched in the last hour after six suite
runs. Snapshot diff over drawing-checker's `data/runs` + `data/inbox/drawings`
across the whole review: **EMPTY**, 5479 entries, exit 0 — taken with
`scripts/snapshot_drawing_checker.py`, not with `git status` over there. Both
working trees clean.

**8. Overlay applied.** No entry in `Recurring bugs` or `Architectural errors`
covers timing-dependent tests; nothing in the applicable entries fires on this
diff (no new module, no restated count outside dated history, no vocabulary, no
`docs/reference/` or `data/inbox/specs/` touch, correct `REVIEW_AGENT.md` edited).
One new entry appended — see below.

## Findings

No blockers. No should-fixes. Nits, grouped:

- **The added assertion shipped without a demonstrated failure.** The lesson's
  measurement table proves the *flake* is gone; it does not show the new
  `fields == ["mtime_ns"]` line can go red for a tool regression. It can — I
  supplied that evidence above (mutation 3). Worth doing next time the
  deliverable is an assertion; not worth a loopback here.
- **The historical failure rate is still unexplained.** The issue recorded
  5 red of 8 full-suite runs; neither the issue's load mechanism nor the lesson's
  tick-collision mechanism reproduces anything near that (~2.3%/trial here, and
  the author's concurrent condition went 300/300). The lesson says so plainly
  rather than papering over it, which is the right handling — and the fix removes
  the timing dependence entirely, so the disposition does not turn on it. Noted
  so the next person to see a `dc_snapshot` red does not assume it is closed
  ground.
- **Honest self-correction, worth naming as a positive:** `208ab55` revised the
  run count 9 → 10 because a tenth run was taken after the lesson was drafted.
  The count is the deliverable; correcting it upward to the measured value is
  exactly right.

## Note for the next reviewer

The `10_000_000_000` ns backdate is deliberate and documented in the test's
docstring — do not "tidy" it, and do not replace it with a `sleep`. If you ever
see this test red, the likely meanings are (a) `scan_root` stopped recording
directories, (b) `diff_snapshots` stopped comparing `mtime_ns`, or (c) a dir
entry acquired a second comparable field — in that order. None of them is a
flake.
