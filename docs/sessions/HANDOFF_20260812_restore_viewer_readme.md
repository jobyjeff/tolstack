---
priority: med
depends_on: []
---

# HANDOFF 2026-08-12 — restore_viewer_readme: put back the 77 README lines sitting deleted (uncommitted) in the main checkout

Source: triage sweep 2026-08-12, routing
`docs/issues/ISSUE_20260812_viewer_readme_truncated_in_main_checkout.md`
(`chore`, `med`). Baseline: trunk, 2026-08-12. Scope: `apps/viewer/README.md`,
`.gitignore`. Touch nothing else — three other tolstack handoffs are staged in
parallel and none of them owns this file.

> **⚠ READ THIS BEFORE YOU TOUCH ANYTHING.** The defect is in the **main
> checkout's working tree** (`C:\workspace\tolstack`), not in git history and not
> in any worktree. If you are running in a worktree, `git status` there will look
> clean and you will conclude there is nothing to do. There isn't — in your
> worktree. Go and look at the main checkout by absolute path.

## The state to repair

In `C:\workspace\tolstack`:

```
 M apps/viewer/README.md          # 228 lines; HEAD has 305
?? apps/viewer/README.md.backup   # 305 lines, byte-identical to HEAD modulo CRLF
```

The 77 missing lines are the sections `viewer_export_and_material_provenance`
added and `358569f` corrected, both on 2026-08-12: the `EXPORT UNESTABLISHED` and
`CTE NOT TRANSCRIBED` legend rows, and the whole **"Which bytes the number was
read off"** section with its `established` / `unestablished` / no-`export` table.

## Deliverables

1. **Confirm nobody is mid-edit before restoring.** Check for an active tolstack
   worktree or session touching `apps/viewer/README.md`. If one exists, stop and
   report — do not stomp live work. At sweep time nothing was staged or active.

2. **Restore from git, not from the `.backup`.** `git checkout -- apps/viewer/README.md`
   in the main checkout. Use git rather than copying the `.backup` file: HEAD is
   the reviewed content, the `.backup` is an artifact of unknown provenance that
   merely happens to match today. Verify after: `git status --porcelain apps/viewer/README.md`
   is empty and the file is 305 lines.

3. **Re-verify the restored numbers before you call it done.** The restored text
   claims "26 of the 48 live citations have no export block — 21 workbook, 1
   assumed, and 4 `spec`". Recount against
   `C:\workspace\tolstack\data\projections\viewer\results.json` (**main-checkout
   absolute path** — gitignored, absent from your worktree). If the projection has
   moved since `358569f`, restoring the file re-asserts a stale number, which is
   this repo's named worst defect class. Fix the figure in the same change and
   say so; do not restore and walk away.

4. **Delete `apps/viewer/README.md.backup`**, and decide whether `*.backup`
   belongs in `.gitignore`. If a tool in this repo produces these routinely, an
   untracked `.backup` beside every edited doc is exactly what let this
   truncation sit unnoticed — ignore the pattern so the next one is invisible in
   `git status` for a *good* reason, or leave it un-ignored so the next one is
   loud. Argue whichever you pick; both are defensible and the wrong one is
   silently choosing.

5. **Say whether the tolstack doc-scan guards would have caught this.**
   `test_no_live_document_states_an_unguarded_hardware_entry_count` and
   `test_every_document_quoting_the_traced_ratio_quotes_the_current_number`
   scan live documents for stale numbers. They cannot fail on a number that has
   been **deleted** — a doc that says nothing states nothing false. That is a
   real gap in the same family as the repo's "a guard whose scope structurally
   excludes the failure" class. Report it; do **not** build the fix here (a
   deletion-detecting guard is a design question, and this handoff is a
   restoration).

## Definition of done

- `git status --porcelain` in the main checkout shows no `apps/viewer/README.md`
  and no `README.md.backup`.
- The restored file's citation counts are re-derived from the live projection and
  match, or were corrected.
- Full suite green in the main checkout (state that it was the main checkout —
  the `hardware_counts_doc_guard` review's N1 finding was a suite line that
  didn't say which produced it).
- Lesson (`docs/sessions/lessons/LESSONS_20260812_restore_viewer_readme.md`):
  what you could determine about how the truncation happened (which tool, which
  session) — "could not determine" is an acceptable answer and worth recording;
  the `.gitignore` decision from deliverable 4 and why; and the deletion-blind
  guard gap from deliverable 5, stated clearly enough that someone can file it as
  its own issue.
