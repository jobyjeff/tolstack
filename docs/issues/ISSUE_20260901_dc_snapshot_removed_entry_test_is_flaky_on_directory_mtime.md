---
type: bug
priority: med
status: open
area: tests/snapshot
reporter: agent
---

# `test_a_removed_entry_is_reported_as_removed` is flaky: it asserts a directory mtime moved

`tests/test_dc_snapshot.py::test_a_removed_entry_is_reported_as_removed` fails
intermittently — **1 of 5 consecutive isolated runs** on 2026-09-01, and it
failed on two of three full-suite runs during handoff `dag_topology_format`
while passing every time the file was run alone immediately afterwards.

Noticed while running the suite for an unrelated handoff. Nothing in that
handoff touches `scripts/snapshot_drawing_checker.py`, `tests/test_dc_snapshot.py`
or anything they import: the same suite with the new test module excluded
(`pytest -q --ignore=tests/test_topology.py`) passed 473/473, and the failure
also reproduces with no new code involved at all.

## The failure

```
    assert [e["path"] for e in result["removed"]] == [victim.as_posix()]
    # ...and its parent moved, which is how a re-render shows up.
>   assert [e["path"] for e in result["modified"]] == [victim.parent.as_posix()]
E   AssertionError: assert [] == ['.../runs/20260804_114000_217755_A.1']
E     Right contains one more item: '.../runs/20260804_114000_217755_A.1'
```

The **first** assertion always holds — the removal is detected correctly. Only
the second, the claim that the victim's parent directory shows up as `modified`,
is unstable.

## Repro

```powershell
venv-win/Scripts/python.exe -m pytest tests/test_dc_snapshot.py::test_a_removed_entry_is_reported_as_removed -q
```

Run it several times; it fails roughly once in five. Running the whole suite
raises the hit rate, which fits a timing cause (more work between the fixture
creating the directory and the test deleting from it does not help; less does).

## Cause, as far as it was diagnosed

Not verified in code, so read this as the hypothesis to check first: the
assertion is about a **filesystem mtime**, and on NTFS a directory's last-write
timestamp has coarse resolution. When the fixture creates the directory tree and
the test deletes a file from it inside the same timestamp tick, the recorded
mtime does not change, so `diff_snapshots` legitimately sees no modification and
reports an empty `modified` list.

If that is right, the test is asserting a property of the platform's timestamp
granularity rather than a property of `diff_snapshots`, and the fix is on the
test side — not in the snapshot code, which is behaving correctly in both
outcomes.

## Suggested fix — not prescribed, pick on the merits

1. **Drop the second assertion** and keep the first. The `removed` list is the
   claim the snapshot tool exists to make; "its parent's mtime also moved" is an
   incidental consequence the tool does not promise. Cheapest, and the comment
   above the assertion (*"which is how a re-render shows up"*) suggests the
   parent-moved signal is a nice-to-have rather than the contract.
2. **Make the precondition true**: stamp the directory's mtime backwards (or
   sleep past the granularity) between the snapshot and the delete, so the test
   is testing detection rather than racing the clock. Keeps the coverage, adds a
   platform-dependent nudge to a test that currently has none.
3. **Decide the contract deliberately**: if a parent directory *must* report as
   modified when a child is removed, that is a statement about
   `diff_snapshots`'s output and it should be derived from the removal rather
   than read off an mtime — in which case the fix is in
   `scripts/snapshot_drawing_checker.py` and the test is right to fail.

Option 1 or 2 unless someone wants the invariant in 3; a flaky assertion in a
suite this repo treats as reliably green costs more than the signal it carries,
because the next agent to see it red will spend the time this issue just spent
proving it is not theirs.
