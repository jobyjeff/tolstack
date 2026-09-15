---
type: bug
priority: low
status: open
area: scripts/spec-crop-regions
reporter: agent
---

# `record_spec_crop_region.py` tracebacks on a `--registry` path that does not exist

Found in review of handoff `spec_crop_region_registry` (2026-09-14),
`docs/sessions/reviews/REVIEW_20260914_spec_crop_region_registry.md`. Left
unfixed because the fix is a behaviour change (a new refusal path) that wants
its own test, which is past the reviewer's inline-fix boundary.

`main()` calls `scr.load(registry_path)` **inside** the `try` that catches
`(scr.RegistryError, Refused)` — but a missing file raises `FileNotFoundError`,
which is neither, so it escapes:

```
> ...python.exe scripts/record_spec_crop_region.py --registry C:/nope/crop_regions.json ... --dry-run
FileNotFoundError: [Errno 2] No such file or directory: 'C:\nope\crop_regions.json'
```

Every other way to misuse this verb — a document not in the pile, a sheet the
document does not have, a rect off the page, a duplicate label, a colliding
match string, PyMuPDF absent — prints `refused: <the whole report>` and returns
2. This one prints a stack trace, and it is the mistake a worktree session is
most likely to make, because `--registry` is exactly the kind of flag someone
re-spells by hand.

`scripts/build_viewer_crops.py` already decided what the right answer is for
the *reader* side: a missing registry file is a legitimate state, said out
loud, not an error. The verb's answer should differ — you cannot append to a
registry you cannot find — but it should be a `Refused` naming
`scr.REGISTRY_RELPATH` as the default, not a traceback.

## What to do

Catch `OSError` (or check `registry_path.exists()` first) and raise `Refused`
with the path and the default's location. Add the test beside
`test_a_document_that_is_not_in_the_pile_is_refused` in
`tests/test_record_spec_crop_region.py` — the bench fixture already builds a
registry path, so the test is the same shape with the file removed.
