---
type: bug
priority: low
status: closed
area: tests
reporter: agent
handoff: docs/sessions/HANDOFF_20260902_dc_snapshot_mtime_flake.md
resolution: closed as duplicate of ISSUE_20260901_dc_snapshot_removed_entry_test_is_flaky_on_directory_mtime (same test, same directory-mtime granularity race, filed independently the same day); the kept issue carries strictly more evidence (1 of 5 isolated runs, 2 of 3 full-suite runs) and is routed to the handoff above
---

# `test_a_removed_entry_is_reported_as_removed` flakes on directory-mtime granularity

Seen once during `review/claude_md_tracked` (2026-09-01), on Windows with
`C:\workspace\tolstack\venv-win`:

```
FAILED tests/test_dc_snapshot.py::test_a_removed_entry_is_reported_as_removed
tests\test_dc_snapshot.py:83: AssertionError
1 failed, 558 passed, 1 skipped
```

Line 83 is the second assertion, not the first:

```python
assert [e["path"] for e in result["removed"]] == [victim.as_posix()]
# ...and its parent moved, which is how a re-render shows up.
assert [e["path"] for e in result["modified"]] == [victim.parent.as_posix()]
```

The removal itself was detected; what did not show up is the **parent
directory's mtime moving**. The test takes `before`, unlinks a file, and takes
`after` with no delay, so when both snapshots land inside one filesystem
timestamp tick the directory looks unmodified and `modified` comes back empty.
It passed in isolation immediately afterwards and on two subsequent full runs —
a timing flake, not a regression, and unrelated to the handoff under review.

The same shape is latent in `test_a_new_run_directory_shows_...` and
`test_a_rewritten_file_is_modified_with_the_fields_that_moved`, which also
assert on `modified`/mtime with no tick separation.

Fix candidates, cheapest first: bump the victim's parent mtime explicitly with
`os.utime` after the unlink; or have the `watched` fixture back-date its entries
so `before` is always at least one tick old. Do **not** fix it by dropping the
parent-moved assertion — that is the assertion carrying the "a re-render shows
up as a parent modification" claim the snapshot check exists for.
