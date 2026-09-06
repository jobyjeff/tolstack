---
type: chore
priority: low
status: open
area: tests/snapshot
reporter: agent
---

# `test_a_new_run_directory_shows_the_directory_its_files_and_its_parent` never checks the parent

Noticed during handoff `dc_snapshot_mtime_flake`, while sweeping
`tests/test_dc_snapshot.py` for other assertions that depend on directory-mtime
granularity (deliverable 3 of that handoff). Off-task for that handoff, so filed
rather than fixed.

The test name lists three things the diff shows: **the directory**, **its
files**, and **its parent**. The body asserts the first two and says nothing
about the third:

```python
added = {e["path"]: e["kind"] for e in result["added"]}
assert added == {run.as_posix(): "dir", (run / "run_meta.json").as_posix(): "file"}
assert result["removed"] == []
```

`result["modified"]` is never inspected. The watched root itself is not an entry
at all — `scan_root` uses `root.rglob("*")`, which does not yield `root` — so the
exact-equality `added` assertion positively *excludes* the parent. Whatever "its
parent" was meant to name, nothing checks it.

## Why this is worth a line rather than a fix

The obvious repair — assert the parent shows up as `modified`, since creating a
child directory moves its mtime — would reintroduce
`ISSUE_20260901_dc_snapshot_removed_entry_test_is_flaky_on_directory_mtime.md`
verbatim, for the same reason: the fixture sets the parent's mtime moments
earlier, so the two values collide inside one clock tick (measured 66/200 in the
barest shape). If someone does want that coverage, it needs the same backdate
`test_a_removed_entry_is_reported_as_removed` now carries.

So the likely correct repair is to the **name**, not the assertions: the test
demonstrates that a run dir is listed as an entry alongside the files inside it,
which is the point its docstring actually argues. Renaming it would make the file
say what it does.

## Repro

Read `tests/test_dc_snapshot.py::test_a_new_run_directory_shows_the_directory_its_files_and_its_parent`.
No run needed — the test passes; the defect is that its name claims coverage
that is not there, which misleads the next reader into thinking the
parent-modified signal is already pinned.
