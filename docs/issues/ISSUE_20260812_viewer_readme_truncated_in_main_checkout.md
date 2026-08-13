---
type: chore
priority: med
status: closed
area: apps/viewer / main-checkout working tree
reporter: agent (triage sweep 2026-08-12)
resolution: duplicate of ISSUE_20260812_ghostwriter_holds_a_stale_apps_viewer_readme_over_the_main_checkout.md, which names the cause (a Ghostwriter window autosaving a pre-merge buffer) rather than the symptom. Filed minutes apart by two sessions that could not see each other. The restore work is routed there.
handoff: docs/sessions/HANDOFF_20260812_restore_viewer_readme.md
---

> **CLOSED AS DUPLICATE, same day it was filed.** The triage sweep found the
> truncated file in `git status` and filed this from the symptom; another session
> was concurrently diagnosing the same file and found the *writer* —
> `ghostwriter.exe` PID 3132, holding a pre-2026-08-12 buffer and autosaving it
> over the real file ~20 s after every merge. That issue supersedes this one and
> carries the actual fix (which begins with a human closing a window). This file
> is kept rather than deleted because its measurement — 228 lines vs 305, and the
> `.backup` proven byte-identical to `HEAD` modulo CRLF — is the evidence that
> nothing was lost, and because two independent filings of one defect in one hour
> is itself worth leaving visible.
---

# `apps/viewer/README.md` is sitting 77 lines short in the main checkout, uncommitted, undoing documentation merged the same day

Found by the triage sweep of 2026-08-12 while checking that its own edits were
the only ones in `git status`. **Not filed by whoever caused it**, and not acted
on — see "Why this is a ticket and not a fix" below.

## State, measured 2026-08-12

In `C:\workspace\tolstack` (the **main checkout**, not a worktree):

```
 M apps/viewer/README.md          # 228 lines; HEAD has 305
?? apps/viewer/README.md.backup   # 305 lines
```

The 77 deleted lines are exactly the sections added by
`viewer_export_and_material_provenance`, merged **the same day**:

- the two provenance-legend rows `EXPORT UNESTABLISHED` and `CTE NOT TRANSCRIBED`;
- the whole **"Which bytes the number was read off"** section — the
  `established` / `unestablished` / no-`export` table, including the corrected
  "26 of the 48 live citations have no export block — 21 workbook, 1 assumed, and
  4 `spec`" figure.

That figure is itself the subject of a review fix committed hours earlier
(`358569f`, "the no-export citation count is 26 of 48, not 22") and of
`ISSUE_20260812_four_traced_spec_citations_carry_no_export_block.md`.

## Nothing is lost

`apps/viewer/README.md.backup` is byte-identical to `HEAD:apps/viewer/README.md`
(`diff -w` is empty; the only difference is CRLF vs LF). The content is therefore
held in two places — git HEAD and the untracked backup — and
`git checkout -- apps/viewer/README.md` restores it at any moment.

The `.backup` sibling and the exact-HEAD content point at a tool that wrote a
backup and then rewrote the original from an older copy, rather than at a
deliberate edit. No tolstack handoff was staged or active at the time.

## Why it is worth a ticket anyway

Because the failure mode is silent and one command away. A future session running
`git add -A` in this checkout commits the truncation, and the repo loses
documentation that a review had already corrected — with the `.backup` file
likely swept along or left as permanent litter.

This is the second sighting of the class the 2026-08-12 sweep named in
`dispatch/docs/sessions/lessons/LESSONS_20260812_triage_sweep_guards_that_cannot_fail.md`
("An uncommitted disposition found in rotorkit's main checkout"): **every
consumer reads the working tree, so uncommitted main-checkout state is counted as
real by everything except git history.** That sweep flagged its instance in a
lesson only, and noted that nothing scans lessons. Hence a file.

## What to do

Almost certainly: `git checkout -- apps/viewer/README.md` and delete
`apps/viewer/README.md.backup`. Confirm first that no one is mid-edit, and
confirm the restored file still matches the numbers in
`data/projections/viewer/results.json` (main-checkout path) rather than
restoring a figure that has since moved again.

If `.backup` files are being produced routinely by a tool in this repo, ignore
the pattern in `.gitignore` as part of the same change — an untracked `.backup`
beside every edited doc is how this one nearly became invisible.
