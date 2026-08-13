---
type: bug
priority: high
status: resolved
area: workspace hygiene / main checkout
reporter: agent
handoff: docs/sessions/HANDOFF_20260812_restore_viewer_readme.md
---

> **Resolved 2026-08-12 by `restore_viewer_readme`.** The Ghostwriter process was
> already gone when that session ran (`Get-CimInstance … '*ghostwriter*'` returned
> nothing), so step 1 needed no human after all. Steps 2 and 3 done in the main
> checkout: README back to 305 lines, `.backup` deleted, `git status --porcelain`
> clean and **re-verified 97 s later** — the check that matters against a ~20 s
> autosave loop. Full suite green in the main checkout (351 passed). The restored
> citation counts were re-derived from the live projection and are correct
> (`26 of 48`, `15 of 22`, `6 of 9`); nothing needed correcting.
>
> Two follow-ons, both deliberate: `*.backup` was **not** added to `.gitignore` —
> the artefact is the tell that a non-git writer owns a file, and hiding it is how
> this nearly went unnoticed. And the doc-scan guards cannot fail on this defect
> at all, filed as
> `ISSUE_20260812_the_doc_scan_guards_cannot_fail_on_a_deleted_section.md`.
> Timeline and reasoning:
> `docs/sessions/lessons/LESSONS_20260812_restore_viewer_readme.md`.

# A Ghostwriter window is writing a stale `apps/viewer/README.md` over the main checkout, ~20 s after every merge

**This is for a human, not an agent: close or reload the Ghostwriter window and
the problem is gone.** It is filed `high` because the failure mode is a silent
revert that looks like ordinary cleanup in `git status`.

## What is happening

`C:\Program Files\ghostwriter_2.1.6_win64_portable\ghostwriter.exe` (PID 3132 as
of 2026-08-12T23:52Z) has `C:\workspace\tolstack\apps\viewer\README.md` open with
a buffer loaded **before** 2026-08-12's viewer work. It autosaves: it copies
whatever is on disk to `apps/viewer/README.md.backup`, then writes its stale
buffer over the real file. Identified with:

```powershell
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*tolstack*' } | Select-Object ProcessId, Name, CommandLine
```

Observed twice during the `viewer_export_and_material_provenance` review: a
`git checkout -- apps/viewer/README.md` was undone inside ~20 seconds, and the
second time it aborted a `git merge` outright
(*"Your local changes to the following files would be overwritten by merge"*).
Both files were rewritten at 16:51:39 and 16:52:00 local, seconds after the merge
touched the file.

## Why it matters

`master` is correct; the **working tree** is not, and the difference is invisible
unless you look:

* `git status` in `C:\workspace\tolstack` shows a plain ` M apps/viewer/README.md`.
* The diff is a *deletion* of whichever README sections landed after the buffer
  was loaded — currently the `viewer_fixture_shape_guards` guards section **and**
  the `viewer_export_and_material_provenance` export/materials sections.
* **A `git add -A` in the main checkout would commit that deletion**, and the
  commit would read as tidy-up. This is the overlay's *"the defect is an
  uncommitted edit in the MAIN checkout"* entry with a live writer behind it.

## History

First sighted by the `viewer_fixture_shape_guards` review
(`docs/sessions/reviews/REVIEW_20260812_viewer_fixture_shape_guards.md`, "Post-merge
condition of the MAIN checkout"), which correctly diagnosed the *behaviour* — a
live process holding a pre-merge copy and re-reverting ~17 s after a restore — but
guessed the owner was the next staged handoff's tactical agent. It was not; no
agent was involved. The next review reproduced it and found the process.

## Fix

1. Close the Ghostwriter window, or reload the file in it (its buffer is stale, so
   **do not save from it**).
2. `git -C C:\workspace\tolstack checkout -- apps/viewer/README.md`.
3. Delete `apps/viewer/README.md.backup` — it is a Ghostwriter artefact, byte-
   identical to whatever was on disk when it last autosaved, and it is untracked
   junk either way.

## Related

`ISSUE_20260807_dispatch_toml_untracked_in_main_checkout.md` — the other
permanently-untracked file in that checkout, and the reason
`projection_provenance.stamp()` passes `--untracked-files=no`.
