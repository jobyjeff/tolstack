---
type: bug
priority: low
status: resolved
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

## RESOLVED before this issue ever reached triage (2026-09-14)

Fixed on `handoff/spec_crop_region_registry` (`0046ff5`) in the same rework that
answered the review's blocker, i.e. before the handoff merged. `main()` now
names the registry before it opens it and raises `Refused`, and the `except`
also catches `json.JSONDecodeError` so an unparseable registry file reports the
same way. Two tests cover both. Verified by the reviewer on the merged branch:

```
refused: no crop-region registry at C:\nonexistent\cr.json -- the tracked one
is at docs/spec_library/crop_regions.json, relative to the repo root; check --registry
```
exit code 2, matching every other refusal this verb makes.

Marked `resolved` rather than left `open` by the reviewer who filed it: the fix
shipped with the branch the issue was filed against, so `open` would have sent a
triage sweep after a bug that no longer exists. Triage still owns `closed`.

The original report follows.

## What to do

Catch `OSError` (or check `registry_path.exists()` first) and raise `Refused`
with the path and the default's location. Add the test beside
`test_a_document_that_is_not_in_the_pile_is_refused` in
`tests/test_record_spec_crop_region.py` — the bench fixture already builds a
registry path, so the test is the same shape with the file removed.
